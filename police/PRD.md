# CCRS Police Officers App — Product Requirements Document (PRD)

Version: 1.0
Owner: Product + Engineering
Status: Draft
Last updated: 2025-09-10

## 1) Overview & Goals

A dedicated Police Officers application to operationalize the investigation and response lifecycle of citizen-submitted crime reports. The app bridges the gap between the citizen app (newlogin/) and the admin dashboard (admin/), enabling officers to receive assignments, coordinate responses, collect evidence on-site, update case status in real time, and close cases with full auditability.

Primary goals:
- Reduce time-to-response by providing real-time assignment and navigation to incident locations.
- Improve evidence quality with on-site capture (photos, video, audio, notes) and tamper-evident audit trails.
- Ensure accountability with status transitions, SLA tracking, and activity logs integrated with the admin dashboard.
- Provide officers with relevant analytics and heatmaps (via Recharts) for situational awareness.
- Integrate seamlessly with existing Firestore data models and admin operations.

Non-goals (out of scope for V1):
- Public citizen reporting features (already in newlogin/).
- Full-blown dispatch/Computer-Aided Dispatch (CAD) replacement.
- External CJIS-compliant records management system (RMS) integration (consider for future phases).

## 2) Success Metrics
- Assignment acceptance time (p50, p90): < 5 minutes from assignment to acceptance.
- Average time from “responding” to “resolved”: reduce by 25% versus baseline.
- Evidence completeness rate: > 90% of resolved cases include at least one media artifact and officer notes.
- Officer engagement: > 70% weekly active officers.
- Data integrity: 100% of status updates and evidence actions logged in audit trail.

## 3) Personas & User Stories

Personas:
- Patrol Officer (PO): Handles immediate response, first on scene, quick updates, basic evidence.
- Investigator/Detective (DET): Handles follow-up, complex cases, in-depth evidence and notes.
- Unit Supervisor (SUP): Monitors unit workload, reassigns, approves closures.

Key User Stories:
- As a PO, I receive a push notification when a report is assigned, so I can accept/decline quickly.
- As a PO, I can view incident details (category, description, location, media) and navigate to the location.
- As a PO, I can change status to responding on the way, and resolved/rejected with a reason after assessment.
- As a PO/DET, I can capture photos, videos, audio notes, and text notes that are timestamped and geotagged.
- As a DET, I can request additional info from the citizen via an in-app secure messaging channel (future phase), or record that I attempted contact.
- As a SUP, I can reassign a case to another officer or unit with a note.
- As a SUP, I can review and approve case closure, ensuring evidence sufficiency and proper categorization.

## 4) Functional Requirements

4.1 Assignments
- Officers authenticate and see an Assignment Inbox (list of assigned/open cases).
- Officers can Accept or Decline assignments. Decline requires reason; SUP can reassign.
- Real-time updates when an assignment is accepted by someone else.

4.2 Case Detail
- View summary: category (main + sub), description, citizen media, timestamp, location with map.
- Status transitions aligned with existing statuses: pending → validated → responding → resolved | rejected.
- Officers can add internal notes and view admin comments.
- Show report timeline similar to citizen app, with officer-specific events.

4.3 Evidence Collection
- Capture: photos, short video clips, audio recordings; attach existing gallery items.
- Auto metadata: timestamp, optional geotag (with permissions), device ID hash.
- Upload queue with progress and retry; offline-first with background sync.
- Evidence immutability: once uploaded, evidentiary files are write-once; edits create new versions.

4.4 Mapping & Navigation
- In-app map showing incident location and officer’s approximate position (if permitted).
- Quick-launch to device maps (Google/Apple) for turn-by-turn navigation.
- Area awareness: toggle heatmap and cluster views to see recent incidents nearby (Recharts for summaries; Phosphor icons on map markers following UI preference).

4.5 Messaging & Activity (Phase 2)
- Secure in-app messaging between officers, supervisor, and (optionally) citizen via masked channels.
- Activity feed showing all actions on the case (assignment, status changes, evidence uploads, comments).

4.6 Approvals & Closure
- Officers propose closure with resolution notes; SUP review required for final closure (configurable).
- Closure requires: minimum evidence policy, status reason, and categorization check.
- Upon closure, citizen receives a status update (push/notification via Firestore listener).

4.7 Analytics & Reports
- Personal dashboard: assigned cases, average resolution time, open vs resolved (Recharts components).
- Unit-level view for supervisors: workload distribution, SLA breaches, category trends (Recharts), icons via Phosphor for consistency.

4.8 Settings & Profile
- Notification preferences; location permissions; evidence quality defaults (e.g., image compression).
- Device trust: record device fingerprint to reduce risk of impersonation.

Adherence to user rule: Use Recharts for charts/analytics and Phosphor icons for UI consistency.

