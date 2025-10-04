# CCRS Police Assignment Orchestration and Crime Reporting Flow

This document describes how the three applications — `@newlogin` (Citizen App), `@admin` (Admin Dashboard), and `@police` (Police App) — cooperate to capture crime reports, triage, assign, act on, and close cases, strictly adhering to Firebase Free Tier constraints.

- No Cloud Functions, Cloud Run, or paid features are used.
- All orchestration is client-driven via Firestore reads/writes and Security Rules.
- Optional push notifications use Expo Push API directly from clients.

---

## 1) Roles and Apps

- Citizen (Reporter) — `@newlogin/`
  - Submits reports to `reports` collection.
  - Views own reports and status updates.
- Admin/Supervisor — `@admin/`
  - Triage reports, set priority, assign to officers, monitor SLAs.
  - Manage users, roles, and invites.
  - Audit changes.
- Officer/Supervisor — `@police/`
  - Receives assignments, accepts/declines, updates status during response.
  - Adds evidence and notes; supervisors can reassign and review closures.

Key reference files:
- Citizen app: `newlogin/services/reportService.ts`, `newlogin/services/firebaseService.ts`
- Admin app: `admin/src/services/firebaseService.ts`, `admin/src/services/inviteService.ts`, `admin/src/services/rbacService.ts`, `admin/src/pages/Users.tsx`
- Police app: `police/services/firestoreService.ts`, `police/screens/AssignmentInboxScreen.tsx`, `police/screens/ReportDetailScreen.tsx`, `police/contexts/AuthContext.tsx`, `police/screens/InviteActivationScreen.tsx`

---

## 2) Data Model (Firestore)

Collections (minimum viable for orchestration):

- `reports/{reportId}`
  - `user_id: string` (citizen or anonymous id)
  - `mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other'`
  - `category: string`
  - `description: string`
  - `media_urls?: string[]` (URLs, e.g., Cloudinary or Storage)
  - `location?: { address?: string; coordinates?: { latitude: number; longitude: number }; accuracy?: number }`
  - `priority: 'low' | 'medium' | 'high' | 'critical'` (admin sets; default medium)
  - `status: 'pending' | 'assigned' | 'accepted' | 'responding' | 'resolved' | 'rejected' | 'unassigned'` (see state machine)
  - `assignmentStatus?: 'pending' | 'accepted' | 'declined'`
  - `assignedTo?: string | null` (officer uid)
  - `resolutionNotes?: string` (officer)
  - `officerNotes?: Array<{ note: string; author: string; timestamp: Timestamp }>`
  - `timestamp: Timestamp` (created)
  - `updatedAt: Timestamp`
  - `submission_type: 'anonymous' | 'authenticated'`
  - `media_count?: number`
  - `has_location?: boolean`
  - `closureApproved?: boolean` (supervisor)
  - `closureReviewedAt?: Timestamp` (supervisor)
  - `closureReviewer?: string` (supervisor uid)

- `users/{uid}`
  - `email?: string`
  - `role: 'citizen' | 'officer' | 'supervisor' | 'admin'`
  - `status: 'active' | 'inactive' | 'suspended'`
  - `jurisdictionId?: string`
  - `createdAt: Timestamp`
  - `updatedAt: Timestamp`

- `invites/{inviteId}` (Admin → Officer flow)
  - `email: string`
  - `fullName?: string`
  - `jurisdictionId: string`
  - `role: 'officer'`
  - `status: 'pending' | 'accepted' | 'expired' | 'revoked'`
  - `inviteCode: string`
  - `createdBy: { uid: string; email?: string }`
  - `createdAt: Timestamp`
  - `expiresAt: Timestamp`

- `officers/{uid}`
  - `pushToken?: string`
  - `lastTokenUpdate?: Timestamp`

- `audit_logs/{logId}`
  - `adminUserId: string`
  - `adminEmail: string`
  - `action: string` (e.g., `report_status_update`, `assignment_accept`)
  - `targetType: 'report' | 'user' | 'system'`
  - `targetId?: string`
  - `details: Record<string, any>`
  - `timestamp: Timestamp`

- `jurisdictions/{id}`
  - `name: string`
  - `type?: 'precinct' | 'district' | 'city' | 'region'`

---

## 3) State Machine (Report)

Canonical status lifecycle combining existing code across apps:

1) `pending` — created by citizen (`newlogin`).
2) `assigned` + `assignmentStatus: 'pending'` — admin assigns to officer.
3) Officer action:
   - Accept → `status: 'accepted'`, `assignmentStatus: 'accepted'`.
   - Decline → `status: 'unassigned'`, `assignmentStatus: 'declined'`, `assignedTo: null` (re-queue).
