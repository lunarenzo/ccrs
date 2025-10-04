# E2E Test Plan: Core Report Lifecycle (Citizen → Admin → Police)

## Scope
Core happy-path flow across three apps using Firebase Free Tier only:
- Citizen submits a report (newlogin)
- Admin updates priority and assigns (admin)
- Police accepts and progresses status (police)
- Audit logs created for state changes
- Minimal permission spot checks (no Cloud Functions, no paid features)

Out of scope for this task: SLA filters/dashboard counters (Task 7), advanced security-rule fuzzing (Task 10).

## Preconditions
- Firebase project configured (Spark/Free Tier). No Cloud Functions/Run/Extensions used.
- Firestore rules deployed per canonical model and append-only `audit_logs`.
- Canonical data model in place (reports: location as `{ coordinates: { latitude, longitude }, address?, accuracy? }`).
- Admin app reachable locally (likely `npm run dev`).
- Citizen app (Expo) can run locally (`npx expo start`).
- Police app installed on emulator/device (or local run as applicable).

## Environments & Config
- Admin: `admin/`
- Citizen: `newlogin/`
- Police: `police/`
- Firestore collections: `reports`, `audit_logs`, `users` (officers)

## Test Data
- Officer test users with roles: at least 2 active officers.
- Admin test user with permission to assign.

## Test Steps

1) Citizen submits new report (happy path)
- Open newlogin app
- Fill form: category, description, optional photo, location (if available)
- Submit
- Expected:
  - Firestore doc in `reports` with canonical fields
  - `status = "pending"`, `priority` defaulted
  - `audit_logs` entry for creation
  - Screenshot report ID and Firestore doc

2) Admin updates priority
- Open admin app Reports
- Find newly created report
- Update priority (e.g., High)
- Expected:
  - Report `priority` updated
  - `audit_logs` entry with previous/new priority
  - UI reflects new priority

3) Admin manual assignment
- In admin app, click Assign → choose officer A
- Expected:
  - Report `assignedTo = officerA` and `status = "assigned"`
  - `audit_logs` entry with prev/new assignee
  - UI shows assigned officer

4) Auto-assign smoke (optional)
- Trigger Auto-assign on another pending report
- Expected:
  - Chosen officer is least-loaded per client-side helper
  - `audit_logs` entry for assignment

5) Police acceptance and progress
- On police app (officer A logged in), open assigned report
- Accept/Start handling → change status (e.g., `in_progress`)
- Optionally move to `resolved` with notes
- Expected:
  - Status transitions succeed per rules
  - Relevant `audit_logs` appended
  - Location/timestamps render correctly

6) Minimal permission spot checks
- As officer, attempt forbidden action (assigning a report) → should fail by rules
- As citizen, verify you can view your own submitted report but not others
- Expected:
  - Reads/writes blocked as per rules
  - Errors handled gracefully in UI

7) Artifacts & Logging
- Capture screenshots for key steps
- Record report IDs, audit log IDs, and timestamps
- Log any defects with repro, expected vs actual, and environment metadata

## Notes on Free Tier Compliance
- All logic implemented client-side or via Firestore security rules
- No Cloud Functions/Run/Extensions used (Spark plan compliant)
- Audit logs are append-only and created by clients with rules enforcement

## Exit Criteria
- All steps complete without blocking defects
- Audit logs present for creation, priority change, assignment, and status changes
- Minimal permission checks pass
