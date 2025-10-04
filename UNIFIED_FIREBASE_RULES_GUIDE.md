# 🔥 Unified Firebase Rules - Deployment Guide

## 📋 Overview

This guide explains the unified Firebase rules setup for the CCRS (Community Crime Reporting System) that covers all three applications from a single deployment point.

## 🏗️ Architecture

```
ccrs-test/                          (ROOT - Deploy from here)
├── firebase.json                   ✅ Main Firebase config
├── firestore.rules                 ✅ Unified Firestore rules
├── firestore.indexes.json          ✅ Unified indexes  
├── database.rules.json             ✅ Realtime DB rules (notifications)
├── deploy-firebase-rules.ps1       ✅ Deployment script
│
├── admin/
│   └── firebase.json               ↗️ Points to ../firestore.rules
├── police/  
│   └── firebase.json               ↗️ Points to ../firestore.rules
└── newlogin/
    └── firebase.json               ↗️ Points to ../firestore.rules
```

## ✅ What Changed

### Before (Scattered Rules)
- ❌ `police/firestore.rules` - Different rules for police app
- ❌ `newlogin/.yoyo/snapshot/firestore.rules` - Basic citizen rules  
- ❌ No unified deployment strategy
- ❌ Risk of inconsistent permissions

### After (Unified Rules) 
- ✅ **Single source of truth**: `ccrs-test/firestore.rules`
- ✅ **Unified deployment**: Deploy from root directory
- ✅ **Consistent permissions** across all three apps
- ✅ **Centralized management** of all Firebase rules

## 🔒 Security Rules Coverage

### Firestore Rules (`firestore.rules`)
Comprehensive rules covering:

#### **Users Collection** (`/users/{userId}`)
- ✅ Users can read/write their own data
- ✅ Admins can read/update all users
- ✅ Supervisors can read officer profiles
- ✅ Protected user creation during registration

#### **Reports Collection** (`/reports/{reportId}`)
- ✅ **Citizens**: Create reports, read own reports
- ✅ **Officers**: Read assigned reports, update with state validation
- ✅ **Supervisors**: Full read/update access to all reports  
- ✅ **Admins**: Full read/update/delete access
- ✅ **Anonymous users**: Can create reports

#### **Officers Collection** (`/officers/{officerId}`)
- ✅ Store Expo push tokens securely
- ✅ Token format validation
- ✅ Self-update only for officers

#### **Report Evidence** (`/reports/{id}/report_evidence/{evidenceId}`)
- ✅ Officers assigned to report can create evidence
- ✅ Supervisors/Admins can read all evidence
- ✅ Evidence is immutable once created

#### **Audit Logs** (`/audit_logs/{logId}`)
- ✅ Law enforcement can read/create audit entries
- ✅ Logs are append-only (immutable)
- ✅ Sensitive data protection

### Realtime Database Rules (`database.rules.json`)
Notification system rules:
- ✅ **Citizens**: Can only read their own notifications
- ✅ **Admin/Police**: Can write notifications to any user
- ✅ **Schema validation**: Enforces notification structure
- ✅ **Authentication required**: All operations need auth

## 🚀 Deployment Instructions

### Quick Deployment
```powershell
# From the CCRS root directory (ccrs-test/)
.\deploy-firebase-rules.ps1
```

### Manual Deployment
```bash
# From the CCRS root directory (ccrs-test/)
cd "C:\Users\nicos\OneDrive\Desktop\23-08-2025\ccrs-test"

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Realtime Database rules  
firebase deploy --only database

# Or deploy both together
firebase deploy --only firestore,database
```

### Prerequisites
1. **Firebase CLI installed**: `npm install -g firebase-tools`
2. **Logged in to Firebase**: `firebase login` 
3. **Correct project selected**: `firebase use mylogin-7b99e`

## 📂 File Structure Details

### Root Level Files