4) Active response:
   - `accepted` → officer may move to `responding` when en route or on scene.
5) Resolution phase:
   - Officer marks `resolved` (with `resolutionNotes`).
   - Supervisor reviews: approve closure (`closureApproved: true`) or reject closure (back to `responding`).
6) Exceptional:
   - `rejected` — invalid or spam (admin/officer with justification); ends case.

Notes:
- Some legacy/admin code references `validated`. Treat `validated` ≈ triaged and ready to assign; we recommend using `assigned`/`unassigned` instead for consistency.
- `unassigned` indicates report in queue after a decline or awaiting assignment.

---

## 4) End-to-End Flow

1) Citizen submits report (`newlogin/services/reportService.ts`):
   - Writes `reports` with `status: 'pending'`, timestamps, optional media and location.
   - Anonymous users are tracked with a stable client-generated id (`generateAnonymousUserId()`).

2) Admin triage (`admin/src/services/firebaseService.ts`):
   - Subscribes to reports, reviews details, sets `priority` and decides next step.
   - Assigns to officer by setting `assignedTo`, `status: 'assigned'`, `assignmentStatus: 'pending'`, `updatedAt`.
   - Optionally audits via `admin/src/services/auditService.ts`.

3) Officer assignment inbox (`police/screens/AssignmentInboxScreen.tsx`):
   - Real-time subscription to `where('assignedTo', '==', officer.uid)`.
   - New items trigger local notification (`notificationService`) and appear in inbox.

4) Officer accepts/declines (`police/services/firestoreService.ts`):
   - Accept → `acceptAssignment(reportId)` sets `status: 'accepted'`, `assignmentStatus: 'accepted'`.
   - Decline → `declineAssignment(reportId, reason)` sets `status: 'unassigned'`, clears `assignedTo`.

5) Responding and evidence (`police/screens/ReportDetailScreen.tsx`):
   - Officer can move to `responding`, attach photos/videos/audio/notes.
   - Evidence stored via client-upload (e.g., Cloudinary or Firebase Storage) and linked by URLs.

6) Resolution and closure review:
   - Officer sets `resolved` with `resolutionNotes`.
   - Supervisor reviews in police app: `approveClosure(reportId)` sets `closureApproved: true`; or `rejectClosure(reportId, reason)` → back to `responding`.

7) Admin monitoring and analytics:
   - Admin and Police supervisor views compute metrics client-side (free tier) from Firestore queries.

---

## 5) Assignment Orchestration

### Manual Assignment (Baseline)
- Performed by Admin/Supervisor in Admin UI.
- Sets fields:
  - `assignedTo = <officerUid>`
  - `status = 'assigned'`
  - `assignmentStatus = 'pending'`
  - `updatedAt = Timestamp.now()`
- Officer inbox receives it in real-time.

### Auto-Assignment (Client-Driven, Free Tier)
- Implemented in Admin UI as an "Auto-assign" action (no backend cron/functions).
- Algorithm (within the same `jurisdictionId`):
  1. Query `users` where `role == 'officer'` and `status == 'active'`.
  2. For each officer, query open workload count: `reports` where `assignedTo == uid` AND `status IN ['assigned','accepted','responding']`.
  3. Pick the officer with the lowest open count; tie-break by `resolvedCount` or last assigned timestamp (kept client-side in local storage or `officers/{uid}` doc).
  4. Update report as in Manual Assignment.
- No Cloud Functions. All logic runs in the Admin browser session when the action is clicked.

### Decline/Reassign Handling
- Decline moves report to `unassigned` and clears `assignedTo`.
- Admin can re-run auto-assign or manually pick another officer.
- Optionally track `declineReason` and increment `declineCount` per officer (stored in `officers/{uid}`) for staffing insights.

### SLA and Escalation (Without Scheduled Jobs)
- SLA examples: Accept within 15 minutes; Respond within 30 minutes.
- Implement as client-driven checks:
  - Admin Dashboard displays filters: "Unaccepted > 15m", "No response > 30m" based on `timestamp`/`updatedAt` deltas.
  - Highlight overdue cases; Admin manually escalates/reassigns.
- Optional: A lightweight browser-based timer in Admin UI periodically refreshes lists; no server timers required.

### Notifications (Free Tier Friendly)
- Local notifications already used in `@police` when new assigned items appear.
- Optional push via Expo Push API directly from clients:
  - Store officer `pushToken` in `officers/{uid}` (`notificationService.storePushToken`).
  - From Admin UI, call `fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', body: JSON.stringify({ to: token, title, body, data }) })` to notify on assignment.
  - This avoids servers and remains within free tier. Ensure Admin-only UI action.

