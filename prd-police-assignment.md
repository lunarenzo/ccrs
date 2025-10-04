# PRD: CCRS Police Assignment Orchestration and Crime Reporting

Version: 1.0  
Date: 2025-09-13  
Owners: Admin/Police/Newlogin app leads  
Status: Draft

---

## 1. Overview
This PRD defines the requirements for end-to-end crime reporting, triage, assignment, officer response, and closure review across three applications:

- `@newlogin` (Citizen App) — report submission and tracking
- `@admin` (Admin Dashboard) — triage, manual/auto assignment, monitoring, audits
- `@police` (Police App) — assignment inbox, accept/decline, responding, evidence, closure

The orchestration strictly adheres to Firebase Free Tier (Spark Plan):
- No Cloud Functions, Cloud Run, or paid features
- Client-driven orchestration via Firestore reads/writes and Security Rules
- Optional push notifications via Expo Push API directly from clients

Out of scope: backend schedulers/cron, server-to-server processing, paid Firebase features.

---

## 2. Goals and Non-Goals

- Goals
  - Provide reliable, real-time assignment orchestration without server code
  - Support manual and fair auto-assignment within a jurisdiction
  - Enable full officer lifecycle: accept/decline → responding → resolved → supervisor review
  - Maintain security with role-based Firestore rules and App Check
  - Deliver actionable oversight: SLA filters and workload analytics in Admin/Police

- Non-Goals
  - Automated background escalation jobs or cron-like processing
  - Advanced ML triage or paid extensions
  - Enterprise-grade backend integrations beyond current mock Express demo

---

## 3. Personas

- Citizen (Reporter): submits reports (anonymous or authenticated), tracks status
- Admin: triages, assigns, monitors SLAs, manages users/roles, audits
- Supervisor: same as Admin for assignment controls within police org; closure approvals
- Officer: receives assignments, accepts/declines, updates statuses, attaches evidence

---

## 4. User Stories (with Acceptance Criteria)

- Citizen
  - US-C1: As a citizen, I can submit a report with optional media and location.
    - AC: Report stored in `reports` with `status: 'pending'`, timestamps, and data fields.
  - US-C2: As a citizen, I can see the status of my submitted reports.
    - AC: History screen lists only my reports (auth uid or anonymous id) with real-time updates.

- Admin/Supervisor
  - US-A1: As an admin, I can set priority and assign a report to an officer.
    - AC: Setting `assignedTo`, `status: 'assigned'`, `assignmentStatus: 'pending'` updates instantly; appears in officer inbox.
  - US-A2: As an admin, I can auto-assign a set of unassigned or pending reports fairly.
    - AC: Auto-assign selects an active officer in same jurisdiction with lowest open workload; ties broken consistently.
  - US-A3: As an admin, I can identify overdue accept/respond SLAs.
    - AC: Filters show reports exceeding 15m to accept or 30m to respond based on timestamp deltas.
  - US-A4: As an admin, I can notify an officer about a new assignment.
    - AC: Clicking "Notify Officer" sends push via Expo Push API when officer token is available.
  - US-A5: As an admin, I can audit significant changes.
    - AC: Status/assignment changes create `audit_logs` entries with actor and details.

- Officer/Supervisor
  - US-O1: As an officer, I can accept or decline assigned reports.
    - AC: Accept sets `status: 'accepted'` and `assignmentStatus: 'accepted'`; decline sets `status: 'unassigned'` and clears `assignedTo`.
  - US-O2: As an officer, I can transition to `responding` and attach evidence (photos/videos/audio/notes).
    - AC: Evidence URLs are attached to the report; UI shows transition history.
  - US-O3: As an officer, I can mark a report `resolved` with notes.
    - AC: Resolve action requires `resolutionNotes` and sets timestamps.
  - US-S1: As a supervisor, I can approve or reject closure.
    - AC: Approve sets `closureApproved: true`; reject returns to `responding` with reason.

---

## 5. System Architecture (Free Tier)

- Client-only orchestration
  - Firestore as the system of record for reports, users, invites, audit logs
  - All business logic in clients: Admin/Police/Newlogin
  - Optional mock Express backend exists but is not required for orchestration
- Notifications
  - Local notifications in Police app for new assignments
  - Optional push via Expo Push API from Admin or Police clients
- Security
  - Firebase Auth + Firestore Security Rules + Firebase App Check

---

## 6. Data Model (Firestore)

