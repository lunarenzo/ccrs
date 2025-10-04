import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  where,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Types matching React Native app
export interface Report {
  id: string;
  user_id?: string | null;
  mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other';
  category: string;
  description: string;
  media_urls?: string[];
  location?: {
    latitude: number;
    longitude: number;
    address?: {
      street?: string;
      district?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      formattedAddress?: string;
    };
    accuracy?: number;
  };
  status: 'pending' | 'validated' | 'assigned' | 'accepted' | 'responding' | 'resolved' | 'rejected';
  assignedTo?: string | null;
  assignmentStatus?: 'pending' | 'accepted' | 'rejected';
  priority?: 'low' | 'medium' | 'high';
  timestamp: Date;
  updatedAt: Date;
  submission_type?: 'anonymous' | 'authenticated';
  media_count?: number;
  has_location?: boolean;
  comments?: {
    id: string;
    text: string;
    author: string;
    authorId: string;
    timestamp: Date;
  }[];
}

export interface User {
  id: string;
  email?: string | null;
  name?: string;
  phoneNumber?: string | null; // Consistent with mobile app
  role?: 'citizen' | 'officer' | 'supervisor' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
  authMethod?: 'email' | 'phone';
  isPhoneVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  validatedReports: number;
  respondingReports: number;
  resolvedReports: number;
  rejectedReports: number;
  totalUsers: number;
  anonymousReports: number;
  authenticatedReports: number;
  categoryStats: Record<string, number>;
}

