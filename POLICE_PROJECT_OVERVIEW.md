# Police App – Project Overview

This document provides a concise, technical overview of the `police/` mobile app in the CCRS (Community Crime Reporting System) monorepo.

The app is built with Expo (React Native) for officers and supervisors to manage case assignments, update case status, and attach evidence. It uses Firebase (Firestore/Auth) and Cloudinary for media storage.


## Tech Stack

- React Native + Expo
  - Expo Router for navigation (`police/app/`), example: `police/app/analytics.tsx`
  - UI: React Native core components, `react-native-safe-area-context`
  - Media: `expo-image-picker`, `expo-video`, `expo-audio`
  - Notifications: `expo-notifications`
- Firebase (Spark/Free Tier compliant)
  - Firebase Auth for officer/supervisor sign-in
  - Firestore for reports, evidence metadata, audit logs
- Cloudinary (free tier) for media file uploads (photos, videos, audio)
- Mapping: Leaflet (via a custom `LeafletMap` component)

Key versions (see `police/package.json`):
- expo `~53.x`, react `19.x`, react-native `0.79.x`
- firebase `^12.x`
- expo-router `~5.x`


## App Structure (high-level)

- `police/app/`
  - Route entry for Expo Router, e.g. `analytics.tsx` renders `screens/OfficerAnalyticsScreen`
- `police/screens/`
  - `AssignmentInboxScreen.tsx`: lists assigned reports with real-time updates and caching
  - `ReportDetailScreen.tsx`: case details, evidence gallery, status updates, supervisor actions
- `police/contexts/`
  - `AuthContext.tsx`: auth state, officer profile from custom claims, push notification bootstrap
- `police/services/`
  - `firestoreService.ts`: report CRUD/status, assignments, officers list, officer metrics (client-side aggregation), realtime listeners
  - `evidenceService.ts`: Cloudinary upload (photo/video/audio) + Firestore evidence metadata
  - `notificationService.ts`: push/local notifications via `expo-notifications`
  - `notificationBus.ts`: in-app event bus for notification-based navigation
  - `authService.ts`: Firebase Auth helpers
  - `cacheService.ts`: AsyncStorage-based TTL cache
  - `auditService.ts`: client-side audit logging to Firestore `audit_logs`
- `police/components/`
  - `LeafletMap` (used in `ReportDetailScreen`)


## Key Features

- Assignment Inbox
  - Query + subscribe to officer’s assigned reports (`firestoreService.subscribeToAssignedReports()`)
  - Local notification on new assignment (`notificationService.sendLocalNotification()`)
  - Offline-friendly warm start with TTL cache via `cacheService` (1–2 min TTLs)
- Case Detail & Actions (`screens/ReportDetailScreen.tsx`)
  - Case info, location with `LeafletMap`, officer notes, resolution notes
  - Evidence collection: capture or pick photos/videos; record/upload audio
  - Status flow: accept/decline assignment, mark responding, resolve/reject
  - Supervisor-only actions: reassign case, approve/reject closure
- Officer Analytics (`firestoreService.getOfficerMetrics()`)
  - Client-side aggregation (counts, average resolution hours, 7-day trend) to stay within Firebase Free Tier
- Notifications
  - Push registration with project ID discovery (`notificationService.registerForPushNotifications()`)
  - Android channels: `default`, `assignment`, `status`
  - In-app routing via `notificationBus`
- Audit Logging
  - Client-side audit entries to `audit_logs` with `serverTimestamp()`
- RBAC (Role-Based Access Control)
  - Officer/supervisor role resolved from Firebase custom claims in `AuthContext`
  - Supervisor UI gates via `useRoleCheck()` and conditional rendering


## Data Model (simplified)

- Report (Firestore `reports/{reportId}`) – see `police/services/firestoreService.ts`
  - Fields: `title`, `description`, `category`, `location { address, coordinates { latitude, longitude } }`
  - Workflow: `status` in `['unassigned','assigned','accepted','responding','resolved','rejected']`
  - `priority` in `['low','medium','high','critical']`
  - Assignment: `assignedTo` (officer UID), `assignmentStatus` in `['pending','accepted','declined']`
  - Timestamps: `createdAt`, `updatedAt`
  - Notes: `officerNotes[]`, `resolutionNotes`
  - Supervisor review extras: `closureApproved`, `closureReviewedAt`, `closureReviewer`, `closureRejectionReason`

