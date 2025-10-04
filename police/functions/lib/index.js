"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestNotification = exports.sendStatusUpdateNotification = exports.sendAssignmentNotification = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const expo_server_sdk_1 = require("expo-server-sdk");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Create a new Expo SDK client
const expo = new expo_server_sdk_1.Expo();
// Cloud Function to send push notifications when a report is assigned
exports.sendAssignmentNotification = functions.firestore
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
            if (!expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
                console.error('Invalid Expo push token:', pushToken);
                return;
            }
            // Create the notification message
            const message = {
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
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Error sending assignment notification:', error);
        }
    }
});
// Cloud Function to send status update notifications
exports.sendStatusUpdateNotification = functions.firestore
    .document('reports/{reportId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Check if status changed and there's an assigned officer
    if (before.status !== after.status && after.assignedTo) {
        try {
            // Get supervisor tokens (for status updates to supervisors)
            const supervisorsQuery = await admin.firestore()
                .collection('officers')
                .where('role', '==', 'supervisor')
                .get();
            const supervisorTokens = [];
            supervisorsQuery.forEach(doc => {
                const data = doc.data();
                if (data.pushToken && expo_server_sdk_1.Expo.isExpoPushToken(data.pushToken)) {
                    supervisorTokens.push(data.pushToken);
                }
            });
            if (supervisorTokens.length === 0) {
                console.log('No supervisor push tokens found');
                return;
            }
            // Create notification messages for supervisors
            const messages = supervisorTokens.map(token => ({
                to: token,
                sound: 'default',
                title: 'Case Status Update',
                body: `Case ${context.params.reportId} status changed to ${after.status}`,
                data: {
                    type: 'status_update',
                    reportId: context.params.reportId,
                    newStatus: after.status,
                    officerId: after.assignedTo,
                },
            }));
            // Send notifications to supervisors
            const chunks = expo.chunkPushNotifications(messages);
            for (const chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                }
                catch (error) {
                    console.error('Error sending status update notification:', error);
                }
            }
            console.log('Status update notifications sent to supervisors');
        }
        catch (error) {
            console.error('Error sending status update notification:', error);
        }
    }
});
// HTTP Cloud Function for manual notification sending (for testing)
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
    // Verify the user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { pushToken, title, body } = data;
    if (!pushToken || !expo_server_sdk_1.Expo.isExpoPushToken(pushToken)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid push token');
    }
    try {
        const message = {
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
    }
    catch (error) {
        console.error('Error sending test notification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
    }
});
//# sourceMappingURL=index.js.map