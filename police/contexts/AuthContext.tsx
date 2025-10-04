import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from 'firebase/auth';
import { authService, Officer } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';

interface AuthContextType {
  user: User | null;
  officer: Officer | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize notifications for officer using Firebase Realtime Database
  const initializeNotifications = async (officerUid: string) => {
    try {
      // Configure notification channels for local notifications
      await notificationService.configureNotificationChannels();
      
      // Start listening for realtime notifications
      realtimeNotificationService.startListening(officerUid, (notification) => {
        // The notification service will handle showing the local notification
      });
      
      // Test the connection
      setTimeout(async () => {
        await realtimeNotificationService.testConnection(officerUid);
      }, 2000); // Wait 2 seconds after login
      
    } catch (error) {
      console.error('Error initializing realtime notifications:', error);
    }
  };
  
  // Cleanup notifications when user signs out
  const cleanupNotifications = (officerUid: string) => {
    try {
      realtimeNotificationService.stopListening(officerUid);
    } catch (error) {
      console.error('Error stopping realtime notifications:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setUser(user);
      if (user) {
        try {
          // Ensure a minimal users/{uid} doc exists so Admin can list this account
          try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            if (!snap.exists()) {
              await setDoc(userRef, {
                id: user.uid,
                email: (user.email || '').toLowerCase(),
                role: 'citizen',
                status: 'active',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              } as any, { merge: true } as any);
            }
          } catch (e) {
            console.warn('Failed to ensure user profile document:', e);
          }

          // Read custom claims for role and status
          const tokenResult = await user.getIdTokenResult();
          const claims: any = tokenResult.claims || {};
          let role = (claims.role as Officer['role']) || undefined;
          let status = (claims.status as 'active' | 'inactive' | 'suspended') || undefined;

          // Fallback to Firestore users doc if claims missing
          if (!role || !status) {
            try {
              const snap = await getDoc(doc(db, 'users', user.uid));
              if (snap.exists()) {
                const data: any = snap.data();
                role = (data?.role as Officer['role']) || role;
                status = (data?.status as 'active' | 'inactive' | 'suspended') || status;
              }
            } catch (e) {
              console.warn('Failed to load user role from Firestore:', e);
            }
          }

          // Do NOT default to officer; require explicit role from claims or users doc
          role = (role as Officer['role']) || undefined;
          status = (status as 'active' | 'inactive' | 'suspended') || undefined;

          // Only allow officers or supervisors
          if (!role || !['officer', 'supervisor'].includes(role) || status !== 'active') {
            // Not permitted to use police app
            setOfficer(null);
            setLoading(false);
            return;
          }

          setOfficer({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || undefined,
            role,
          });

          // Initialize push notifications for the officer
          initializeNotifications(user.uid);
        } catch (e) {
          console.error('Failed to read RBAC claims for officer:', e);
          setOfficer(null);
        }
      } else {
        setOfficer(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await authService.signIn(email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (officer) {
        cleanupNotifications(officer.uid);
      }
      await authService.signOut();
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    officer,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
