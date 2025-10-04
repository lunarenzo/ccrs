// Test Firebase connection for debugging
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase connection...');
    console.log('Auth state:', auth.currentUser);
    
    // Try to get users
    console.log('Attempting to read users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log('Users collection size:', usersSnapshot.size);
    
    usersSnapshot.forEach((doc) => {
      console.log('User ID:', doc.id);
      console.log('User data:', doc.data());
    });
    
  } catch (error) {
    console.error('Firebase test error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  }
}

testFirebaseConnection();
