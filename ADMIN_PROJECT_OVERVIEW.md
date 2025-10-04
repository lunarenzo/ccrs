# Admin App – Project Overview

This document provides a concise, technical overview of the `admin/` web app within the CCRS (Community Crime Reporting System) monorepo.

The Admin Dashboard is a React + Vite + TypeScript SPA used by administrators and supervisors to manage reports, users, and analytics. It uses Firebase (Auth + Firestore) for data and authentication, Bootstrap for UI, React Router for navigation, and Leaflet for GIS map visualization.


## Tech Stack

- React 19 + Vite 7 + TypeScript
- UI & Layout
  - Bootstrap 5, React Bootstrap components
  - Custom UI components under `src/components/`
  - Theming toggles (light/dark) via `src/hooks/useTheme.tsx`
- Routing: `react-router-dom@^7`
- Charts: `recharts`
- Maps: `leaflet`, `react-leaflet`, `react-leaflet-cluster`, custom heatmap overlay
- Icons: `phosphor-react`, `lucide-react`
- Firebase (Spark/Free Tier compliant)
  - `firebase/app`, `firebase/auth`, `firebase/firestore`
- Build/Dev: Vite, ESLint

Key packages (see `admin/package.json`):
- `react@^19`, `react-dom@^19`, `vite@^7`, `typescript@~5.8`
- `firebase@^12`, `react-router-dom@^7`, `bootstrap@^5.3`


## App Structure (high-level)

- `admin/src/`
  - `config/firebase.ts`: initializes Firebase using Vite env vars; exports `auth`, `db`
  - `contexts/AuthContext.tsx`: Admin auth state, role/status from custom claims (with Firestore fallback); login/logout; audit logging on login/logout
  - `services/`
    - `firebaseService.ts`: Firestore CRUD, report subscriptions, dashboard stats (client-side aggregation), user updates
    - `auditService.ts`: write audit entries to Firestore `audit_logs`
    - `rateLimitService.ts`: client-side rate limiting for sensitive actions
    - `rbacService.ts`: optional Cloud Functions call for setting roles/claims (see Free Tier note)
  - `pages/`
    - `Dashboard.tsx`: KPI cards, charts, recent activities
    - `Reports.tsx`: table management, status updates, deletion, GIS map view with cluster/heatmap/temporal playback
    - `Users.tsx`: list users with filters; role/status badges; role management modal (calls RBAC service)
    - `Login.tsx`: admin login UI
  - `components/`
    - `Layout.tsx`: responsive sidebar nav; role-based menu; theme switch
    - `ui/*`, `charts/*`, `reports/*`, `map/*` helper components


## Core Features

- __Authentication & RBAC__
  - Email/password login via `AuthContext`
  - Admin/Supervisor-only access enforced by custom claims when present; falls back to Firestore user document fields
  - Role-based navigation and permission checks (`useRoleCheck`, `Layout.tsx`)

- __Dashboard__ (`pages/Dashboard.tsx`)
  - Real-time KPIs (users, reports by status)
  - Category distribution chart
  - Recent activity table
  - Stats aggregated on the client from Firestore

- __Reports Management__ (`pages/Reports.tsx`)
  - Real-time list and filters (status, category, date range)
  - Status updates with optimistic UI
  - Deletion with confirmations
  - Comments (stored as array on report document)
  - GIS Map View: marker clusters, heatmap, temporal playback with time slider

- __Users Management__ (`pages/Users.tsx`)
  - List/search/filter by role and status
  - Shows verification and report counts (joined client-side)
  - Role management modal (uses RBAC service; see Free Tier note)

- __Audit Logging__ (`services/auditService.ts`)
  - Logs significant actions to `audit_logs` (status/role changes, deletions, auth events)

- __Rate Limiting__ (`services/rateLimitService.ts`)
  - Client-side protection to reduce accidental rapid operations


## Data Model (simplified)

