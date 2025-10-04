#!/usr/bin/env node
/**
 * Desk Officer Account Creation Script
 * 
 * This script creates a desk officer account with proper Firebase Authentication,
 * Firestore document, and custom claims for Sprint 1 testing.
 * 
 * Usage: node create-desk-officer.js
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    // Uses default credentials - ensure GOOGLE_APPLICATION_CREDENTIALS is set
    // or Firebase CLI is logged in
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('\n💡 Make sure you have:');
  console.log('1. Firebase CLI installed: npm install -g firebase-tools');
  console.log('2. Logged in: firebase login');
  console.log('3. Selected correct project: firebase use mylogin-7b99e');
  console.log('4. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createDeskOfficer() {
  console.log('🚀 Desk Officer Account Creation for CCRS Sprint 1');
  console.log('=================================================\n');

  try {
    // Get user input for desk officer details
    const email = await question('Enter desk officer email (e.g., desk.officer@test.com): ');
    const name = await question('Enter desk officer full name: ') || 'Desk Officer';
    const password = await question('Enter temporary password (min 6 characters): ');

    if (!email || !password || password.length < 6) {
      throw new Error('Email and password (min 6 chars) are required');
    }

    console.log('\n🔧 Creating desk officer account...\n');

    // Step 1: Create user in Firebase Authentication
    console.log('1️⃣ Creating Firebase Authentication user...');
    
    let authUser;
    try {
      authUser = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: true, // Skip email verification for testing
        displayName: name,
        disabled: false
      });
      
      console.log(`   ✅ Auth user created with UID: ${authUser.uid}`);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log('   ⚠️ User already exists, getting existing user...');
        authUser = await admin.auth().getUserByEmail(email);
        console.log(`   ✅ Found existing user with UID: ${authUser.uid}`);
      } else {
        throw error;
      }
    }

    // Step 2: Set custom claims for role-based access
    console.log('\n2️⃣ Setting custom claims...');
    
    const customClaims = {
      role: 'desk_officer',
      status: 'active'
    };

    await admin.auth().setCustomUserClaims(authUser.uid, customClaims);
    console.log('   ✅ Custom claims set:', JSON.stringify(customClaims, null, 2));

    // Step 3: Create Firestore user document
    console.log('\n3️⃣ Creating Firestore user document...');
    
    const userDocData = {
      id: authUser.uid,
      email: email,
      name: name,
      fullName: name,
      role: 'desk_officer',
      status: 'active',
      authMethod: 'email',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Desk officer specific fields
      department: 'Police Station',
      position: 'Desk Officer',
      permissions: ['validate_reports', 'assign_blotter_numbers', 'set_triage_levels']
    };

    await admin.firestore().doc(`users/${authUser.uid}`).set(userDocData);
    console.log('   ✅ Firestore document created');

    // Step 4: Verify setup
    console.log('\n4️⃣ Verifying setup...');
    
    // Check if user can be retrieved
    const verifyUser = await admin.auth().getUser(authUser.uid);
    const verifyDoc = await admin.firestore().doc(`users/${authUser.uid}`).get();
    
    if (verifyUser.customClaims?.role === 'desk_officer' && verifyDoc.exists) {
      console.log('   ✅ Setup verification passed');
    } else {
      console.log('   ⚠️ Setup verification failed - please check manually');
    }

    // Step 5: Success summary
    console.log('\n🎉 Desk Officer Account Created Successfully!');
    console.log('=============================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 UID: ${authUser.uid}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🏢 Role: desk_officer`);
    console.log(`📊 Status: active`);

    console.log('\n🔍 Account Details:');
    console.log(`   - Can access Admin Dashboard at /desk route`);
    console.log(`   - Can validate pending reports`);
    console.log(`   - Can assign blotter numbers`);
    console.log(`   - Can set triage levels`);
    console.log(`   - Can assign reports to investigators`);

    console.log('\n🧪 Testing Instructions:');
    console.log('1. Deploy Firebase rules first: firebase deploy --only firestore:rules');
    console.log('2. Navigate to admin dashboard: http://localhost:5173');
    console.log('3. Login with the credentials above');
    console.log('4. Navigate to /desk route to access Desk Officer Portal');
    console.log('5. Create test citizen reports to validate');

    console.log('\n⚠️ Security Notes:');
    console.log('- This is a test account for Sprint 1 testing');
    console.log('- Change password after first login');
    console.log('- Ensure Firebase rules are deployed before testing');
    console.log('- Remove test accounts before production deployment');

  } catch (error) {
    console.error('\n❌ Error creating desk officer account:', error);
    
    if (error.code) {
      console.log(`\nFirebase Error Code: ${error.code}`);
      
      // Provide specific guidance for common errors
      switch (error.code) {
        case 'auth/weak-password':
          console.log('💡 Password must be at least 6 characters long');
          break;
        case 'auth/invalid-email':
          console.log('💡 Please provide a valid email address');
          break;
        case 'auth/email-already-exists':
          console.log('💡 User with this email already exists');
          break;
        case 'permission-denied':
          console.log('💡 Check Firebase permissions and authentication');
          break;
        default:
          console.log('💡 Check Firebase configuration and connectivity');
      }
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function main() {
  try {
    // Check if we can connect to Firebase
    console.log('🔍 Checking Firebase connection...');
    await admin.firestore().collection('_test').limit(1).get();
    console.log('✅ Firebase connection successful\n');
    
    await createDeskOfficer();
    
  } catch (error) {
    if (error.code === 7) { // Permission denied
      console.error('❌ Permission denied. Make sure:');
      console.log('1. Firebase CLI is logged in: firebase login');
      console.log('2. Correct project selected: firebase use mylogin-7b99e');
      console.log('3. You have admin permissions on the project');
    } else {
      console.error('❌ Firebase connection failed:', error.message);
    }
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);