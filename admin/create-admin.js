// Admin User Creation Utility
// Run this script to create an admin user in Firebase
// Usage: node create-admin.js

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Create admin user with email/password
    const adminEmail = 'admin@ccrs-system.com';
    const adminPassword = 'Admin123!'; // Use a strong password
    
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    
    console.log('Admin user created:', user.uid);
    
    // Create admin user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: adminEmail,
      name: 'System Administrator',
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      authMethod: 'email'
    });
    
    console.log('Admin user document created in Firestore');
    console.log('\n=================================');
    console.log('Admin Account Created Successfully!');
    console.log('=================================');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('UID:', user.uid);
    console.log('\nYou can now login to the admin dashboard with these credentials.');
    console.log('\nIMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
