#!/usr/bin/env node
/**
 * Admin User Setup Script
 * 
 * This script helps set up the admin user in Firebase Authentication 
 * and ensures custom claims are properly configured.
 */

import admin from 'firebase-admin';
import readline from 'readline';

// Initialize Firebase Admin SDK
// Make sure your service account key is in the project root or set GOOGLE_APPLICATION_CREDENTIALS
try {
  // Try to initialize with default credentials first
  admin.initializeApp({
    // Add your Firebase project configuration here if needed
  });
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  console.log('\n💡 Make sure you have:');
  console.log('1. A service account key file in your project');
  console.log('2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('3. Or run `firebase login` if using Firebase CLI');
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

async function main() {
  console.log('🚀 Admin User Setup for CCRS System');
  console.log('=====================================\n');

  const email = 'admin@ccrs-system.com';
  const uid = 'GPm2wVfBG7eApAWstqKodVnliEv1'; // From your Firestore document
  
  console.log(`📧 Admin Email: ${email}`);
  console.log(`🆔 Expected UID: ${uid}\n`);

  try {
    // Step 1: Check if user exists in Firebase Auth
    console.log('🔍 Step 1: Checking if user exists in Firebase Authentication...');
    
    let authUser;
    try {
      authUser = await admin.auth().getUser(uid);
      console.log(`✅ User found in Firebase Auth: ${authUser.email}`);
      console.log(`   - Provider: ${authUser.providerData[0]?.providerId || 'email'}`);
      console.log(`   - Email verified: ${authUser.emailVerified}`);
      console.log(`   - Disabled: ${authUser.disabled}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ User not found in Firebase Authentication');
        console.log('🔧 Creating user in Firebase Authentication...');
        
        const password = await question('Enter a temporary password for admin user: ');
        
        authUser = await admin.auth().createUser({
          uid: uid,
          email: email,
          password: password,
          emailVerified: true, // Skip email verification for admin
          displayName: 'System Administrator'
        });
        
        console.log(`✅ User created successfully in Firebase Auth`);
      } else {
        throw error;
      }
    }

    // Step 2: Check and set custom claims
    console.log('\n🔍 Step 2: Checking custom claims...');
    
    const currentClaims = authUser.customClaims || {};
    console.log('Current claims:', JSON.stringify(currentClaims, null, 2));
    
    const requiredClaims = {
      role: 'admin',
      status: 'active'
    };
    
    const needsUpdate = !currentClaims.role || !currentClaims.status || 
                       currentClaims.role !== 'admin' || currentClaims.status !== 'active';
    
    if (needsUpdate) {
      console.log('🔧 Setting custom claims...');
      await admin.auth().setCustomUserClaims(uid, requiredClaims);
      console.log('✅ Custom claims set successfully');
      console.log('Required claims:', JSON.stringify(requiredClaims, null, 2));
    } else {
      console.log('✅ Custom claims are already correct');
    }

    // Step 3: Verify Firestore document
    console.log('\n🔍 Step 3: Verifying Firestore user document...');
    
    const userDoc = await admin.firestore().doc(`users/${uid}`).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('✅ Firestore document exists');
      console.log(`   - Email: ${userData.email}`);
      console.log(`   - Role: ${userData.role}`);
      console.log(`   - Status: ${userData.status}`);
      console.log(`   - Name: ${userData.name || userData.fullName}`);
      
      // Check for consistency
      if (userData.role !== 'admin' || userData.status !== 'active') {
        console.log('⚠️  Firestore document role/status doesn\'t match expected values');
        const fix = await question('Fix Firestore document? (y/n): ');
        
        if (fix.toLowerCase() === 'y' || fix.toLowerCase() === 'yes') {
          await admin.firestore().doc(`users/${uid}`).update({
            role: 'admin',
            status: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log('✅ Firestore document updated');
        }
      }
    } else {
      console.log('❌ Firestore document not found');
      console.log('🔧 Creating Firestore document...');
      
      await admin.firestore().doc(`users/${uid}`).set({
        id: uid,
        email: email,
        name: 'System Administrator',
        fullName: 'System Administrator',
        role: 'admin',
        status: 'active',
        authMethod: 'email',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Firestore document created');
    }

    // Step 4: Instructions for next steps
    console.log('\n🎉 Setup Complete!');
    console.log('==================\n');
    console.log('✅ Admin user is now properly configured');
    console.log('✅ Firebase Authentication user exists');
    console.log('✅ Custom claims are set');
    console.log('✅ Firestore document is consistent\n');
    
    console.log('🔄 Next steps:');
    console.log('1. Clear your browser cache/localStorage');
    console.log('2. Try logging in with admin@ccrs-system.com');
    console.log('3. If you created a new password, use that password');
    console.log('4. If you need to reset the password, use Firebase Console\n');
    
    console.log('🐛 If login still fails:');
    console.log('1. Check browser console for errors');
    console.log('2. Verify Firebase configuration');
    console.log('3. Check Firestore security rules');
    
  } catch (error) {
    console.error('❌ Error during setup:', error);
    
    if (error.code) {
      console.log(`Firebase Error Code: ${error.code}`);
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(console.error);
