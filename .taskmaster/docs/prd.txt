# CCRS MVP End-to-End PRD (Priority Checklist Execution)

Version: 2025-09-15 21:24 (+08)
Owner: Taskmaster
Status: Draft

## 1. Objective
Deliver a minimal, complete, and testable E2E MVP across the three CCRS apps (Citizen @newlogin, Admin @admin, Police @police) aligned to the orchestration and security model in `POLICE_ASSIGNMENT_ORCHESTRATION.md`, fully compliant with Firebase Spark (Free) Tier.

## 2. Success Criteria (MVP)
- A citizen can submit a report and track its status to closure.
- An admin can triage, set priority, assign (manual/auto) to an officer, and monitor SLAs.
- An officer can accept/decline, respond with evidence, and request closure. A supervisor can approve/reject closure.
- Firestore rules enforce role-based transitions and field-level permissions.
- No Cloud Functions/paid features are required. Client-driven orchestration only.

## 3. Scope of This Iteration (Priority Checklist)
1) Admin assignment + status model unification
2) Client-only auto-assign algorithm
3) SLA filters and dashboards (admin)
4) Optional officer push notification trigger (admin)
5) Data model alignment across apps (location, timestamps, statuses)
6) Canonical Firestore rules and indexes

Non-goals (MVP): Phone OTP auth, advanced analytics BI dashboards, background job schedulers, Cloud Functions.

## 4. Assumptions & Constraints
- Firebase Spark (Free) Tier only: no Cloud Functions, Cloud Run, scheduled tasks.
- Orchestration is client-side; enforcement in Firestore security rules where possible.
- Expo-managed workflow for mobile apps.
- Media via Cloudinary from client. URLs stored in Firestore.

## 5. Personas & Roles
- Citizen (anonymous or authenticated): create and view own reports.
- Admin: triage, prioritize, assign, monitor SLA, manage users.
- Officer: handle assigned reports, upload evidence, transition statuses.
- Supervisor: reassign, approve/reject closure.

## 6. Data Model Alignment (Canonical)
Collection: `reports/{id}`
- id: string (doc id)
- user_id: string
- status: 'pending' | 'assigned' | 'accepted' | 'responding' | 'resolved' | 'rejected' | 'unassigned'
- assignmentStatus: 'pending' | 'accepted' | 'declined' (nullable)
- assignedTo: string | null (officer uid)
- priority: 'low' | 'medium' | 'high' | 'critical'
- mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other'
- category: string
- description: string
- location: { address?: string; coordinates?: { latitude: number; longitude: number }; accuracy?: number }
- media_urls?: string[] (citizen)
- officerNotes?: { note: string; author: string; timestamp: Timestamp }[]
- resolutionNotes?: string
- timestamp: Timestamp (created)
- updatedAt: Timestamp (last change)
- submission_type: 'anonymous' | 'authenticated'
- media_count?: number
- has_location?: boolean

Subcollection: `reports/{id}/report_evidence/{evidenceId}`
- type: 'photo' | 'video' | 'audio'
- url: string
- publicId: string
- authorUid: string
- createdAt: Timestamp

Other collections used in flow
- `users/{uid}`: role, status, profile metadata
- `officers/{uid}`: { pushToken, lastTokenUpdate }
- `audit_logs/{id}`: append-only audit trail
- `invites/{id}`: officer invites (admin-managed)

Backward compatibility during transition:
- Police app will read `timestamp` if `createdAt` missing.
- Police app will use `location.coordinates` if present, else fallback to `location.latitude/longitude`.

## 7. Detailed Requirements & Acceptance Criteria

### 7.1 Admin Assignment & Status Unification
Paths: `admin/src/pages/Reports.tsx`, `admin/src/services/firebaseService.ts`

- Admin can set `priority` for a report.
- Admin can manually assign a report to an officer.
  - Writes fields: `assignedTo`, `status: 'assigned'`, `assignmentStatus: 'pending'`, `updatedAt: Timestamp.now()`.
  - Appends audit log: `audit_logs` with action "assign" and actor.
- Admin can change status only along allowed transitions (see Rules).
- UI shows officer directory (role=='officer' and status=='active'); minimal officer list by querying `users`.

Acceptance
- Given a pending report, when admin assigns it, then police inbox for that officer shows the case within <5s (realtime or manual refresh) and report fields reflect assignment.
- Given a report is assigned, when admin reassigns, then the new officer receives updated assignment and previous `assignedTo` is replaced.

### 7.2 Auto-Assign (Client-Only)
Paths: `admin/src/pages/Reports.tsx`, new helper `admin/src/lib/assign.ts`

- Auto-assign chooses an officer within same `jurisdictionId` with the lowest open workload.
- Open workload: count of reports where `assignedTo == officerUid` and `status in ['assigned','accepted','responding']`.
- Ties: pick officer with oldest `updatedAt` on last assignment (basic fairness).
- Writes identical fields as manual assign + audit log.

