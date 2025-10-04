# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

The Centralized Crime Reporting System (CCRS) is a comprehensive digital platform for the Province of Pangasinan, Philippines. It consists of three applications sharing a unified Firebase backend, designed to operate within Firebase's free tier constraints.

## Architecture

```
C:\Users\nicos\september282025\                (ROOT)
├── firebase.json                             # Master Firebase config
├── firestore.rules                           # Unified security rules
├── firestore.indexes.json                    # Unified database indexes
├── database.rules.json                       # Realtime DB rules (notifications)
├── deploy-firebase-rules.ps1                 # Deployment script
├── shared-types/                             # TypeScript type definitions
├── shared-components/                        # Shared React components
│
├── admin/                                    # Web Admin Dashboard
│   ├── src/                                  # React + Vite + TypeScript
│   ├── package.json                          # Vite, React 19, Firebase 12
│   └── vite.config.ts                        # Dev proxy config
│
├── police/                                   # Mobile Police App
│   ├── app/                                  # Expo Router structure
│   ├── screens/                              # React Native screens
│   ├── services/                             # Firebase & notification services
│   ├── package.json                          # Expo ~53, React Native 0.79
│   └── app.json                              # Expo configuration
│
└── newlogin/                                 # Mobile Citizen App
    ├── app/                                  # Expo Router structure
    ├── contexts/                             # React Context providers
    ├── services/                             # Firebase & media services
    ├── package.json                          # Expo ~53, React Native 0.79
    └── app.json                              # Expo configuration
```

### Applications

1. **Admin Dashboard** (`admin/`) - Web application (React + Vite)
   - User: System administrators, supervisors
   - Features: Report management, user administration, analytics, GIS mapping
   - Technology: React 19, Vite, React Bootstrap, Leaflet.js, Recharts

2. **Police App** (`police/`) - Mobile application (React Native + Expo)
   - User: Police officers, supervisors
   - Features: Assignment inbox, case management, evidence collection, analytics
   - Technology: Expo Router, React Native, Firebase, push notifications

3. **Citizen App** (`newlogin/`) - Mobile application (React Native + Expo)
   - User: Community members, citizens
   - Features: Crime reporting, multimedia upload, report history, GPS location
   - Technology: Expo Router, React Native, Cloudinary, location services

## Common Development Commands

### Prerequisites
```bash
# Install Node.js 18+
node --version  # Should be >=18.0.0

# Install global tools
npm install -g @expo/cli firebase-tools
```

### Admin Dashboard (Web)
```bash
cd admin

# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Setup admin user (run once)
npm run setup
```

### Police App (Mobile)
```bash
cd police

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on specific platforms
npx expo run:android
npx expo run:ios
npx expo start --web

# Run ESLint
npx expo lint
```

### Citizen App (Mobile)
```bash
cd newlogin

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Run on specific platforms
npx expo run:android
npx expo run:ios
npx expo start --web

# Run ESLint
npx expo lint
```

### Firebase Deployment
```bash
# From repository root
cd C:\Users\nicos\september282025

# Deploy unified rules (recommended)
.\deploy-firebase-rules.ps1

# Manual deployment
firebase login
firebase use mylogin-7b99e
firebase deploy --only firestore,database

# Deploy admin dashboard to Firebase Hosting
firebase deploy --only hosting
```

## Development Environment Setup

### Required Tools
- **Node.js**: Version 18+ (LTS recommended)
- **npm**: Version 9+
- **Expo CLI**: `@expo/cli` (latest)
- **Firebase CLI**: `firebase-tools` (latest)
- **Git**: For version control

### Setup Steps
1. Clone the repository
2. Install global tools: `npm install -g @expo/cli firebase-tools`
3. Install dependencies in each app:
   ```bash
   cd admin && npm install
   cd ../police && npm install
   cd ../newlogin && npm install
   ```
4. Configure Firebase:
   ```bash
   firebase login
   firebase use mylogin-7b99e
   ```
5. Set up environment variables (create `.env` files based on `.env.example` if available)

### Environment Configuration
Create `.env` files with Firebase configuration:
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.asia-southeast1.firebasedatabase.app

# Cloudinary Configuration (for citizen app)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

## Firebase Free Tier Constraints

⚠️ **CRITICAL**: This project operates exclusively within Firebase's Spark (Free) Plan limitations.

### Forbidden Features (Do NOT Use)
- ❌ Cloud Functions
- ❌ Cloud Run
- ❌ Firebase Extensions
- ❌ Advanced ML APIs
- ❌ Paid hosting tiers
- ❌ Scheduled database maintenance jobs

### Allowed Features
- ✅ Firebase Authentication (with custom claims)
- ✅ Firestore Database (free quotas)
- ✅ Realtime Database (free quotas)
- ✅ Firebase Hosting (basic tier)
- ✅ Firebase Storage (free quotas)
- ✅ Firebase Analytics
- ✅ Firebase App Check
- ✅ Firebase Remote Config (free quotas)

### Alternative Approaches
- **Instead of Cloud Functions**: Use client-side logic and Firestore security rules
- **Instead of server-side processing**: Implement logic in React/React Native apps
- **Instead of scheduled jobs**: Use manual admin scripts or client-triggered operations
- **Instead of paid APIs**: Use free-tier external services (Cloudinary for media storage)

## Key File Locations

### Root Level
- `firebase.json` - Master Firebase configuration
- `firestore.rules` - Unified Firestore security rules (280+ lines)
- `firestore.indexes.json` - Database performance indexes
- `database.rules.json` - Realtime Database rules for notifications
- `deploy-firebase-rules.ps1` - PowerShell deployment script
- `PROJECT_OVERVIEW_UNIFIED.md` - Comprehensive project documentation

