# 🔔 Unified Notification Schema (Firebase Realtime Database)

## Overview

This document defines the unified Firebase Realtime Database schema for notifications across the CCRS system (Admin, Police, and Citizen apps).

## Current Schema (Admin → Police)
```json
{
  "notifications": {
    "{officerUid}": {
      "{notificationId}": {
        "officerUid": "string",
        "title": "string",
        "body": "string", 
        "data": {
          "reportId": "string",
          "type": "assignment",
          "timestamp": "number"
        },
        "timestamp": "serverTimestamp",
        "delivered": false,
        "seen": false
      }
    }
  }
}
```

## Extended Schema (Including Citizens)

### Database Structure
```json
{
  "notifications": {
    "{uid}": {
      // uid can be officerUid OR citizenUid
      "{notificationId}": {
        "recipientUid": "string",           // Target user ID
        "recipientType": "officer|citizen", // Recipient type  
        "title": "string",                  // Notification title
        "body": "string",                   // Notification body
        "type": "assignment|status_update|message|report_update",
        "data": {
          "reportId": "string",             // Related report ID
          "reportTitle"?: "string",         // Report title for context
          "oldStatus"?: "string",           // Previous status (for updates)
          "newStatus"?: "string",           // New status (for updates)
          "senderType"?: "admin|police",    // Who sent the notification
          "timestamp": "number"             // Client timestamp
        },
        "timestamp": "serverTimestamp",     // Firebase server timestamp
        "delivered": false,                 // Auto-marked true when received
        "seen": false,                      // User-marked when notification opened
        "priority": "low|normal|high|urgent"
      }
    }
  }
}
```

## Notification Types

### For Officers (Admin → Police)
- `assignment` - New case assigned
- `status_update` - Case status changed by admin
- `message` - Direct message from admin

### For Citizens (Admin/Police → Citizen)  
- `report_update` - Status change on submitted report
- `message` - Direct message from authorities
- `resolution` - Report marked as resolved

## Usage Examples

### Admin notifying Police Officer
```javascript
import { realtimePushService } from '../services/realtimePushService';

await realtimePushService.sendNotification({
  officerUid: "officer123",
  title: "New Assignment",
  body: "You have been assigned to Case #CR-2025-001",
  data: {
    type: "assignment",
    reportId: "CR-2025-001",
    reportTitle: "Theft reported at Main Street",
    senderType: "admin",
    timestamp: Date.now()
  },
  type: "assignment"
});
```

### Admin notifying Citizen about report status
```javascript  
import { realtimePushService } from '../services/realtimePushService';

await realtimePushService.sendCitizenNotification({
  citizenUid: "citizen456",
  title: "Report Status Update", 
  body: "Your report CR-2025-001 is now being investigated",
  data: {
    type: "report_update", 
    reportId: "CR-2025-001",
    oldStatus: "pending",
    newStatus: "responding", 
    senderType: "admin",
    timestamp: Date.now()
  }
});
```

### Police Officer notifying Citizen
```javascript
import { realtimeNotificationService } from '../services/realtimeNotificationService';

await realtimeNotificationService.sendCitizenNotification(
  "citizen456",
  "Case Update",
  "We have collected evidence for your report",
  {
    type: "report_update",
    reportId: "CR-2025-001", 
    senderType: "police",
    timestamp: Date.now()
  }
);
```

## Security Rules

```json
{
  "rules": {
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'officer')",
        ".validate": "auth != null",
        
        "$notificationId": {
          ".validate": "newData.hasChildren(['recipientUid', 'title', 'body', 'timestamp', 'delivered', 'seen'])",
          
          "recipientUid": {
            ".validate": "newData.val() === $uid"
          },
          "recipientType": {
            ".validate": "newData.isString() && (newData.val() === 'officer' || newData.val() === 'citizen')"
          },
          "title": {
            ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 100"
          },
          "body": {
            ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 500"
          },
          "type": {
            ".validate": "newData.isString() && (newData.val() === 'assignment' || newData.val() === 'status_update' || newData.val() === 'message' || newData.val() === 'report_update')"
          },
          "data": {
            ".validate": "newData.hasChildren()"
          },
          "timestamp": {
            ".validate": "newData.val() != null"
          },
          "delivered": {
            ".validate": "newData.isBoolean()"
          },
          "seen": {
            ".validate": "newData.isBoolean()"
          }
        }
      }
    }
  }
}
```

## Implementation Notes

### Firebase Free Tier Compliance ✅
- Uses Firebase Realtime Database (included in Spark plan)
- No Cloud Functions required
- Direct client-to-database writes
- Efficient real-time listeners

### Performance Considerations
- Notifications auto-clean after 30 days
- Limited to last 20 notifications per user  
- Delivered notifications marked to avoid duplicates
- Optimistic UI updates

### Cross-Platform Support
- Web (Admin): Firebase Web SDK
- React Native (Police & Citizens): Firebase React Native SDK
- Consistent API across platforms

---

**Status**: Ready for Implementation  
**Last Updated**: 2025-09-22  
**Version**: 1.0 (Unified Schema)