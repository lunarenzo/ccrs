/**
 * Simple IRF Template Seeding Script using Web SDK
 * Project: mylogin-7b99e
 * Run with: node seed-irf-simple.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, connectFirestoreEmulator } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Correct Firebase configuration for your project
const firebaseConfig = {
  apiKey: "AIzaSyC1Oanp8y5KIncfat6WbIiWqxwj2M-2oRk",
  authDomain: "mylogin-7b99e.firebaseapp.com",
  databaseURL: "https://mylogin-7b99e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mylogin-7b99e",
  storageBucket: "mylogin-7b99e.firebasestorage.app",
  messagingSenderId: "40190420936",
  appId: "1:40190420936:web:5cd31f3c904a893b6e02fd"
};

async function seedIRFTemplate() {
  try {
    console.log('🔄 Initializing Firebase with project: mylogin-7b99e');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('🔄 Loading IRF template from JSON file...');
    const templatePath = path.join(process.cwd(), 'public', 'shared-data', 'irf-template.json');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }
    
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    
    console.log('🔄 Converting to Firestore format...');
    
    // Convert the template data to Firestore-compatible format
    const irfTemplate = {
      ...templateData,
      // Ensure these fields are set correctly
      id: templateData.id || 'pnp-irf-v1.0',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'seeding-script'
    };
    
    console.log('🔄 Storing in Firestore collection: irfTemplates');
    console.log(`   Document ID: ${irfTemplate.id}`);
    console.log(`   Template Name: ${irfTemplate.name}`);
    console.log(`   Version: ${irfTemplate.version}`);
    
    const irfTemplatesRef = collection(db, 'irfTemplates');
    const templateRef = doc(irfTemplatesRef, irfTemplate.id);
    
    await setDoc(templateRef, irfTemplate, { merge: true });
    
    console.log(`✅ IRF template seeded successfully!`);
    console.log(`   Project: ${firebaseConfig.projectId}`);
    console.log(`   Collection: irfTemplates`);
    console.log(`   Document: ${irfTemplate.id}`);
    console.log(`   Sections: ${Object.keys(irfTemplate.sections).length}`);
    console.log(`   Required Fields: ${irfTemplate.requiredFields.length}`);
    console.log(`   Optional Fields: ${irfTemplate.optionalFields.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error seeding IRF template:', error);
    
    if (error.code === 'permission-denied') {
      console.error('');
      console.error('🔧 SOLUTION: This error occurs because the script needs authentication.');
      console.error('   Try one of these approaches:');
      console.error('   1. Manual Firestore Console seeding (recommended)');
      console.error('   2. Use Firebase Admin SDK with service account key');
      console.error('   3. Seed through the authenticated web app');
      console.error('');
    }
    
    return false;
  }
}

// Run the seeding function
seedIRFTemplate()
  .then((success) => {
    if (success) {
      console.log('🎉 IRF template seeding completed successfully!');
      console.log('💡 The "Generate IRF" button should now be enabled for desk officers.');
      console.log('🔗 Firebase Console: https://console.firebase.google.com/project/mylogin-7b99e/firestore');
      process.exit(0);
    } else {
      console.log('💥 IRF template seeding failed!');
      console.log('');
      console.log('📋 Manual Alternative:');
      console.log('1. Go to: https://console.firebase.google.com/project/mylogin-7b99e/firestore');
      console.log('2. Create collection: irfTemplates');
      console.log('3. Add document with ID: pnp-irf-v1.0');
      console.log('4. Copy contents from: public/shared-data/irf-template.json');
      console.log('5. Set isActive: true');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });