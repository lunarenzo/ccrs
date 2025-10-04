import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report, User, ReportStatus, MainCategory } from '../types';

export interface FirebaseReport extends Omit<Report, 'id' | 'timestamp'> {
  timestamp: Timestamp;
}

export interface FirebaseUser extends Omit<User, 'id' | 'createdAt'> {
  createdAt: Timestamp;
}

class FirebaseService {
  // Report Services
  async createReport(reportData: Omit<Report, 'id' | 'timestamp'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...reportData,
        timestamp: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating report:', error);
      throw new Error('Failed to create report');
    }
  }

  async getReports(userId?: string): Promise<Report[]> {
    try {
      let q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      
      if (userId) {
        q = query(collection(db, 'reports'), where('user_id', '==', userId), orderBy('timestamp', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate().toISOString(),
      })) as Report[];
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw new Error('Failed to fetch reports');
    }
  }

  async getReportById(reportId: string): Promise<Report | null> {
    try {
      const docRef = doc(db, 'reports', reportId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          timestamp: docSnap.data().timestamp.toDate().toISOString(),
        } as Report;
      }
      return null;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw new Error('Failed to fetch report');
    }
  }

  async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, { status });
    } catch (error) {
      console.error('Error updating report status:', error);
      throw new Error('Failed to update report status');
    }
  }

  async deleteReport(reportId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'reports', reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error('Failed to delete report');
    }
  }

  // Real-time report subscription
  subscribeToReports(
    callback: (reports: Report[]) => void,
    userId?: string
  ): () => void {
    let q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    
    if (userId) {
      q = query(collection(db, 'reports'), where('user_id', '==', userId), orderBy('timestamp', 'desc'));
    }

    return onSnapshot(q, (querySnapshot) => {
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate().toISOString(),
      })) as Report[];
      callback(reports);
    });
  }

  // User Services
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'users'), {
        ...userData,
        createdAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt.toDate().toISOString(),
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt.toDate().toISOString(),
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const { id, createdAt, ...updateData } = userData;
      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Note: Media upload/delete methods removed since user is using Cloudinary
  // The media_urls in reports should contain Cloudinary URLs directly

  // Statistics Services
  async getReportStats(): Promise<{
    totalReports: number;
    pendingReports: number;
    resolvedReports: number;
    categoryStats: Record<MainCategory, number>;
  }> {
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      const reports = querySnapshot.docs.map(doc => doc.data()) as FirebaseReport[];

      const totalReports = reports.length;
      const pendingReports = reports.filter(r => r.status === 'pending').length;
      const resolvedReports = reports.filter(r => r.status === 'resolved').length;

      const categoryStats: Record<MainCategory, number> = {
        crime: 0,
        child_abuse: 0,
        women_abuse: 0,
        other: 0,
      };

      reports.forEach(report => {
        if (report.mainCategory && categoryStats.hasOwnProperty(report.mainCategory)) {
          categoryStats[report.mainCategory]++;
        }
      });

      return {
        totalReports,
        pendingReports,
        resolvedReports,
        categoryStats,
      };
    } catch (error) {
      console.error('Error fetching report stats:', error);
      throw new Error('Failed to fetch report statistics');
    }
  }
}

export const firebaseService = new FirebaseService();
export default firebaseService;
