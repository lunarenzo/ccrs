import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1Oanp8y5KIncfat6WbIiWqxwj2M-2oRk",
  authDomain: "mylogin-7b99e.firebaseapp.com",
  projectId: "mylogin-7b99e",
  storageBucket: "mylogin-7b99e.firebasestorage.app",
  messagingSenderId: "40190420936",
  appId: "1:40190420936:web:5cd31f3c904a893b6e02fd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createDeskOfficer() {
  try {
    console.log('🔧 Creating desk officer account...');
    
    // Create desk officer user
    const email = 'desk.officer@test.com';
    const password = 'TestPass123!';
    const name = 'Test Desk Officer';
    
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${name}`);
    console.log(`🔑 Password: ${password}`);
    console.log('');
    
    // Create user with email/password
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase Auth user created');
    console.log(`🆔 UID: ${user.uid}`);
    
    // Create Firestore user document
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: email,
      name: name,
      fullName: name,
      role: 'desk_officer',
      status: 'active',
      authMethod: 'email',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      department: 'Police Station',
      position: 'Desk Officer',
      permissions: ['validate_reports', 'assign_blotter_numbers', 'set_triage_levels']
    });
    
    console.log('✅ Firestore document created');
    console.log('');
    console.log('🎉 Desk Officer Account Created Successfully!');
    console.log('=============================================');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 UID: ${user.uid}`);
    console.log(`🏢 Role: desk_officer`);
    console.log(`📊 Status: active`);
    console.log('');
    console.log('⚠️ IMPORTANT: You still need to set custom claims!');
    console.log('The user will need admin to set role claims, or Firebase rules must');
    console.log('rely on the Firestore document for role validation.');
    console.log('');
    console.log('🧪 Testing:');
    console.log('1. Deploy Firebase rules: firebase deploy --only firestore:rules');
    console.log('2. Login to admin dashboard with above credentials');
    console.log('3. Navigate to /desk route to test');
    
  } catch (error) {
    console.error('❌ Error creating desk officer:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.log('');
      console.log('✅ User may already exist. Try logging in with:');
      console.log('📧 Email: desk.officer@test.com');
      console.log('🔑 Password: TestPass123!');
    }
  }
}

createDeskOfficer();