---

## 6) Security and Firestore Rules (High-Level)

Enforce with Firestore Security Rules (examples are conceptual):

- Citizens
  - Can `create` in `reports`.
  - Can `read` own reports by `where user_id == request.auth.uid` or anonymous id stored client-side.
  - Cannot update `assignedTo`, `status` beyond initial `pending`.

- Admin/Supervisor
  - Can update any report fields for triage and assignment (`assignedTo`, `status: 'assigned'|'rejected'`).
  - Can update user roles/status in `users`.

- Officer
  - Can `read` reports where `assignedTo == request.auth.uid`.
  - Can update own assigned report status transitions: `assigned → accepted → responding → resolved` and add evidence/notes.
  - Cannot assign to others or change `assignedTo`, except via supervisor workflows.

- Supervisor
  - Same as Officer plus can reassign (`assignedTo`), approve/reject closure.

- App Check
  - Enable Firebase App Check on all apps to mitigate abuse.

- Rate limiting
  - Client-side rate limits for sensitive operations; Firestore rules to minimize broad reads (e.g., query-based reads only).

---

## 7) Admin ↔ Officer Onboarding via Invites

- Admin creates invite (`admin/src/services/inviteService.ts` → `invites` collection).
- Officer logs into `@police` and verifies code (`police/screens/InviteActivationScreen.tsx`).
- After verification, Admin grants role via `rbacService.setUserRole()` to `officer` (or `supervisor`) and `status: 'active'`.
- Officer push token is registered via `notificationService.registerForPushNotifications()` and stored at `officers/{uid}`.

---

## 8) Implementation Tasks & Ownership

- Admin Dashboard (`@admin`)
  - Add Triage & Assignment UI (list pending/unassigned, set priority, manual assign, auto-assign).
  - Overdue filters (15m accept, 30m respond) and visual cues.
  - Optional "Notify Officer" button (Expo Push API call).
  - Ensure audit logging on status/assignment changes.

- Police App (`@police`)
  - Ensure inbox is robust to real-time updates and caching (already implemented in `AssignmentInboxScreen`).
  - Evidence capture flows (photo/video/audio/notes) — already present in `ReportDetailScreen` hooks.
  - Supervisor controls: reassign, closure approve/reject — already wired in `firestoreService`.

- Citizen App (`@newlogin`)
  - Submission UX: category/priority hints, media, location.
  - History tab subscribes to user’s reports and shows statuses.

- Firestore Security Rules
  - Lock down transitions and field-level writes by role.
  - Test anonymous user reads limited to own docs.

---

## 9) Status Mapping (Backward Compatibility)

- If older Admin UI uses `validated`, treat it as post-triage. Migration approach:
  - When an Admin clicks Assign on a `validated` report, write the fields as described (set `assignedTo`, `status: 'assigned'`, `assignmentStatus: 'pending'`).
  - Over time, phase out `validated` in favor of the unified lifecycle.

---

## 10) Notes on Optional Express Backend

A demo Express backend with `/api/auth`, `/api/users`, `/api/reports` exists (mock/in-memory). Current apps integrate directly with Firestore for real-time behavior and free-tier constraints. The backend can be used later for enterprise policies or protected server-to-server operations, but it is not required for orchestration described here.

---

## 11) References to Current Code

- Citizen submission and queries:
  - `newlogin/services/reportService.ts`
  - `newlogin/services/firebaseService.ts`
- Admin triage, users & invites, audits:
  - `admin/src/services/firebaseService.ts`
  - `admin/src/services/inviteService.ts`
  - `admin/src/services/rbacService.ts`
  - `admin/src/services/auditService.ts`
  - `admin/src/pages/Users.tsx`
- Police inbox, details, service orchestration:
  - `police/screens/AssignmentInboxScreen.tsx`
  - `police/screens/ReportDetailScreen.tsx`
  - `police/services/firestoreService.ts`
  - `police/services/notificationService.ts`
  - `police/contexts/AuthContext.tsx`
  - `police/screens/InviteActivationScreen.tsx`

---

## 12) Future Enhancements (Still Free Tier)

- Add `reports/{id}/activity` subcollection for event history to simplify timelines.
- Store minimal `officers/{uid}` operational metadata (lastAssignedAt, declineCount, openCount snapshot) to improve auto-assignment fairness.
- Supervisor dashboard in Admin app aggregating officer workloads client-side.
- Export CSV summaries directly from Admin UI (client-generated) for monthly reports.
