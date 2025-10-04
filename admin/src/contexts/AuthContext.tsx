import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  type User as FirebaseUser,
  type IdTokenResult
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { auditService } from '../services/auditService';
import type { CCRSUser, UserRole, UserStatus, CustomClaims } from '../../../shared-types/rbac';

interface AdminUser extends CCRSUser {
  uid: string; // Firebase UID for compatibility
  // Additional fields specific to admin interface if needed
  permissions?: string[];
}

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupervisor: boolean;
  isDeskOfficer: boolean;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user token and get updated claims
  const refreshToken = async (): Promise<void> => {
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true); // Force refresh
    }
  };

  // Helper function to check roles
  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  };

  // Helper function to check permissions (can be extended)
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // For now, admins have all permissions, supervisors have limited permissions
    if (user.role === 'admin') return true;
    if (user.role === 'supervisor') {
      // Define supervisor permissions
      const supervisorPermissions = ['view_reports', 'edit_reports', 'assign_reports', 'view_users'];
      return supervisorPermissions.includes(permission);
    }
    if (user.role === 'desk_officer') {
      // Define desk officer permissions
      const deskOfficerPermissions = ['validate_reports', 'triage_reports', 'assign_blotter'];
      return deskOfficerPermissions.includes(permission);
    }
    return false;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Get ID token result with custom claims
          const tokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
          const customClaims = tokenResult.claims as unknown as CustomClaims;

          // Get user data from Firestore early so we can fall back if claims are missing
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            await signOut(auth);
            setUser(null);
            console.error('User document not found');
            setLoading(false);
            return;
          }

          const userData = userDoc.data() as CCRSUser;

          // Determine effective role/status: prefer claims, fallback to Firestore
          const effectiveRole = customClaims.role ?? (userData as any).role;
          const effectiveStatus = customClaims.status ?? (userData as any).status;

          // Enforce admin/supervisor/desk_officer access and active status
          if (!effectiveRole || !['admin', 'supervisor', 'desk_officer'].includes(effectiveRole as any)) {
            await signOut(auth);
            setUser(null);
            console.error('Access denied: Admin, Supervisor, or Desk Officer privileges required');
            setLoading(false);
            return;
          }

          if (effectiveStatus !== 'active') {
            await signOut(auth);
            setUser(null);
            console.error('Account is not active');
            setLoading(false);
            return;
          }

          const adminUser: AdminUser = {
            ...userData,
            id: firebaseUser.uid,
            uid: firebaseUser.uid, // Add uid for compatibility
            email: firebaseUser.email || (userData as any).email || '',
            fullName: (userData as any).fullName || (userData as any).name || 'Admin User',
            role: (effectiveRole as any),
            status: (effectiveStatus as any)
          } as AdminUser;

          setUser(adminUser);

          // Update lastLoginAt (non-blocking)
          try {
            await updateDoc(userDocRef, {
              lastLoginAt: new Date(),
              isOnline: true
            });
          } catch (_) {
            // ignore
          }

          // Log admin/supervisor login (non-blocking)
          try {
            await auditService.logAdminLogin(
              firebaseUser.uid,
              firebaseUser.email || 'unknown'
            );
          } catch (_) {
            // ignore
          }
        } catch (error) {
          console.error('Error during auth state resolution:', error);
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true); // Set loading during login
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be set by the onAuthStateChanged listener
      // Don't set loading to false here - let onAuthStateChanged handle it
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false); // Only set loading false on error
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Update user status to offline before logout
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          isOnline: false,
          lastLoginAt: new Date()
        });
        
        // Log admin logout
        await auditService.logAdminLogout(user.id, user.email || '');
      }
      
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    isDeskOfficer: user?.role === 'desk_officer',
    hasRole,
    hasPermission,
    login,
    logout,
    loading,
    refreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
