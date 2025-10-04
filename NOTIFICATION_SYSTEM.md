# 🚨 CCRS Notification System Documentation

## 📋 Overview

The CCRS (Centralized Crime Reporting System) uses a **Firebase Realtime Database** notification system to deliver real-time alerts between the admin dashboard and police mobile app.

## 🏗️ Architecture

```
Admin Dashboard → Firebase Realtime Database → Police Mobile App
     (Write)              (/notifications)           (Listen & Display)
```

### **Key Components:**

#### **1. Admin Dashboard (`admin/`)**
- **Service**: `src/services/realtimePushService.ts`
- **Function**: Writes notifications to `/notifications/{officerUid}` in Firebase Realtime Database
- **Triggers**: Manual notifications, assignment alerts, status updates

#### **2. Police Mobile App (`police/`)**
- **Service**: `services/realtimeNotificationService.ts`
- **Function**: Listens for real-time database changes and displays local notifications
- **Integration**: `contexts/AuthContext.tsx` initializes listeners on login

## 🔧 Technical Implementation

### **Database Structure:**
```json
{
  "notifications": {
    "{officerUid}": {
      "{notificationId}": {
        "officerUid": "string",
        "title": "string",
        "body": "string", 
        "data": { "reportId": "string", "type": "assignment", ... },
        "timestamp": "serverTimestamp",
        "delivered": false,
        "seen": false
      }
    }
  }
}
```

### **Security Rules:**
```json
{
  "rules": {
    "notifications": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

## 🚀 Features

### **✅ Current Features:**
- ✅ Real-time notification delivery
- ✅ Local notification display on device
- ✅ Assignment notifications from admin to officers
- ✅ Automatic delivery tracking
- ✅ Firebase free tier compatible
- ✅ No FCM dependency (bypasses network restrictions)

### **🔮 Available for Implementation:**
- 📱 Notification history & read status
- ⚡ Quick action responses (Accept/Decline)
- 🎯 Priority-based notifications
- 📍 Location-based alerts
- 👥 Multi-officer coordination
- 📊 Notification analytics
- 🔊 Custom sound profiles
- 📱 SMS fallback

## 📂 File Structure

```
admin/
├── src/services/realtimePushService.ts    # Send notifications
└── src/config/firebase.ts                # Firebase config (includes rtdb)

police/  
├── services/realtimeNotificationService.ts # Receive notifications
├── services/notificationService.ts        # Local notification display
├── contexts/AuthContext.tsx              # Initialize listeners
├── config/firebase.ts                    # Firebase config (includes rtdb)
└── app/_layout.tsx                       # Notification handlers

Environment Files:
├── admin/.env                            # VITE_FIREBASE_DATABASE_URL
└── police/.env                           # EXPO_PUBLIC_FIREBASE_DATABASE_URL
```

## 🛠️ Configuration

### **Environment Variables:**

#### **Admin Dashboard (.env):**
```env
VITE_FIREBASE_DATABASE_URL=https://mylogin-7b99e-default-rtdb.asia-southeast1.firebasedatabase.app
```

#### **Police App (.env):**
```env
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://mylogin-7b99e-default-rtdb.asia-southeast1.firebasedatabase.app"
```

### **Firebase Setup:**
1. Enable **Realtime Database** in Firebase Console
2. Set **Database Rules** (see above)
3. Ensure correct **region** (asia-southeast1)

## 🔄 Workflow

### **Sending Notifications (Admin):**
1. Admin clicks "Notify assigned officer"
2. `realtimePushService.sendNotification()` writes to database
3. Notification appears in `/notifications/{officerUid}` 
4. Success toast confirms delivery

### **Receiving Notifications (Police):**
1. `realtimeNotificationService.startListening()` monitors database
2. New notification triggers `onValue` callback
3. `showLocalNotification()` displays system notification
4. Notification marked as `delivered: true`
5. Officer sees notification on device

## 🐛 Troubleshooting

### **Common Issues:**

#### **Permission Denied:**
- Check Firebase Realtime Database rules
- Verify user authentication
- Ensure database URL is correct

#### **No Notifications Received:**
- Check notification permissions on device
- Verify listener is initialized on login
- Check Firebase console for database writes

#### **Region Errors:**
- Ensure database URL matches your Firebase region
- Update both admin and police app environment variables

## 📊 Benefits Over FCM

### **Why Firebase Realtime Database vs FCM:**

| Aspect | Realtime Database | FCM |
|--------|------------------|-----|
| **Network Dependencies** | ✅ Works with restricted networks | ❌ Can be blocked |
| **Free Tier** | ✅ Generous limits | ⚠️ Limited |
| **Real-time** | ✅ Instant delivery | ⚠️ Best effort |
| **Debugging** | ✅ Full visibility | ❌ Black box |
| **Reliability** | ✅ Database guarantees | ❌ Network dependent |

## 🔮 Future Enhancements

Priority roadmap for additional features:

1. **📱 Notification History** - In-app notification center
2. **⚡ Quick Actions** - Accept/decline directly from notification  
3. **🎯 Priority Alerts** - Emergency override & escalation
4. **📍 Location Integration** - Proximity-based notifications
5. **📊 Analytics Dashboard** - Response time tracking

---

**System Status**: ✅ **Production Ready**  
**Last Updated**: 2025-09-18  
**Version**: 2.0 (Realtime Database Implementation)