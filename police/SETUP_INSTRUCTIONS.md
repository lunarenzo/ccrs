# Firebase Test Data Setup Instructions

## Quick Setup (Recommended)

Since you're getting permission errors, you need to set up test users and update Firestore security rules. Here's the fastest way:

### 1. Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `mylogin-7b99e`
3. Go to **Firestore Database** → **Rules**
4. Replace the current rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all authenticated users to read and write (for development/testing)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

### 2. Create Test Users Manually

Go to **Authentication** → **Users** in Firebase Console and add these users:

**Officer Account:**
- Email: `officer@ccrs.gov`
- Password: `officer123`
- UID: (auto-generated)

**Supervisor Account:**
- Email: `supervisor@ccrs.gov`  
- Password: `supervisor123`
- UID: (auto-generated)

### 3. Add User Profiles to Firestore

1. Go to **Firestore Database** → **Data**
2. Create a new collection called `users`
3. Add documents with the UIDs from step 2:

**Officer Profile:**
```json
{
  "email": "officer@ccrs.gov",
  "displayName": "Officer John Smith",
  "role": "officer",
  "unit": "Patrol Unit 1",
  "badge": "P001",
  "department": "Metro Police",
  "isActive": true,
  "createdAt": "2025-09-10T15:00:00Z"
}
```

**Supervisor Profile:**
```json
{
  "email": "supervisor@ccrs.gov",
  "displayName": "Supervisor Jane Doe", 
  "role": "supervisor",
  "unit": "Patrol Division",
  "badge": "S001",
  "department": "Metro Police",
  "isActive": true,
  "createdAt": "2025-09-10T15:00:00Z"
}
```

### 4. Create Sample Reports

Create a `reports` collection with these sample documents:

**Report 1:**
```json
{
  "title": "Noise Complaint - Downtown",
  "description": "Loud music reported at residential building. Multiple complaints from neighbors about ongoing party.",
  "category": "Noise Complaint",
  "location": {
    "address": "123 Main Street, Downtown",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "status": "assigned",
  "priority": "medium",
  "assignedTo": "[OFFICER_UID]",
  "assignmentStatus": "pending",
  "createdAt": "2025-09-10T15:00:00Z",
  "updatedAt": "2025-09-10T15:00:00Z",
  "citizenId": "citizen-001",
  "officerNotes": []
}
```

**Report 2:**
```json
{
  "title": "Suspicious Activity - Park Area",
  "description": "Individual reported acting suspiciously near playground equipment. Citizen concerned for child safety.",
  "category": "Suspicious Activity", 
  "location": {
    "address": "456 Park Avenue, Central Park",
    "coordinates": {
      "latitude": 40.7589,
      "longitude": -73.9851
    }
  },
  "status": "assigned",
  "priority": "high",
  "assignedTo": "[OFFICER_UID]",
  "assignmentStatus": "pending",
  "createdAt": "2025-09-10T15:00:00Z",
  "updatedAt": "2025-09-10T15:00:00Z",
  "citizenId": "citizen-002",
  "officerNotes": []
}
```

Replace `[OFFICER_UID]` with the actual UID of the officer user you created.

## Test the App

After completing the setup:

1. Run `npm start` in the police directory
2. Try logging in with:
   - **Officer**: `officer@ccrs.gov` / `officer123`
   - **Supervisor**: `supervisor@ccrs.gov` / `supervisor123`

The officer should see the assigned reports in their Assignment Inbox.

## Troubleshooting

- **Permission denied errors**: Make sure you published the Firestore rules
- **Invalid credential errors**: Double-check the email/password combinations
- **No reports showing**: Verify the `assignedTo` field matches the officer's UID
- **Map not loading**: The Leaflet map requires internet connection for tiles

## Production Security

The current rules allow all authenticated users full access for testing. For production, implement proper role-based security rules as shown in the commented section of `firestore.rules`.