- Report (Firestore `reports/{reportId}`) – see `src/services/firebaseService.ts`
  - `mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other'`
  - `category: string`, `description: string`
  - `location?: { latitude, longitude, address?: DetailedAddress, accuracy? }`
  - `media_urls?: string[]`
  - `status: 'pending' | 'validated' | 'responding' | 'resolved' | 'rejected'`
  - `timestamp: Timestamp`, `updatedAt: Timestamp`
  - `submission_type?: 'anonymous' | 'authenticated'`, `media_count?`, `has_location?`
  - `comments?: Array<{ id, text, author, authorId, timestamp }>`

- User (Firestore `users/{uid}`)
  - `email`, `name/fullName`, `phoneNumber`, `role`, `status`, `authMethod`, `isPhoneVerified`, `createdAt`, `updatedAt`, `lastLoginAt`, `isOnline`

- Audit Log (Firestore `audit_logs/{logId}`)
  - `adminUserId`, `adminEmail`, `action`, `targetType`, `targetId?`, `details`, `timestamp`


## Firebase Free Tier Compliance

To honor the Spark (Free) plan:
- __No Cloud Functions required for core features.__
  - All analytics/statistics are aggregated in the client (`firebaseService.getDashboardStats()`).
  - Admin actions (status updates, deletions, comments) write directly to Firestore.
  - Audit logs are written from the client to Firestore `audit_logs` (restrict read access in rules).
- __RBAC without Functions (recommended for Spark):__
  - The app includes `rbacService.ts` which calls `httpsCallable` Cloud Functions (e.g., `setUserRole`). Cloud Functions are not in Spark’s free tier. To remain compliant:
    - Disable features that call Cloud Functions in production on Spark.
    - Manage `role`/`status` fields directly in Firestore via Admin UI or Firebase Console, and gate UI using those fields (already supported via `AuthContext` fallback).
    - If you require custom claims for server-side enforcement, set them using an external script or backend (e.g., the repo’s `backend/` Express server with Admin SDK) executed outside the client runtime.
- __Security Rules__
  - See repo root `firestore.rules` for collection access and RBAC policies across apps.

Note: `admin/package.json` includes `firebase-admin` for setup scripts (e.g., `setup-admin.js`); do not bundle Admin SDK in the browser.


## Configuration & Environment

- Firebase config is loaded from Vite env variables (see `src/config/firebase.ts`):
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
- Ensure Firestore indexes support filtered/ordered queries if needed.
- The app leverages `react-router-dom` routes defined in `src/main.tsx` and `src/components/Layout.tsx`.


## Install & Run

```bash
# From repo root
cd admin

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```


## Notable Files

- `src/config/firebase.ts`: Firebase initialization
- `src/contexts/AuthContext.tsx`: Admin auth, claims + Firestore fallback, audit on login/logout
- `src/services/firebaseService.ts`: reports/users CRUD, subscriptions, client-side stats
- `src/services/auditService.ts`: audit logging to Firestore
- `src/services/rateLimitService.ts`: client-side rate limiting
- `src/services/rbacService.ts`: optional Cloud Functions for role/claims (avoid on Spark)
- `src/pages/Dashboard.tsx`: KPIs, charts, recent activities
- `src/pages/Reports.tsx`: list, filters, map (cluster/heatmap/temporal), status updates, deletion
- `src/pages/Users.tsx`: user management, role/status filtering
- `src/components/Layout.tsx`: responsive nav, role-gated items, theme


## Security & RBAC

- UI gating via `useRoleCheck` and `AuthContext` ensures only Admins/Supervisors access the app.
- For Spark: rely on Firestore user doc `role/status` to gate UI and restrict Firestore writes via rules. Custom claims may be set offline (script/backend) if needed.
- `audit_logs` read access should be restricted to admins in `firestore.rules`.


## Known Limitations / Notes

- Cloud Functions references in `rbacService.ts` should be disabled or replaced on the Spark plan.
- GIS features rely on Leaflet and clustering; ensure proper CSS (`src/styles/map.css`) and OSM tile usage policies.
- Comments are stored inline on report docs for simplicity; consider a subcollection for high-volume cases.


## Related Apps in the Monorepo

- `newlogin/`: Citizen-facing mobile app (Expo)
- `police/`: Officer/Supervisor mobile app (Expo)
- `backend/`: Express.js demo API (optional external admin operations)


---
Last updated: 2025-09-12