## 5) Non-Functional, Security & Compliance
- AuthN/AuthZ: Firebase Auth. Roles: officer, supervisor, admin. Fine-grained Firestore rules.
- Data Security: TLS in transit; device secure storage for tokens; evidence stored in Firebase Storage or GCS with signed URLs.
- Auditability: All actions (accept/decline, status change, evidence add/delete, reassignment) written to audit_logs.
- Performance: Real-time updates via Firestore listeners; push notification latency < 5s.
- Offline Support: Local caching of assignments and staged evidence uploads; conflict resolution strategy (server wins with client merge notes).
- Accessibility: WCAG 2.1 AA where applicable in mobile context.
- Privacy & Compliance: PII minimization; configurable retention; future CJIS alignment; respect local regulations.

## 6) UX/Screen Flow

Primary screens (mobile RN/Expo):
1. Login → Assignment Inbox → Case Detail.
2. Case Detail → Map & Navigate → Evidence Capture → Status Update → Submit for Closure.
3. Supervisor Console (mobile): Inbox → Team View → Reassign → Approve Closure.

Wireframe placeholders:
- Assignment Inbox: list with status chips, distance to incident, priority.
- Case Detail: header (status, category), tabs (Details, Evidence, Activity), map preview.
- Evidence Capture: camera/recorder UI with upload queue.
- Analytics: small cards and Recharts charts.

## 7) Data Models & APIs

7.1 Collections
- reports: existing shape retained; extend with fields:
  - assigned_to: userId of officer
  - assigned_unit?: string
  - assignment_status: unassigned | assigned | accepted | declined | reassigned
  - officer_notes[]: { id, authorId, text, timestamp }
  - resolution_notes?: string
  - closed_by?: userId
  - closed_at?: Timestamp

- report_evidence (subcollection: reports/{id}/evidence):
  - id, type: photo|video|audio|note
  - url (for media), metadata { createdAt, createdBy, deviceIdHash, geotag? }
  - hash (SHA-256) for integrity, size, mimeType
  - immutable flag/versioning

- audit_logs: reuse existing structure; add targetType: 'report'|'evidence'|'assignment'.

7.2 Status Workflow
- From admin “validated”, SUP or system assigns to officer.
- Officer accepts → report.status: responding; assignment_status: accepted.
- Officer resolves → report.status: resolved or rejected; closure workflow enforced by role.

7.3 API/Service Contracts
- Firestore updates and listeners predominately.
- Cloud Functions (recommended) for:
  - Assignment orchestration and notifications (to officer devices).
  - Evidence integrity (write-once) enforcement & hash verification.
  - Closure checks and audit log enrichment.

## 8) Dependencies & Risks
Dependencies:
- Firebase (Auth, Firestore, Storage, Cloud Functions).
- React Native (Expo) for mobile; Recharts for analytics; Phosphor icons for UI.
- Map provider: react-native-maps or Leaflet (web); consistent theming/icons.

Risks:
- Evidence chain-of-custody requires careful design (hashing, immutability, logs).
- Offline capture and sync complexity (conflicts, partial uploads).
- Role enforcement and Firestore security rules must be airtight.
- Push notification reliability on varied devices.

Mitigations:
- Use Cloud Functions for server-side validation.
- Strict security rules + audits.
- Background upload with resume; retries and queued operations.

## 9) Timeline & Milestones (Indicative)
- M1 (2 wks): Assignment Inbox + Auth + basic Case Detail (read-only) with map.
- M2 (3 wks): Status transitions + Accept/Decline + push notifications.
- M3 (4 wks): Evidence capture (photo/video/audio), upload queue, offline support.
- M4 (2 wks): Supervisor flows (reassign, approve closure) + audit logging.
- M5 (2 wks): Analytics (Recharts) + Unit dashboard + polish.
- M6 (hardening): Security review, performance, accessibility, beta pilot.

## 10) Acceptance Criteria (V1)
- Officers can login, see and accept assignments, view case details with map.
- Officers can capture and upload evidence with metadata and offline queueing.
- Status transitions propagate to admin and citizen apps in real time.
- All actions recorded in audit logs.
- Basic analytics available with Recharts; icons from Phosphor are used app-wide.

## 11) Open Questions
- Should citizen-officer direct messaging be enabled in V1 or deferred to Phase 2?
- Required supervisor approval for all closures or category-based policy?
- Minimum evidence policy per category and jurisdictional variations?
- Do we need layered permissions (e.g., traffic-only vs general crimes) at launch?

## 12) Appendix: Integration Notes from Existing Apps
- Citizen app (newlogin/): uses Firestore with reports having status lifecycle and media_urls, with ReportTimeline UI; leverage similar timeline semantics for officer actions.
- Admin dashboard (admin/): manages statuses, comments, and offers GIS map/heatmap; officer app should feed evidence and status updates visible in admin, reuse Phosphor icons and introduce Recharts where charts are needed in officer views.
- Backend (deprecated): frontends directly integrate with Firebase; consider Cloud Functions for server enforcement of assignment, evidence immutability, and notifications.