### Shared Resources
- `shared-types/rbac.ts` - TypeScript role-based access control definitions
- `shared-components/RoleProtection.tsx` - Unified permission enforcement component

### Application-Specific
- `admin/src/services/firebaseService.ts` - Admin Firebase operations
- `admin/src/components/charts/` - Recharts visualization components
- `admin/src/components/map/` - Leaflet GIS mapping components
- `police/services/firestoreService.ts` - Police app database operations
- `police/services/evidenceService.ts` - Evidence collection service
- `police/services/realtimeNotificationService.ts` - Push notification system
- `newlogin/services/reportService.ts` - Citizen report submission service
- `newlogin/services/mediaService.ts` - Cloudinary media upload service

## Testing & Quality Assurance

### Running Tests
```bash
# Run ESLint on all projects
cd admin && npm run lint
cd ../police && npx expo lint
cd ../newlogin && npx expo lint

# Test Firebase rules locally
firebase emulators:start --only firestore

# Test notification system (see TEST_REPORT.md)
```

### Key Testing Areas
- **Authentication**: Role-based access (citizen, officer, supervisor, admin)
- **Permissions**: Firestore security rules enforcement
- **Real-time sync**: Cross-app data synchronization
- **Notifications**: Firebase Realtime Database push system
- **Media uploads**: Cloudinary integration in citizen app
- **Offline support**: AsyncStorage and queue management

## Quick-Start Workflow

### New Developer Setup (~15-20 minutes)
1. **Prerequisites** (5 min): Install Node.js 18+, Git
2. **Clone & Install** (5 min):
   ```bash
   git clone <repository>
   cd september282025
   npm install -g @expo/cli firebase-tools
   ```
3. **App Dependencies** (5-10 min):
   ```bash
   cd admin && npm install && cd ..
   cd police && npm install && cd ..
   cd newlogin && npm install && cd ..
   ```
4. **Firebase Setup** (2 min):
   ```bash
   firebase login
   firebase use mylogin-7b99e
   ```

### Development Workflow
1. **Start Development**:
   - Admin: `cd admin && npm run dev`
   - Police: `cd police && npx expo start`
   - Citizen: `cd newlogin && npx expo start`

2. **Make Changes**: Edit code, test locally

3. **Deploy Rules** (if Firebase rules changed):
   ```bash
   .\deploy-firebase-rules.ps1
   ```

4. **Deploy Hosting** (if admin dashboard changed):
   ```bash
   cd admin && npm run build
   firebase deploy --only hosting
   ```

### Common Pitfalls
- **Port Conflicts**: Admin dev server uses port 5173, Expo uses 8081, 19000, 19001
- **Firebase Project**: Always verify `firebase use` shows `mylogin-7b99e`
- **Rules Deployment**: Deploy from repository root, not individual app directories
- **Free Tier Limits**: Monitor Firestore read/write quotas in Firebase Console
- **Environment Variables**: Ensure all required Firebase config values are set

## Security & RBAC

### Role Hierarchy
- **citizen**: Create reports, view own submissions
- **officer**: Accept assignments, update case status, collect evidence
- **supervisor**: Reassign cases, approve closures, manage officers
- **admin**: Full system access, user management, analytics

### Permission Enforcement
- **Client-side**: Shared `RoleProtection` component and custom hooks
- **Server-side**: Comprehensive Firestore security rules in `firestore.rules`
- **Real-time**: Notification system uses role-based targeting

### Authentication Flow
1. Firebase Authentication (email/password or anonymous)
2. Custom claims OR user document role lookup
3. Firestore security rules validate permissions
4. Client-side components enforce UI restrictions

## Performance Considerations

### Database Optimization
- **Indexes**: All common queries have composite indexes defined
- **Pagination**: Use `startAfter` for large result sets
- **Real-time Listeners**: Minimize simultaneous subscriptions
- **Offline Support**: AsyncStorage caching with conflict resolution

### Media Handling
- **Images/Video**: Cloudinary for optimization and CDN delivery
- **File Size Limits**: Client-side compression before upload
- **Progressive Loading**: Implement skeleton screens and lazy loading

## Troubleshooting

### Common Issues

#### Permission Denied Errors
```
Error: Missing or insufficient permissions
```
**Solution**:
- Check user role in `/users/{uid}` Firestore document
- Verify Firestore security rules are deployed
- Ensure custom claims are set correctly

#### Build/Deploy Failures
```
Error: Failed to load function definition
```
**Solution**:
- Validate `firestore.rules` syntax
- Check Firebase CLI authentication: `firebase login`
- Verify project selection: `firebase use mylogin-7b99e`

#### Expo/React Native Issues
```
Error: Unable to resolve module
```
**Solution**:
- Clear Metro cache: `npx expo start --clear`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Expo SDK compatibility

### Debug Commands
```bash
# Check Firebase project
firebase use

# View current rules
firebase firestore:rules get

# Check Firestore indexes
firebase firestore:indexes

# View Firebase logs
firebase functions:log  # (Not used in free tier)

# Expo diagnostics
npx expo doctor
```

## Related Documentation

- `PROJECT_OVERVIEW_UNIFIED.md` - Comprehensive technical documentation
- `UNIFIED_FIREBASE_RULES_GUIDE.md` - Security rules deployment guide
- `TEST_REPORT.md` - Testing procedures and results
- `NOTIFICATION_SYSTEM.md` - Real-time notification architecture
- Individual app README files (if they exist)

---

**Last Updated**: October 2025
**Firebase Project**: `mylogin-7b99e`
**Deployment Region**: `asia-southeast1`