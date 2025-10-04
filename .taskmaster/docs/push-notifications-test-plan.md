# Admin → Officer Push Notifications: Manual Test Plan (Free Tier)

This plan verifies the client-only push notification flow across Admin (web) and Police (Expo) apps without Cloud Functions.

## Prerequisites
- Police app installed on a physical device (Expo Go or standalone build).
- Police officer account with role=officer and status=active.
- Expo EAS project ID available at runtime (EAS/ExpoConfig in app). Police app already attempts multiple sources.
- Admin app configured and logged in as an admin user.

## Steps
1. Officer device: sign in to Police app
   - Expectation: App requests notification permission, obtains `ExponentPushToken[...]`, and writes to `officers/{uid}` with `pushToken` and `lastTokenUpdate`.
   - Verify in Firestore: Document exists and `pushToken` has the correct format.

2. Admin app: assign a report to the officer
   - Use Assign in Reports table or Auto-Assign for a pending report.
   - Verify report shows assigned with `assignmentStatus=pending`.

3. Admin app: send a manual notification
   - In Reports table row menu: Actions → Notifications → Notify Assigned Officer.
   - Modal pre-fills a safe message; optionally edit title/body.
   - Click Send.

4. Officer device: receive push
   - Expectation: Device receives a notification with given title/body.
   - If app is foregrounded, it should still show alert (per `notificationService` handler) or a local alert.

5. Error paths
   - Missing token: If officer never registered, Admin modal shows an error.
   - Stale token: If Expo returns `DeviceNotRegistered`, Admin sees an error; re-open Police app to refresh token.
   - CORS/network: If the browser blocks the Expo API call, retry later or use a different network. (Serverless constraint retained; we do not use Cloud Functions.)

## Edge Cases
- Unassigned report → Notify is disabled.
- Officer logs out → optional: implement `clearPushToken` on logout to null the token (police `firestoreService.clearPushToken`).
- Token format validation enforced by Firestore rules; malformed tokens blocked.

## Cleanup
- Optional: Clear notification badge in Police app via `notificationService.clearBadge()`.
- Revoke and re-request permissions on the device if prompts were dismissed.

## Notes
- This implementation adheres to Firebase Free Tier. All logic runs on the client; Firestore rules validate token format and limit writable fields. No Cloud Functions or paid features are used.
