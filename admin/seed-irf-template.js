/**
 * Standalone IRF Template Seeding Script
 * Run with: node seed-irf-template.js
 * 
 * Note: This script requires Firebase Admin SDK with service account authentication
 * Download service account key from Firebase Console and place it in the project root
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin with service account
// Look for the service account key file in the project root
const possibleKeyFiles = [
  'firebase-admin-key.json',
  'mylogin-7b99e-firebase-adminsdk-fbsvc-7ec1be95d1.json',
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
  console.error('   Please place your service account key in the project root.');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'mylogin-7b99e'  // Correct project ID
  });
  
  console.log(`✅ Firebase Admin initialized with project: ${serviceAccount.project_id}`);
  
} catch (error) {
  console.error('❌ Error initializing Firebase Admin:', error.message);
  process.exit(1);
}
} catch (error) {
  console.error('❌ Error loading service account key. Please download it from Firebase Console.');
  console.error('   Place the file as "firebase-admin-key.json" in the project root.');
  process.exit(1);
}

async function seedIRFTemplate() {
  try {
    console.log('🔄 Using Firebase Admin SDK...');
    const db = admin.firestore();
    
    console.log('🔄 Loading IRF template from JSON file...');
    const templatePath = path.join(process.cwd(), 'public', 'shared-data', 'irf-template.json');
    const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
    
    console.log('🔄 Converting to Firestore format...');
    const irfTemplate = {
      id: templateData.id || 'pnp-irf-v1.0',
      name: templateData.name || 'PNP Incident Record Form',
      version: templateData.version || '1.0',
      description: templateData.description,
      isActive: true,
      sections: templateData.sections || {},
      requiredFields: templateData.requiredFields || [],
      optionalFields: templateData.optionalFields || [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      createdBy: 'admin-seeding-script'
    };
    
    console.log('🔄 Storing in Firestore...');
    const irfTemplatesRef = collection(db, 'irfTemplates');
    const templateRef = doc(irfTemplatesRef, irfTemplate.id);
    
    await setDoc(templateRef, irfTemplate, { merge: true });
    
    console.log(`✅ IRF template seeded successfully:`);
    console.log(`   ID: ${irfTemplate.id}`);
    console.log(`   Name: ${irfTemplate.name}`);
    console.log(`   Version: ${irfTemplate.version}`);
    console.log(`   Sections: ${Object.keys(irfTemplate.sections).length}`);
    console.log(`   Required Fields: ${irfTemplate.requiredFields.length}`);
    console.log(`   Optional Fields: ${irfTemplate.optionalFields.length}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error seeding IRF template:', error);
    return false;
  }
}

// Run the seeding function
seedIRFTemplate()
  .then((success) => {
    if (success) {
      console.log('🎉 IRF template seeding completed successfully!');
      console.log('💡 The "Generate IRF" button should now be enabled for desk officers.');
      process.exit(0);
    } else {
      console.log('💥 IRF template seeding failed!');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });