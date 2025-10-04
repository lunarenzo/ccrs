# Citizen App (newlogin) – Project Overview

This document provides a concise, technical overview of the `newlogin/` mobile app within the CCRS (Community Crime Reporting System) monorepo.

The app is built with Expo (React Native) for citizens to authenticate, submit incident reports with location and media, and view report history and details. It uses Firebase (Firestore/Auth) and Cloudinary for media storage. Navigation is powered by Expo Router.


## Tech Stack

- React Native + Expo
  - Expo Router for file-based routing (`newlogin/app/`)
  - UI: custom components under `components/ui/`, theming via `contexts/ThemeContext.tsx`
  - Media: `expo-image-picker`, `expo-video`
  - Location: `expo-location`
  - State/UX: `contexts/AuthContext.tsx`, `contexts/AlertContext.tsx`
- Firebase (Spark/Free Tier compliant)
  - Firebase Auth for email/password and anonymous sign-in
  - Firestore for reports and users
- Cloudinary (free tier) for media file uploads (photos/videos)
- Validation: `zod`

Key versions (see `newlogin/package.json`):
- expo `~53.x`, react `19.x`, react-native `0.79.x`
- firebase `^12.x`
- expo-router `~5.x`
- cloudinary `^2.7.x`, zod `^4.1.x`


## App Structure (high-level)

- `newlogin/app/`
  - Core routes: `_layout.tsx`, `index.tsx`
  - Tabs: `(tabs)/index.tsx`, `(tabs)/history.tsx`, `(tabs)/profile.tsx`
  - Auth: `auth/login.tsx`, `auth/register.tsx`, `auth/verify-otp.tsx`
  - Report detail: `report-detail.tsx`
- `newlogin/contexts/`
  - `AuthContext.tsx`: authentication flows (email/password, anonymous), RBAC claims, Firestore user bootstrap
  - `AlertContext.tsx`: global alert system via `components/ui/GlobalAlert`
  - `ThemeContext.tsx`: light/dark/system theming
- `newlogin/services/`
  - `firebaseService.ts`: generic Firestore CRUD for reports/users, real-time subscriptions, client-side report stats
  - `reportService.ts`: citizen-facing report submission, retrieval (auth or anonymous)
  - `locationService.ts`: capture current GPS + reverse geocode to a `DetailedAddress`
  - `mediaService.ts`: Cloudinary upload for images/videos with size/duration checks
- `newlogin/config/`
  - `firebase` config used by services and contexts
  - `cloudinary` config used by `mediaService`
- `newlogin/types` and `newlogin/utils` support domain models and validation


## Key Features

- __Authentication__
  - Email/password sign up (`contexts/AuthContext.tsx > signUp()` creates `users/{uid}` Firestore doc)
  - Email/password sign in (`signIn()`)
  - Anonymous sign in (`signInAnonymous()` stores `anonymousUserId` in `AsyncStorage`)
  - Phone OTP flow placeholders: `sendOtp()` currently throws a not-implemented error (Expo setup required)

- __Report Submission__ (`services/reportService.ts`)
  - Validates required fields, supports optional location and media URLs
  - Writes to Firestore `reports` with fields: `user_id`, `mainCategory`, `category`, `description`, `media_urls[]`, `location`, `status: 'pending'`, `timestamp`, `updatedAt`, plus metadata like `submission_type`, `media_count`, `has_location`
  - Supports authenticated and anonymous users

- __Media Uploads__ (`services/mediaService.ts`)
  - Requests camera/media library permissions
  - Picks or captures images/videos
  - Validates size/duration (configurable via `CLOUDINARY_CONFIG`)
  - Uploads to Cloudinary and returns `{ url, publicId, type, size }`

- __Location Capture__ (`services/locationService.ts`)
  - Requests foreground permissions and checks device services
  - Gets `latitude/longitude` and resolves a `DetailedAddress` via reverse geocoding
  - Provides helpers for formatting display and accuracy

- __Report History & Detail__
  - History tab shows user’s submitted reports (authenticated or anonymous)
  - `app/report-detail.tsx` displays report status, category, description, location, media carousel, and timeline

- __Real-time Updates__
  - Subscriptions for live report lists via `firebaseService.subscribeToReports()` and `reportService.subscribeToUserReports()`

- __Global Alerts & Theming__
  - `AlertContext` exposes helpers for success/error/warning/info and confirmations
  - `ThemeContext` supports light/dark/system


## Data Model (simplified)

