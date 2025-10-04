import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User,
} from 'firebase/auth';
import { firebaseAuth } from '../config/firebase';

export interface Officer {
  uid: string;
  email: string;
  displayName?: string;
  role: 'officer' | 'supervisor';
  unit?: string;
  badge?: string;
}

class AuthService {
  // Sign in officer with email and password
  async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Sign up officer with email and password (on-device; Free Tier)
  async signUp(email: string, password: string): Promise<User> {
    try {
      const normalized = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, normalized, password);
      return userCredential.user;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign out current officer
  async signOut(): Promise<void> {
    try {
      await fbSignOut(firebaseAuth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  // Get current authenticated officer
  getCurrentUser(): User | null {
    return firebaseAuth.currentUser;
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return fbOnAuthStateChanged(firebaseAuth, callback);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return firebaseAuth.currentUser !== null;
  }
}

export const authService = new AuthService();
export default authService;