- `reports/{reportId}`
  - `user_id: string`
  - `mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other'`
  - `category: string`
  - `description: string`
  - `media_urls?: string[]`
  - `location?: { address?: string; coordinates?: { latitude: number; longitude: number }; accuracy?: number }`
  - `priority: 'low' | 'medium' | 'high' | 'critical'`
  - `status: 'pending' | 'assigned' | 'accepted' | 'responding' | 'resolved' | 'rejected' | 'unassigned'`
  - `assignmentStatus?: 'pending' | 'accepted' | 'declined'`
  - `assignedTo?: string | null`
  - `resolutionNotes?: string`
  - `officerNotes?: Array<{ note: string; author: string; timestamp: Timestamp }>`
  - `timestamp: Timestamp`
  - `updatedAt: Timestamp`
  - `submission_type: 'anonymous' | 'authenticated'`
  - `media_count?: number`
  - `has_location?: boolean`
  - `closureApproved?: boolean`
  - `closureReviewedAt?: Timestamp`
  - `closureReviewer?: string`

- `users/{uid}`
  - `email?: string`
  - `role: 'citizen' | 'officer' | 'supervisor' | 'admin'`
  - `status: 'active' | 'inactive' | 'suspended'`
  - `jurisdictionId?: string`
  - `createdAt: Timestamp`
  - `updatedAt: Timestamp`

- `invites/{inviteId}`
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
  - `declineCount?: number` (optional, for insights)
  - `lastAssignedAt?: Timestamp` (optional, for fairness)

- `audit_logs/{logId}`
  - `adminUserId: string`
  - `adminEmail: string`
  - `action: string`
  - `targetType: 'report' | 'user' | 'system'`
  - `targetId?: string`
  - `details: Record<string, any>`
  - `timestamp: Timestamp`

- `jurisdictions/{id}`
  - `name: string`
  - `type?: 'precinct' | 'district' | 'city' | 'region'`

---

## 7. Report State Machine

1) `pending` — created by citizen
2) `assigned` + `assignmentStatus: 'pending'` — admin assigns to officer
3) Officer action
   - Accept → `accepted` + `assignmentStatus: 'accepted'`
   - Decline → `unassigned`, clear `assignedTo` (re-queue)
4) Active response
   - `accepted` → `responding`
5) Resolution
   - Officer marks `resolved` with notes
   - Supervisor approves (`closureApproved: true`) or rejects (back to `responding`)
6) Exceptional
   - `rejected` — spam/invalid (admin/officer with justification)

Backward compatibility: legacy `validated` maps to post-triage and should be phased out in favor of `assigned`/`unassigned`.

---

## 8. Flows

- Citizen submission (`@newlogin`)
  - Create report with `status: 'pending'`, timestamps, media/location
  - Anonymous users tracked via stable client id

- Admin triage (`@admin`)
  - Review pending/unassigned reports, set priority
  - Manual assign: set `assignedTo`, `status: 'assigned'`, `assignmentStatus: 'pending'`, `updatedAt`
  - Optional audit log creation

- Officer inbox (`@police`)
  - Subscribe to `reports` with `assignedTo == uid`
  - Show new items and notify locally; optional push

- Officer actions (`@police`)
  - Accept/decline assignment
  - Transition to `responding`, attach evidence (upload to Storage or Cloudinary; store URLs)
  - Resolve with notes

- Supervisor review (`@police` or `@admin`)
  - Approve closure (set `closureApproved: true`) or reject back to `responding`

- Monitoring/Analytics (`@admin`, `@police` supervisor views)
  - Client-side metrics and SLA filter views over Firestore queries

---

## 9. Assignment Orchestration

- Manual Assignment
  - Admin/Supervisor selects officer and updates fields accordingly

- Auto-Assignment (Client-driven)
  - Within same `jurisdictionId`:
    1. Query `users` where `role == 'officer'` and `status == 'active'`
    2. For each officer, get open workload count: `reports` where `assignedTo == uid` AND `status IN ['assigned','accepted','responding']`
    3. Select officer with lowest open count; tie-break by `declineCount`, `lastAssignedAt`, or client-side order
    4. Update report as per Manual Assignment
  - No Cloud Functions; runs when Admin clicks Auto-assign

- Decline/Reassign
  - Decline sets `unassigned`, clears `assignedTo`
  - Admin can re-run auto-assign or manually pick another officer

- SLA and Escalation (No schedulers)
  - UI filters compute `updatedAt`/`timestamp` deltas to show overdue accept/respond cases
  - Admin manually escalates/reassigns

- Notifications
  - Store officer `pushToken` in `officers/{uid}`
  - From Admin UI, call Expo Push API to notify on assignment as needed

---

## 10. Security & Firestore Rules (High-Level)