#### `firebase.json`
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"  
  },
  "database": {
    "rules": "database.rules.json"
  },
  "hosting": {
    "public": "admin/dist"
  }
}
```

#### `firestore.rules`
- **280 lines** of comprehensive security rules
- **Role-based access control** (citizen, officer, supervisor, admin)
- **State transition validation** for reports
- **Data validation** helpers
- **Evidence management** rules

#### `firestore.indexes.json`
```json
{
  "indexes": [
    { "collectionGroup": "reports", "fields": ["user_id", "timestamp"] },
    { "collectionGroup": "reports", "fields": ["status", "timestamp"] },
    { "collectionGroup": "reports", "fields": ["assignedTo", "timestamp"] },
    // ... additional indexes for performance
  ]
}
```

#### `database.rules.json`
Realtime Database rules for the notification system supporting the unified schema.

### App-Level Files (Reference Root)

Each app directory contains a `firebase.json` that references the root rules:

```json
{
  "firestore": {
    "rules": "../firestore.rules",
    "indexes": "../firestore.indexes.json"
  },
  "database": {
    "rules": "../database.rules.json"
  }
}
```

## 🧪 Testing the Rules

### 1. Rule Validation
```bash
# Test Firestore rules locally
firebase emulators:start --only firestore

# Test rules with the Firebase console simulator
```

### 2. Permission Testing

#### Citizen User Test
- ✅ Can create reports
- ✅ Can read own reports  
- ❌ Cannot read other users' reports
- ❌ Cannot update report status

#### Officer User Test  
- ✅ Can read assigned reports
- ✅ Can update assigned report status
- ✅ Can create evidence on assigned reports
- ❌ Cannot read unassigned reports

#### Admin User Test
- ✅ Can read all reports
- ✅ Can update any report  
- ✅ Can delete reports
- ✅ Can manage users

### 3. Integration Testing
```bash
# Test from each app directory
cd admin && npm run dev
cd police && npm start  
cd newlogin && npm start

# Verify all apps work with unified rules
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Permission Denied Errors
```
Error: Missing or insufficient permissions
```
**Solution**: 
- Check user role in Firestore `/users/{uid}` document
- Verify custom claims are set correctly
- Ensure rules are deployed: `firebase deploy --only firestore`

#### 2. Rules Deployment Failed
```
Error: Failed to load function definition
```
**Solution**:
- Check syntax in `firestore.rules` 
- Validate rule structure
- Ensure proper escape sequences in regex

#### 3. Index Errors
```  
Error: The query requires an index
```
**Solution**:
- Add missing index to `firestore.indexes.json`
- Deploy indexes: `firebase deploy --only firestore:indexes`

#### 4. App-Specific Issues
If an individual app has issues:
1. Check that its `firebase.json` points to `../firestore.rules`
2. Ensure the relative path is correct
3. Verify the app is using the same Firebase project

### Debug Commands

```bash
# Check current Firebase project
firebase use

# List all projects
firebase projects:list

# Check deployed rules
firebase firestore:rules get

# View rule execution logs
# Go to Firebase Console > Firestore > Monitor > Rules
```

## 📈 Performance Optimizations

### Indexes Included
- **User reports**: `user_id + timestamp DESC`
- **Status filtering**: `status + timestamp DESC` 
- **Officer assignments**: `assignedTo + timestamp DESC`
- **Category filtering**: `mainCategory + timestamp DESC`
- **Priority sorting**: `priority + timestamp DESC`
- **Audit logs**: `actorUid + createdAt DESC`

### Best Practices Applied
- ✅ **Minimal field access**: Rules only access necessary fields
- ✅ **Efficient role checking**: Custom claims OR Firestore lookup
- ✅ **Indexed queries**: All common query patterns indexed
- ✅ **Data validation**: Prevents malformed documents

## 📚 Additional Resources

### Firebase Documentation
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Realtime Database Rules](https://firebase.google.com/docs/database/security)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

### Rule Testing Tools  
- [Rules Playground](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Security Rules Emulator](https://firebase.google.com/docs/emulator-suite)

---

## ✅ Deployment Checklist

Before deploying to production:

### Pre-deployment
- [ ] Test rules with Firebase emulator
- [ ] Validate all user role scenarios  
- [ ] Check app-specific firebase.json files point to root
- [ ] Verify index coverage for all queries
- [ ] Test notification system with new database rules

### Deployment
- [ ] Run `firebase login` and `firebase use mylogin-7b99e`
- [ ] Execute `.\deploy-firebase-rules.ps1` from root directory
- [ ] Verify deployment success in Firebase console
- [ ] Test each app after deployment

### Post-deployment  
- [ ] Monitor rule evaluation errors in Firebase console
- [ ] Test user workflows across all three apps
- [ ] Verify notification system works with new rules
- [ ] Document any issues for future reference

---

**Status**: ✅ **Ready for Deployment**  
**Last Updated**: 2025-09-22  
**Version**: 1.0 (Unified Rules)