- Report (Firestore `reports/{reportId}`) – via `reportService.ts`
  - `user_id: string`
  - `mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other'`
  - `category: string` (sub-category)
  - `description: string`
  - `media_urls: string[]` (Cloudinary URLs)
  - `location: { latitude, longitude, address?: DetailedAddress, accuracy? } | null`
  - `status: 'pending' | ...` (citizen-side initializes to `pending`)
  - `timestamp: Timestamp`
  - `updatedAt: Timestamp`
  - Metadata: `submission_type`, `media_count`, `has_location`

- User (Firestore `users/{uid}`) – via `AuthContext.tsx > signUp()`
  - `id, email, name, phoneNumber, role: 'citizen', status: 'active', authMethod: 'email'|'phone', isPhoneVerified: boolean, createdAt, updatedAt`


## Firebase Free Tier Compliance

- __No Cloud Functions or paid features in-app__: All business logic (validation, aggregation) is client-side.
- __Client-side analytics__: `firebaseService.getReportStats()` computes totals and category counts on-device to avoid server compute.
- __Media storage offloaded__: Cloudinary handles binary uploads; Firestore stores metadata/URLs only.
- __Anonymous reporting__: Supported fully via Firebase Auth and local `anonymousUserId` fallback.
- __Security Rules__: The repository’s `firestore.rules` governs access and RBAC. Ensure the citizen-write paths match those rules (e.g., `user_id` alignment and allowed fields in `pending` state).

Note: `newlogin/firebase.json` includes a `functions` section for the repo, but the `newlogin` app itself operates without invoking Cloud Functions—maintaining Spark (Free) tier alignment.


## Configuration & Permissions

- App config: `newlogin/app.json`
  - Android permissions include `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION`
  - Splash screen, icons, Expo Router plugin
- Location permissions are requested at runtime in `locationService.ts`


## Environment Variables (.env example)

```bash
# Cloudinary (required for media upload)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset

# Optional: cap upload sizes/durations (if exposed via code)
# EXPO_PUBLIC_CLOUDINARY_MAX_IMAGE_SIZE=5242880
# EXPO_PUBLIC_CLOUDINARY_MAX_VIDEO_SIZE=104857600
# EXPO_PUBLIC_CLOUDINARY_MAX_VIDEO_DURATION=60
```

- Ensure the upload preset is unsigned or appropriately configured for client uploads.
- Configure `config/cloudinary.ts` to read these values and provide `CLOUDINARY_CONFIG` and `getUploadUrl()`.


## Install & Run

```bash
# From repo root
cd newlogin

# Install dependencies
npm install

# Start app (choose platform)
npx expo start
# or
npm run android
npm run ios
```

Test on a physical device for camera/gallery access. Location features require device services enabled.


## Notable Files

- `newlogin/package.json`: scripts and dependencies
- `newlogin/app.json`: Expo configuration and permissions
- `newlogin/contexts/AuthContext.tsx`: auth flows, RBAC claims, Firestore user bootstrap
- `newlogin/contexts/AlertContext.tsx`: global alert system
- `newlogin/contexts/ThemeContext.tsx`: theming
- `newlogin/services/reportService.ts`: submit/fetch reports (auth/anonymous), subscriptions
- `newlogin/services/firebaseService.ts`: generic Firestore operations and client-side stats
- `newlogin/services/mediaService.ts`: Cloudinary upload pipeline
- `newlogin/services/locationService.ts`: permissions, GPS, reverse geocoding
- `newlogin/app/report-detail.tsx`: report details screen


## Caching & Performance

- Anonymous user ID is stored in `AsyncStorage` for consistent retrieval of anonymous reports.
- Real-time listeners used for up-to-date lists; consider pruning or TTL caching if read quotas become a concern.
- Media uploads use XHR with progress callbacks; validate sizes before upload to reduce failures.


## Security & RBAC

- Users default to `role: citizen` with `status: active` on sign-up. RBAC claims (role/status) read from Firebase custom claims when available.
- Follow `firestore.rules` at the repository root for collection-level permissions and allowed field updates.
- Avoid storing sensitive data in report descriptions. Media URLs are public Cloudinary links unless restricted via Cloudinary settings.


## Known Limitations / Notes

- Phone OTP verification is not implemented in the current Expo/Firebase setup and will throw a not-implemented error.
- Cloudinary deletion requires server-side API/signing; `mediaService.deleteFromCloudinary()` is a no-op placeholder.
- Ensure Firestore index definitions exist for the ordered/filtered queries if needed (`firebase.json` references `firestore.indexes.json`).


## Related Apps in the Monorepo

- `police/`: Officer/Supervisor app
- `admin/`: Admin dashboard
- `backend/`: Express.js demo API (optional integration outside Firebase flows)


---
Last updated: 2025-09-12