- Citizens
  - Can create `reports`
  - Can read own reports (auth uid or anonymous id)
  - Cannot update `assignedTo`, `status` beyond `pending`

- Admin/Supervisor
  - Can update triage & assignment fields (`assignedTo`, `status: 'assigned'|'rejected'`)
  - Can manage `users` roles/status

- Officer
  - Can read reports where `assignedTo == request.auth.uid`
  - Can update assigned report status transitions and add evidence/notes
  - Cannot reassign or change `assignedTo` (unless supervisor role)

- Supervisor
  - Officer permissions plus reassign and closure approve/reject

- App Check enabled on all clients
- Minimize broad reads with query-based access and client-side rate limiting

---

## 11. Required Firestore Indexes (Examples)

- `reports` composite index: `assignedTo` (==) + `status` (in) + `updatedAt` (desc)
- `reports` single field indexes for `status`, `priority`, `user_id`
- `users` composite index: `role` (==) + `status` (==) + `jurisdictionId` (==)

Actual index specs will be generated from Firestore error prompts during development.

---

## 12. Non-Functional Requirements

- Performance: real-time list updates under typical city loads (thousands of reports/month)
- Reliability: offline-friendly reads on mobile; retry writes on connectivity restoration
- Security/Privacy: PII protected; HTTPS; restricted reads/writes via rules; App Check
- Accessibility: WCAG-compliant color contrast and semantics in Admin; a11y props in mobile
- Internationalization: support multi-language text and RTL layouts
- Observability: client-side logging; optional Sentry SDK; audit logs for critical changes

---

## 13. Analytics & Metrics (Client-side)

- Report funnel: created → assigned → accepted → responding → resolved
- SLA compliance: time-to-accept, time-to-respond, time-to-resolution
- Officer workload: open assignments, declines, resolution rates
- Jurisdiction-level: volume by category/priority, heatmaps by location (if available)

---

## 14. Rollout Plan

- Phase 1: Manual Assignment + basic officer flow + SLA filters
- Phase 2: Auto-Assignment + push notifications + supervisor closure review
- Phase 3: Workload analytics and CSV export; fairness metadata on `officers/{uid}`

---

## 15. Risks & Mitigations

- Risk: Free tier limits on read/write quotas
  - Mitigation: paginate queries, cache client-side, minimize broad reads, use selective subscriptions
- Risk: Missing background jobs for SLAs
  - Mitigation: UI-based overdue filters and manual escalation
- Risk: Push token invalidation
  - Mitigation: refresh on app open; store `lastTokenUpdate`; fallback to local notifications
- Risk: Inconsistent legacy statuses
  - Mitigation: migrate to unified state machine; map `validated` to post-triage

---

## 16. Open Questions

- Do we need per-jurisdiction supervisors distinct from global admins in rules?
- Should evidence be in subcollections (e.g., `reports/{id}/evidence`) for large volume?
- What is the retention policy for `audit_logs` and media URLs?

---

## 17. Success Metrics

- ≥95% of assignments accepted within SLA in pilot
- ≥90% of reports resolved with complete closure metadata
- <2% assignment failures due to rules/permission errors
- Positive officer/admin satisfaction feedback (survey ≥4/5)

---

## 18. Acceptance Criteria Summary

- AC-1: Citizen can create and view own reports; anonymous id supported
- AC-2: Admin can triage and manually assign; updates reflected in officer inbox
- AC-3: Auto-assign picks lowest-workload active officer in jurisdiction
- AC-4: Officer can accept/decline; state transitions enforced by rules
- AC-5: Officer can add evidence and resolve with notes
- AC-6: Supervisor can approve/reject closure
- AC-7: SLA filters and optional push notifications available in Admin
- AC-8: Security rules restrict access appropriately; App Check enabled
- AC-9: Audit logs recorded for critical changes

---

## 19. Appendix: Code References (current repo)

- Citizen: `newlogin/services/reportService.ts`, `newlogin/services/firebaseService.ts`
- Admin: `admin/src/services/firebaseService.ts`, `admin/src/services/inviteService.ts`, `admin/src/services/rbacService.ts`, `admin/src/pages/Users.tsx`, `admin/src/services/auditService.ts`
- Police: `police/services/firestoreService.ts`, `police/screens/AssignmentInboxScreen.tsx`, `police/screens/ReportDetailScreen.tsx`, `police/services/notificationService.ts`, `police/contexts/AuthContext.tsx`, `police/screens/InviteActivationScreen.tsx`

Compliance note: All features are designed to run on Firebase Spark Plan with client-side logic and Firestore security rules; no Cloud Functions, Cloud Run, or paid features are required.