class FirebaseService {
  // Get all reports with real-time updates
  subscribeToReports(callback: (reports: Report[]) => void): () => void {
    console.log('🔄 ADMIN DASHBOARD - Creating fresh Firebase query...');
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    return onSnapshot(
      q,
      (querySnapshot) => {
        const reports: Report[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Only process reports that have mainCategory field (new reports)
          if (data.mainCategory) {
            reports.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Report);
          }
        });
        callback(reports);
      },
      (error) => {
        console.log('No reports collection yet:', error);
        // Return empty array if reports collection doesn't exist
        callback([]);
      }
    );
  }

  // Get reports with filters
  async getReports(filters?: {
    status?: string;
    mainCategory?: string;
    limit?: number;
  }): Promise<Report[]> {
    try {
      let q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));

      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters?.mainCategory) {
        q = query(q, where('mainCategory', '==', filters.mainCategory));
      }

      const querySnapshot = await getDocs(q);
      const reports: Report[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as Report);
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw new Error('Failed to fetch reports');
    }
  }

  // Update report status
  async updateReportStatus(reportId: string, status: Report['status']): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      throw new Error('Failed to update report status');
    }
  }

  // Delete report
  async deleteReport(reportId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  // Update report with comments
  async updateReportWithComments(reportId: string, comments: any[]): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        comments,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating report comments:', error);
      throw new Error('Failed to update report comments');
    }
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      let totalUsers = 0;
      
      // Get user count first (this is more likely to exist)
      try {
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        totalUsers = usersSnapshot.size;
      } catch (userError) {
        console.log('No users collection yet:', userError);
        totalUsers = 0;
      }

      // Try to get reports
      let totalReports = 0;
      let pendingReports = 0;
      let validatedReports = 0;
      let respondingReports = 0;
      let resolvedReports = 0;
      let rejectedReports = 0;
      let anonymousReports = 0;
      let authenticatedReports = 0;
      const categoryStats: Record<string, number> = {};

      try {
        const reportsQuery = query(collection(db, 'reports'));
        const reportsSnapshot = await getDocs(reportsQuery);

        reportsSnapshot.forEach((doc) => {
          const data = doc.data();
          totalReports++;

          // Count by status
          switch (data.status) {
            case 'pending':
              pendingReports++;
              break;
            case 'validated':
              validatedReports++;
              break;
            case 'responding':
              respondingReports++;
              break;
            case 'resolved':
              resolvedReports++;
              break;
            case 'rejected':
              rejectedReports++;
              break;
          }

          // Count by submission type
          if (data.submission_type === 'anonymous') {
            anonymousReports++;
          } else {
            authenticatedReports++;
          }

          // Count by category
          const category = data.mainCategory || 'other';
          categoryStats[category] = (categoryStats[category] || 0) + 1;
        });
      } catch (reportsError) {
        console.log('No reports collection yet:', reportsError);
        // All report counts remain 0
      }

      return {
        totalReports,
        pendingReports,
        validatedReports,
        respondingReports,
        resolvedReports,
        rejectedReports,
        totalUsers,
        anonymousReports,
        authenticatedReports,
        categoryStats
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  // Get users (if you have a users collection)
  async getUsers(): Promise<User[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const users: User[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as User);
      });

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return []; // Return empty array if users collection doesn't exist
    }
  }

  // Update user
  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const { id, createdAt, ...updateData } = userData;
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Subscribe to real-time dashboard stats
  subscribeToDashboardStats(callback: (stats: DashboardStats) => void): () => void {
    const q = query(collection(db, 'reports'));

    return onSnapshot(q, async () => {
      try {
        const stats = await this.getDashboardStats();
        callback(stats);
      } catch (error) {
        console.error('Error in stats subscription:', error);
        // Return empty stats if collection doesn't exist
        callback({
          totalReports: 0,
          pendingReports: 0,
          validatedReports: 0,
          respondingReports: 0,
          resolvedReports: 0,
          rejectedReports: 0,
          totalUsers: 0,
          anonymousReports: 0,
          authenticatedReports: 0,
          categoryStats: {}
        });
      }
    }, (error) => {
      console.error('Error setting up stats subscription:', error);
      // Call callback immediately with empty stats if reports collection doesn't exist
      callback({
        totalReports: 0,
        pendingReports: 0,
        validatedReports: 0,
        respondingReports: 0,
        resolvedReports: 0,
        rejectedReports: 0,
        totalUsers: 0,
        anonymousReports: 0,
        authenticatedReports: 0,
        categoryStats: {}
      });
    });
  }

  // Subscribe to users in real-time
  subscribeToUsers(callback: (users: User[]) => void): () => void {
    const qy = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      qy,
      (snap) => {
        const users: User[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          users.push({
            id: docSnap.id,
            ...data,
            createdAt: (data as any).createdAt?.toDate?.() || new Date(),
            updatedAt: (data as any).updatedAt?.toDate?.() || new Date(),
          } as User);
        });
        callback(users);
      },
      (err) => {
        console.error('Users subscription error:', err);
        callback([]);
      }
    );
  }

  // Get active officers
  async getActiveOfficers(): Promise<User[]> {
    try {
      const qy = query(
        collection(db, 'users'),
        where('role', '==', 'officer'),
        where('status', '==', 'active')
      );
      const snap = await getDocs(qy);
      const officers: User[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        officers.push({
          id: docSnap.id,
          ...data,
          createdAt: (data as any).createdAt?.toDate?.() || new Date(),
          updatedAt: (data as any).updatedAt?.toDate?.() || new Date(),
        } as User);
      });
      return officers;
    } catch (error) {
      console.error('Error fetching active officers:', error);
      return [];
    }
  }

  // Assign a report to an officer
  async assignReportToOfficer(reportId: string, officerUid: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assignedTo: officerUid,
        status: 'assigned',
        assignmentStatus: 'pending',
        updatedAt: serverTimestamp(),
      } as any);
    } catch (error) {
      console.error('Error assigning report:', error);
      throw new Error('Failed to assign report');
    }
  }

  // Update report priority
  async updateReportPriority(reportId: string, priority: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        priority,
        updatedAt: serverTimestamp(),
      } as any);
    } catch (error) {
      console.error('Error updating report priority:', error);
      throw new Error('Failed to update report priority');
    }
  }

  // Fetch assigned officer's Expo push token (from police app storage)
  async getOfficerPushToken(officerUid: string): Promise<string | null> {
    try {
      const ref = doc(db, 'officers', officerUid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data: any = snap.data();
        return typeof data?.pushToken === 'string' ? data.pushToken : null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching officer push token:', error);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();
export default firebaseService;
