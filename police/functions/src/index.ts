import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Create a new Expo SDK client
const expo = new Expo();

// Cloud Function to send push notifications when a report is assigned
export const sendAssignmentNotification = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if this is a new assignment (status changed to 'assigned')
    if (before.status !== 'assigned' && after.status === 'assigned' && after.assignedTo) {
      try {
        // Get the officer's push token from Firestore
        const officerDoc = await admin.firestore()
          .collection('officers')
          .doc(after.assignedTo)
          .get();
        
        if (!officerDoc.exists) {
          console.log('Officer document not found:', after.assignedTo);
          return;
        }
        
        const officerData = officerDoc.data();
        const pushToken = officerData?.pushToken;
        
        if (!pushToken) {
          console.log('No push token found for officer:', after.assignedTo);
          return;
        }
        
        // Validate the push token
        if (!Expo.isExpoPushToken(pushToken)) {
          console.error('Invalid Expo push token:', pushToken);
          return;
        }
        
        // Create the notification message
        const message: ExpoPushMessage = {
          to: pushToken,
          sound: 'default',
          title: 'New Case Assignment',
          body: `You have been assigned a new ${after.priority} priority ${after.category} case.`,
          data: {
            type: 'assignment',
            reportId: context.params.reportId,
            priority: after.priority,
            category: after.category,
          },
          badge: 1,
        };
        
        // Send the notification
        const chunks = expo.chunkPushNotifications([message]);
        const tickets = [];
        
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            console.error('Error sending push notification chunk:', error);
          }
        }
        
        console.log('Push notification sent successfully:', tickets);
        
        // Optionally, you can store the notification in Firestore for tracking
        await admin.firestore()
          .collection('notifications')
          .add({
            officerId: after.assignedTo,
            reportId: context.params.reportId,
            type: 'assignment',
            title: message.title,
            body: message.body,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'sent',
          });
        
      } catch (error) {
        console.error('Error sending assignment notification:', error);
      }
    }
  });

// Cloud Function to send status update notifications
export const sendStatusUpdateNotification = functions.firestore
  .document('reports/{reportId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    
    // Check if status changed while assigned OR assignment was declined
    const statusChangedWhileAssigned = before.status !== after.status && after.assignedTo;
    const assignmentDeclined = before.assignmentStatus !== after.assignmentStatus && after.assignmentStatus === 'declined';

    if (statusChangedWhileAssigned || assignmentDeclined) {
      try {
        // Get supervisor tokens (for status updates to supervisors)
        // First, find supervisor user IDs from 'users' collection
        const supervisorsSnapshot = await admin.firestore()
          .collection('users')
          .where('role', '==', 'supervisor')
          .get();

        const supervisorUids = supervisorsSnapshot.docs.map(d => d.id);

        // Then, look up push tokens in the 'officers' collection by UID
        const supervisorTokens: string[] = [];
        const officerDocs = await Promise.all(
          supervisorUids.map(uid =>
            admin.firestore().collection('officers').doc(uid).get()
          )
        );

        officerDocs.forEach(docSnap => {
          const data = docSnap.data();
          const token = data?.pushToken;
          if (token && Expo.isExpoPushToken(token)) supervisorTokens.push(token);
        });
        
        if (supervisorTokens.length === 0) {
          console.log('No supervisor push tokens found');
          return;
        }
        
        // Create notification messages for supervisors
        const messages: ExpoPushMessage[] = supervisorTokens.map(token => ({
          to: token,
          sound: 'default',
          title: assignmentDeclined ? 'Assignment Declined' : 'Case Status Update',
          body: assignmentDeclined
            ? `Case ${context.params.reportId} was declined and is now unassigned`
            : `Case ${context.params.reportId} status changed to ${after.status}`,
          data: {
            type: 'status_update',
            reportId: context.params.reportId,
            newStatus: after.status,
            officerId: after.assignedTo || null,
            assignmentStatus: after.assignmentStatus || null,
          },
        }));
        
        // Send notifications to supervisors
        const chunks = expo.chunkPushNotifications(messages);
        
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error('Error sending status update notification:', error);
          }
        }
        
        console.log('Status update notifications sent to supervisors');
        
      } catch (error) {
        console.error('Error sending status update notification:', error);
      }
    }
  });

// HTTP Cloud Function for manual notification sending (for testing)
export const sendTestNotification = functions.https.onCall(async (data, context) => {
  // Verify the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { pushToken, title, body } = data;
  
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid push token');
  }
  
  try {
    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title: title || 'Test Notification',
      body: body || 'This is a test notification from the police app',
      data: { type: 'test' },
    };
    
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    return { success: true, tickets };
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
});
