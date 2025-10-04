# 🔧 Manual Desk Officer Account Setup Guide

If the automated script fails, you can create a desk officer account manually using these steps:

## **Method 1: Using Firebase Admin SDK Script**

### **Step 1: Run the Creation Script**
```powershell
cd admin
node create-desk-officer.js
```

### **Step 2: Follow Interactive Prompts**
- Enter email: `desk.officer@test.com`
- Enter name: `Test Desk Officer`
- Enter password: `TestPass123!` (minimum 6 characters)

---

## **Method 2: Manual Firebase Console Setup**

If the Node.js script doesn't work, create the account manually:

### **Step 1: Create User in Firebase Authentication**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `mylogin-7b99e`
3. Navigate to **Authentication** → **Users**
4. Click **Add User**
5. Enter:
   - **Email**: `desk.officer@test.com`
   - **Password**: `TestPass123!`
6. Click **Add User**

### **Step 2: Set Custom Claims**
1. In Firebase Console, go to **Authentication** → **Users**
2. Find the desk officer user you just created
3. Copy the **UID** (you'll need this)
4. Open Firebase CLI and run:

```bash
# Replace UID_HERE with the actual UID
firebase auth:import --hash-algo=scrypt --rounds=8 --mem-cost=14 --accounts-file=- <<EOF
{
  "users": [{
    "localId": "UID_HERE",
    "email": "desk.officer@test.com",
    "customAttributes": "{\"role\":\"desk_officer\",\"status\":\"active\"}"
  }]
}
EOF
```

### **Step 3: Create Firestore Document**
1. In Firebase Console, go to **Firestore Database**
2. Navigate to `users` collection
3. Click **Add Document**
4. Document ID: Use the same **UID** from Step 2
5. Add these fields:

```json
{
  "id": "UID_HERE",
  "email": "desk.officer@test.com", 
  "name": "Test Desk Officer",
  "fullName": "Test Desk Officer",
  "role": "desk_officer",
  "status": "active",
  "authMethod": "email",
  "createdAt": "2025-10-04T15:30:00.000Z",
  "updatedAt": "2025-10-04T15:30:00.000Z",
  "department": "Police Station",
  "position": "Desk Officer",
  "permissions": ["validate_reports", "assign_blotter_numbers", "set_triage_levels"]
}
```

---

## **Method 3: Using Firebase CLI (Alternative)**

```bash
# Create user and set claims in one go
firebase auth:import --hash-algo=scrypt --rounds=8 --mem-cost=14 --accounts-file=desk-officer.json

# Where desk-officer.json contains:
{
  "users": [{
    "localId": "desk-officer-001",
    "email": "desk.officer@test.com",
    "passwordHash": "hashed_password_here",
    "customAttributes": "{\"role\":\"desk_officer\",\"status\":\"active\"}"
  }]
}
```

---

## **Verification Steps**

After creating the account using any method:

### **1. Test Authentication**
1. Navigate to admin dashboard: `http://localhost:5173`
2. Try logging in with:
   - **Email**: `desk.officer@test.com`
   - **Password**: `TestPass123!`

### **2. Test Role Access**
1. After login, navigate to `/desk` route
2. Should see "Desk Officer Portal" page
3. Should display pending reports queue

### **3. Test Permissions**
1. Create a test report in citizen app
2. In desk officer portal, try to validate the report
3. Should be able to approve/reject and generate blotter numbers

---

## **Troubleshooting**

### **Issue: "Permission Denied" Error**
**Solution**: Ensure Firebase rules are deployed:
```bash
firebase deploy --only firestore:rules
```

### **Issue: "User not found" Error**
**Solution**: Check that user exists in both Authentication and Firestore:
1. Firebase Console → Authentication → Users
2. Firebase Console → Firestore → users collection

### **Issue: "Invalid custom claims" Error**
**Solution**: Check custom claims format in Authentication:
```json
{
  "role": "desk_officer",
  "status": "active" 
}
```

### **Issue: "Cannot access /desk route"**
**Solution**: Verify role-based routing is working:
1. Clear browser cache/localStorage
2. Re-login with desk officer account
3. Check browser console for errors

---

## **Test Credentials**

Once setup is complete, use these credentials for testing:

```
📧 Email: desk.officer@test.com
🔑 Password: TestPass123!
🏢 Role: desk_officer
📊 Status: active
🌐 Access: Admin dashboard /desk route
```

---

## **Security Notes**

- This is a **test account** for Sprint 1 development only
- **Delete before production deployment**
- Change password after first successful login
- Monitor Firebase console for any authentication errors
- Ensure Firebase rules are properly deployed before testing

---

**Next Steps**: Once account is created, proceed with Sprint 1 testing using the deployment guide.