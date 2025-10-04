import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  User,
  ConfirmationResult,
  IdTokenResult
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { db, firebaseAuth } from '../config/firebase';
import { AuthUser } from '../types';
import { citizenRealtimeNotificationService } from '../services/realtimeNotificationService';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInAnonymous: () => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<void>;
  confirmOtp: (code: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  isAnonymous: boolean;
  confirmation: ConfirmationResult | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  // Initialize notifications for citizen using Firebase Realtime Database
  const initializeNotifications = async (citizenUid: string) => {
    try {
      console.log('[AuthContext] Initializing notifications for citizen:', citizenUid);
      
      // Configure notification channels for Android
      await citizenRealtimeNotificationService.configureNotificationChannels();
      
      // Request notification permissions
      const permissionsGranted = await citizenRealtimeNotificationService.requestPermissions();
      if (!permissionsGranted) {
        console.warn('[AuthContext] Notification permissions denied');
        return;
      }
      
      // Start listening for realtime notifications
      citizenRealtimeNotificationService.startListening(citizenUid, (notification) => {
        console.log('[AuthContext] Received notification:', notification.title);
        // The notification service handles showing the local notification
      });
      
      // Test the connection after a delay
      setTimeout(async () => {
        const connectionOk = await citizenRealtimeNotificationService.testConnection(citizenUid);
        console.log('[AuthContext] Notification service connection test:', connectionOk ? 'SUCCESS' : 'FAILED');
      }, 2000);
      
    } catch (error) {
      console.error('[AuthContext] Error initializing realtime notifications:', error);
    }
  };
  
  // Cleanup notifications when user signs out
  const cleanupNotifications = (citizenUid: string) => {
    try {
      citizenRealtimeNotificationService.stopListening(citizenUid);
      console.log('[AuthContext] Stopped notification listener for citizen:', citizenUid);
    } catch (error) {
      console.error('[AuthContext] Error stopping realtime notifications:', error);
    }
  };

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    } catch (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string): Promise<void> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const { user: firebaseUser } = userCredential;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: name || '',
        phoneNumber: null, // Consistent with admin schema
        role: 'citizen',
        status: 'active', // Add status field for admin management
        authMethod: 'email',
        isPhoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      throw error;
    }
  }, []);

  const signInAnonymous = useCallback(async (): Promise<void> => {
    try {
      const userCredential = await signInAnonymously(firebaseAuth);
      const { user: firebaseUser } = userCredential;
      
      // Store anonymous user ID locally for report retrieval
      await AsyncStorage.setItem('anonymousUserId', firebaseUser.uid);
    } catch (error) {
      throw error;
    }
  }, []);

  const sendOtp = useCallback(async (phoneNumber: string): Promise<void> => {
    try {
      const formattedPhone = `+63${phoneNumber.replace(/\D/g, '')}`;
      // Note: Phone authentication requires additional setup in Expo
      // For now, we'll throw an error to indicate this feature needs implementation
      throw new Error('Phone authentication not yet implemented in this Firebase setup');
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw error;
    }
  }, []);

  const confirmOtp = useCallback(async (code: string, name?: string): Promise<void> => {
    if (!confirmation) {
      throw new Error('Confirmation result not found. Please try sending the OTP again.');
    }
    try {
      const userCredential = await confirmation.confirm(code);
      if (!userCredential) {
        throw new Error('Invalid confirmation result.');
      }

      const { user: firebaseUser } = userCredential;

      // Check if user is new
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        // New user, create Firestore document
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          id: firebaseUser.uid,
          email: null,
          name: name || '',
          phoneNumber: firebaseUser.phoneNumber,
          role: 'citizen',
          status: 'active',
          authMethod: 'phone',
          isPhoneVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Error confirming OTP and signing in:', error);
      throw error;
    }
  }, [confirmation]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      // Cleanup notifications if user exists
      if (user && user.uid) {
        cleanupNotifications(user.uid);
      }
      
      await signOut(firebaseAuth);
      // Clear anonymous user ID if exists
      await AsyncStorage.removeItem('anonymousUserId');
    } catch (error) {
      throw error;
    }
  }, [user]);

  const updateUserProfile = useCallback(async (name: string): Promise<void> => {
    const firebaseUser = firebaseAuth.currentUser;
    if (!firebaseUser) {
      throw new Error('No user is signed in.');
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: name });

      // Update Firestore document
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userDocRef, { name, updatedAt: new Date() });

      // Refresh local user state
      setUser(prevUser => prevUser ? { ...prevUser, name } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        let authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          isAnonymous: firebaseUser.isAnonymous
        };

        // Add RBAC custom claims (role, status)
        try {
          const tokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
          const role = (tokenResult.claims as any)?.role as AuthUser['role'];
          const status = (tokenResult.claims as any)?.status as AuthUser['status'];
          if (role) authUser.role = role;
          if (status) authUser.status = status;
        } catch (e) {
          console.warn('Unable to read custom claims for RBAC:', e);
        }

        // Get additional user data from Firestore for registered users
        if (!firebaseUser.isAnonymous) {
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              authUser = {
                ...authUser,
                name: userData.name,
                phoneNumber: userData.phoneNumber,
                authMethod: userData.authMethod,
                isPhoneVerified: userData.isPhoneVerified,
              };
              setUser(authUser);
              
              // Initialize notifications for registered users
              initializeNotifications(firebaseUser.uid);
            } else {
              console.warn('User document not found in Firestore for UID:', firebaseUser.uid);
              // This can happen if a user is created but the Firestore doc fails.
              // We can still set the basic user object.
              setUser(authUser);
              
              // Initialize notifications even without Firestore document
              initializeNotifications(firebaseUser.uid);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            setUser(null); // Treat as an error state
          }
        } else {
          // For anonymous users, the initial authUser is enough.
          setUser(authUser);
          
          // Initialize notifications for anonymous users too
          initializeNotifications(firebaseUser.uid);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    signIn,
    signUp,
    signInAnonymous,
    sendOtp,
    confirmOtp,
    logout,
    updateProfile: updateUserProfile,
    isAnonymous: user?.isAnonymous || false,
    confirmation
  }), [user, loading, signIn, signUp, signInAnonymous, sendOtp, confirmOtp, logout, updateUserProfile, confirmation]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