- Evidence (Firestore subcollection `reports/{reportId}/report_evidence/{evidenceId}`) – see `police/services/evidenceService.ts`
  - `type`: `photo | video | audio`
  - `url`: Cloudinary URL; `publicId`: Cloudinary public id
  - `authorUid`, `createdAt`

- Audit Log (`audit_logs/{logId}`)
  - `action`, optional `reportId`/`targetPath`, `actorUid`, `details`, `createdAt`

- Officer Push Tokens
  - Retrieved via `firestoreService.getOfficerPushToken(uid)` from `officers/{uid}.pushToken`
  - Storage helper is invoked from `notificationService.storePushToken(uid, token)` (ensure a matching Firestore write helper exists if missing)


## Firebase Free Tier Compliance

To honor the Spark (Free) plan:
- No Cloud Functions, Cloud Run, or paid extensions are required by this app.
- All aggregations for analytics are performed on the client (`firestoreService.getOfficerMetrics()`), avoiding server-side compute.
- Audit logging is written directly from client to Firestore `audit_logs` (rules restrict read access appropriately).
- Evidence binary files are uploaded to Cloudinary (external to Firebase Storage), while only metadata is stored in Firestore.
- Firestore Security Rules are defined at repo root: `firestore.rules`.

Note: The repository contains other folders (e.g., `firebase-functions/`) but the `police/` app itself operates without server-side Firebase features.


## Configuration & Permissions

- App config: `police/app.json`
  - Android package, Google services file path, splash screen, plugins for media/notifications
  - Permissions strings for camera, photos, microphone
- Notifications
  - Requires a valid Expo project ID
  - Project ID is auto-resolved from EAS/Expo config (`Constants`), or set `EXPO_PUBLIC_EAS_PROJECT_ID`
- Firestore Rules
  - See repo root `firestore.rules` for RBAC constraints and collection access patterns


## Environment Variables (.env example)

```bash
# Cloudinary (required for evidence upload)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

# Optional: override if auto-detection fails
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
```

- Ensure the upload preset is unsigned or appropriately configured for client uploads.


## Install & Run

```bash
# From repo root
cd police

# Install dependencies
npm install

# Start app (choose platform)
npx expo start
npx expo run:android
npx expo run:ios
```

If Android push notifications are tested, use a physical device. Android notification channels are configured by `notificationService.configureNotificationChannels()`.


## Notable Files

- `police/package.json`: scripts and dependencies
- `police/app.json`: Expo configuration and plugins
- `police/screens/AssignmentInboxScreen.tsx`: assignments list + realtime + cache
- `police/screens/ReportDetailScreen.tsx`: case details, evidence, status, supervisor controls
- `police/contexts/AuthContext.tsx`: auth, custom claims, push token bootstrap
- `police/services/firestoreService.ts`: reports, officers, analytics, realtime
- `police/services/evidenceService.ts`: Cloudinary uploads + Firestore evidence docs
- `police/services/notificationService.ts`: push/local notifications
- `firestore.rules` (repo root): Firestore security rules


## Caching & Performance

- AsyncStorage-based TTL cache via `cacheService` warms UI instantly and reduces Firestore reads
- Optimistic updates for status/assignment actions in `ReportDetailScreen`
- Evidence uploads use `retryAsync` with backoff for better resilience


## Security & RBAC

- User roles (`officer`, `supervisor`) and status are resolved from Firebase custom claims in `AuthContext`
- Firestore Rules (repo root `firestore.rules`) enforce role-based access
- Supervisor-only UI sections in `ReportDetailScreen` are gated via `useRoleCheck()`


## Known Limitations / Notes

- `react-leaflet` is web-focused; the `LeafletMap` component may rely on web rendering or platform-specific workarounds
- Ensure a Firestore write helper exists for storing push tokens (called from `notificationService.storePushToken`) to persist tokens at `officers/{uid}.pushToken`
- Evidence uploads rely on Cloudinary free tier quotas


## Related Apps in the Monorepo

- `newlogin/`: React Native citizen-facing app
- `admin/`: React admin dashboard
- `backend/`: Express.js demo API (for non-Firebase flows)


---
Last updated: 2025-09-12
