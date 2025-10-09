/**
 * Service Account Permissions Verification Script
 * Project: mylogin-7b99e
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const possibleKeyFiles = [
  'mylogin-7b99e-firebase-adminsdk-fbsvc-94e48854d8.json',  // New key
  'mylogin-7b99e-firebase-adminsdk-fbsvc-7ec1be95d1.json',  // Old key
  'firebase-admin-key.json',
  'serviceAccountKey.json'
];

let keyFile = null;
for (const filename of possibleKeyFiles) {
  const filePath = path.join(__dirname, filename);
  if (fs.existsSync(filePath)) {
    keyFile = filePath;
    console.log(`📁 Found service account key: ${filename}`);
    break;
  }
}

if (!keyFile) {
  console.error('❌ Service account key file not found.');
  console.error('   Looking for one of:', possibleKeyFiles);
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mylogin-7b99e'
  });
  
  console.log('✅ Firebase Admin initialized');
  console.log(`📋 Service Account Info:`);
  console.log(`   Email: ${serviceAccount.client_email}`);
  console.log(`   Project: ${serviceAccount.project_id}`);
  console.log(`   Client ID: ${serviceAccount.client_id}`);
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

async function verifyPermissions() {
  try {
    const db = admin.firestore();
    
    console.log('\n🔍 Testing Firestore permissions...');
    
    // Test 1: Try to read from a collection
    console.log('📖 Test 1: Reading from existing collection...');
    try {
      const snapshot = await db.collection('users').limit(1).get();
      console.log(`✅ Read permission: OK (found ${snapshot.size} documents)`);
    } catch (error) {
      console.log(`❌ Read permission: FAILED (${error.message})`);
    }
    
    // Test 2: Try to create a test document
    console.log('✏️ Test 2: Creating test document...');
    try {
      const testRef = db.collection('_test_permissions').doc('test');
      await testRef.set({ test: true, timestamp: admin.firestore.Timestamp.now() });
      console.log('✅ Write permission: OK');
      
      // Clean up
      await testRef.delete();
      console.log('✅ Delete permission: OK');
      
    } catch (error) {
      console.log(`❌ Write permission: FAILED (${error.message})`);
      
      if (error.message.includes('Missing or insufficient permissions')) {
        console.log('\n🔧 SOLUTION: The service account needs proper IAM roles.');
        console.log('   Required roles:');
        console.log('   - Cloud Datastore User (for Firestore)');
        console.log('   - Firebase Admin SDK Administrator Service Agent');
        console.log('');
        console.log('🔗 Fix this in Firebase Console:');
        console.log('   1. Go to: https://console.cloud.google.com/iam-admin/iam?project=mylogin-7b99e');
        console.log('   2. Find your service account');
        console.log('   3. Add "Cloud Datastore User" role');
        console.log('   4. Add "Firebase Admin SDK Administrator Service Agent" role');
      }
    }
    
    // Test 3: Try to access specific irfTemplates collection
    console.log('📋 Test 3: Accessing irfTemplates collection...');
    try {
      const irfSnapshot = await db.collection('irfTemplates').limit(1).get();
      console.log(`✅ irfTemplates access: OK (found ${irfSnapshot.size} documents)`);
      
      if (irfSnapshot.size > 0) {
        irfSnapshot.forEach(doc => {
          console.log(`   - Document: ${doc.id}`);
          const data = doc.data();
          console.log(`     Name: ${data.name}`);
          console.log(`     Active: ${data.isActive}`);
        });
      }
    } catch (error) {
      console.log(`❌ irfTemplates access: FAILED (${error.message})`);
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
  }
}

verifyPermissions();