Acceptance
- Auto-assign selects a valid officer and writes assignment in <1s on normal networks.
- On empty officer pool or read failure, the action surfaces an error toast and no write occurs.

### 7.3 SLA Filters (Admin)
Paths: `admin/src/pages/Reports.tsx`

- Filters: "Unaccepted > 15m" shows reports with `status == 'assigned'` AND `assignmentStatus == 'pending'` AND `updatedAt < now-15m`.
- "No response > 30m" shows reports with `status == 'accepted'` but not `responding` and `updatedAt < now-30m`.
- Counters/badges and quick filters in the Reports header.

Acceptance
- Filters return correct subsets consistent with manual spot checks.
- Toggling filters updates table and map markers consistently.

### 7.4 Optional Notify Officer (Push)
Paths: `admin/src/pages/Reports.tsx`, reuse `officers/{uid}.pushToken`

- Admin can press "Notify Officer" to send a local Expo Push notification via public Expo API call.
- If `pushToken` missing, show guidance to open police app to register.

Acceptance
- Device registered to the officer account receives the notification within seconds during testing.

Note: This uses Expo Push service directly from client; no Cloud Functions.

### 7.5 Data Model Alignment
Paths: `newlogin/services/reportService.ts`, `police/screens/ReportDetailScreen.tsx`

- Citizen submission nests coordinates under `location.coordinates`.
- Police UI gracefully handles both old and new `location` shapes; prefers `coordinates`.
- Police displays prefer `timestamp` when `createdAt` is absent.

Acceptance
- Existing reports continue to render location and timestamps.
- New reports show map and times correctly in police and admin UIs.

### 7.6 Firestore Rules & Indexes
Canonical rules file to deploy: `newlogin/firestore.rules`

- Ensure officers can only update assigned reports with allowed field changes and transitions.
- Supervisors can update any report; admins can update/delete any report.
- Evidence create/read guarded to assigned officers, supervisors, admins; immutable after creation.
- `officers/{uid}` only updatable by self (limited fields).

Indexes (json present in `newlogin/firestore.indexes.json` and `police/firestore.indexes.json`)
- Ensure composite indexes for frequent queries:
  - reports: `assignedTo ASC, timestamp DESC`
  - reports: `status ASC, timestamp DESC`
  - reports: `user_id ASC, timestamp DESC`

Acceptance
- All app queries run without Firestore index errors. If a new index is prompted by Firestore, record it and add to index file.

## 8. Security & Compliance (Free Tier)
- No Cloud Functions/Run/cron. All orchestration is client-driven.
- Security enforced by Firestore rules and client validations.
- PII handling: Avoid storing sensitive data in audit logs; store minimal identifiers.
- Media stored in Cloudinary with public URLs; only IDs/URLs in Firestore.

## 9. Telemetry & Audit
- Append-only `audit_logs` on key actions: assign, reassign, accept/decline, status changes, evidence add, closure approve/reject.
- Minimal schema: { action, actorUid, actorRole, reportId, timestamp, details }

## 10. Testing Plan (E2E)
- Citizen submit report (anon and authenticated); verify in Admin and Police.
- Admin manual assign; verify officer inbox and fields written.
- Officer accept -> responding; add photo/video/audio evidence; add note.
- Officer resolve with notes.
- Supervisor approve and reject closure flows.
- Admin SLA filters show qualifying cases.
- Optional: Notify Officer test.
- Negative tests for Firestore rules (forbidden updates from wrong roles).

## 11. Rollout Plan
- Phase A: Data model alignment + Admin manual assignment + rules deploy.
- Phase B: SLA filters + auto-assign.
- Phase C: Optional push notify + polish.
- Smoke test on both iOS and Android (Expo), plus Admin web.

## 12. Risks & Mitigations
- Data shape drift across apps → Mitigation: shared TS types and a single PRD; incremental compatibility shims.
- Index gaps → Mitigation: capture prompts and update index files immediately.
- Push tokens missing → Mitigation: in-app guidance for officers to open app; fallback local device notifications.

## 13. Open Questions
- Do we gate auto-assign by officer workload thresholds or shift schedules?
- Do we need jurisdiction-scoped Admin views (multi-tenancy)?
- Do we require citizen-visible resolution notes?

## 14. References
- `POLICE_ASSIGNMENT_ORCHESTRATION.md`
- `ADMIN_PROJECT_OVERVIEW.md`, `NEWLOGIN_PROJECT_OVERVIEW.md`, `POLICE_PROJECT_OVERVIEW.md`
- `newlogin/firestore.rules`
- `newlogin/firestore.indexes.json`, `police/firestore.indexes.json`
