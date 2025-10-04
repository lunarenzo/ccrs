import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logAudit } from './auditService';

export interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: {
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  status: 'pending' | 'unassigned' | 'assigned' | 'accepted' | 'responding' | 'resolved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string; // Officer UID
  assignmentStatus?: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  citizenId: string;
  officerNotes?: Array<{
    note: string;
    author: string;
    timestamp: Timestamp;
  }>;
  resolutionNotes?: string;
}
 
// Officer analytics metrics
export interface OfficerMetrics {
  officerUid: string;
  periodDays: number;
  assignedLast30: number;
  openCount: number;
  resolvedCount: number;
  averageResolutionHours: number | null;
  dailyAssignedLast7: Array<{ label: string; count: number }>;
}
class FirestoreService {
  /**
   * Normalize a raw Firestore report document into the UI `Report` shape,
   * handling backward compatibility for location and timestamps.
   */
  private normalizeReport(id: string, data: any): Report {
    // Title fallback
    const title: string = data.title || `${data.category || 'Report'}`;

    // Location normalization
    let addressStr: string | undefined;
    let coords: { latitude: number; longitude: number } | undefined;

    const loc = data.location;
    if (loc) {
      // Address: string or composed from object
      if (typeof loc.address === 'string') addressStr = loc.address;
      else if (loc.address && typeof loc.address === 'object') {
        addressStr = loc.address.formattedAddress || [
          loc.address.street,
          loc.address.district,
          loc.address.city,
          loc.address.region,
          loc.address.postalCode,
          loc.address.country,
        ].filter(Boolean).join(', ');
      }

      // Coordinates: new shape (coordinates) or legacy (latitude/longitude at root)
      const c = loc.coordinates;
      if (c && typeof c.latitude === 'number' && typeof c.longitude === 'number') {
        coords = { latitude: c.latitude, longitude: c.longitude };
      } else if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        coords = { latitude: loc.latitude, longitude: loc.longitude };
      }
    }

    // Timestamps: prefer `timestamp` (created) then fallback to `createdAt`
    const createdRaw: any = data.timestamp ?? data.createdAt ?? Timestamp.now();
    const updatedRaw: any = data.updatedAt ?? data.timestamp ?? createdRaw;

    const toTs = (v: any): Timestamp => (v && typeof v.toDate === 'function')
      ? v as Timestamp
      : Timestamp.fromDate(new Date(v));

    const createdAt: Timestamp = toTs(createdRaw);
    const updatedAt: Timestamp = toTs(updatedRaw);

    // Status/priority defaults
    const status = (data.status as Report['status']) || 'pending';
    const priority = (data.priority as Report['priority']) || 'medium';

    // Citizen id mapping
    const citizenId: string = data.citizenId || data.user_id || '';

    const normalized: Report = {
      id,
      title,
      description: data.description || '',
      category: data.category || 'other',
      location: (coords || addressStr) ? { coordinates: coords, address: addressStr } : undefined,
      status,
      priority,
      assignedTo: data.assignedTo,
      assignmentStatus: data.assignmentStatus,
      createdAt,
      updatedAt,
      citizenId,
      officerNotes: data.officerNotes,
      resolutionNotes: data.resolutionNotes,
    };

    return normalized;
  }
  // Get reports assigned to specific officer
  async getAssignedReports(officerUid: string): Promise<Report[]> {
    try {
      const reportsRef = collection(db, 'reports');
      const q = query(
        reportsRef, 
        where('assignedTo', '==', officerUid),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports: Report[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push(this.normalizeReport(doc.id, data));
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching assigned reports:', error);
      throw error;
    }
  } 

  // Supervisor: list officers (basic info)
  async listOfficers(): Promise<Array<{ uid: string; email: string; displayName?: string }>> {
    const usersRef = collection(db, 'users');
    const qy = query(usersRef, where('role', '==', 'officer'));
    const snap = await getDocs(qy);
    return snap.docs.map((d) => {
      const data: any = d.data();
      return { uid: d.id, email: data.email || '', displayName: data.displayName };
    });
  }

  // Supervisor: reassign case to a different officer
  async reassignReport(reportId: string, newOfficerUid: string, supervisorUid: string): Promise<void> {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      assignedTo: newOfficerUid,
      assignmentStatus: 'pending',
      status: 'assigned',
      updatedAt: Timestamp.now(),
    });
    await logAudit('supervisor_reassign', { reportId, details: { newOfficerUid, supervisorUid } });
  }

  // Supervisor: approve case closure (mark reviewed)
  async approveClosure(reportId: string, supervisorUid: string): Promise<void> {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      closureApproved: true,
      closureReviewedAt: Timestamp.now(),
      closureReviewer: supervisorUid,
      updatedAt: Timestamp.now(),
    } as any);
    await logAudit('closure_approve', { reportId, details: { supervisorUid } });
  }

  // Supervisor: reject case closure and return to responding
  async rejectClosure(reportId: string, reason: string, supervisorUid: string): Promise<void> {
    const reportRef = doc(db, 'reports', reportId);
    await updateDoc(reportRef, {
      closureApproved: false,
      closureReviewedAt: Timestamp.now(),
      closureReviewer: supervisorUid,
      closureRejectionReason: reason,
      status: 'responding',
      updatedAt: Timestamp.now(),
    } as any);
    await logAudit('closure_reject', { reportId, details: { supervisorUid, reason } });
  }
  // Get single report by ID
  async getReport(reportId: string): Promise<Report | null> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        const data = reportSnap.data();
        return this.normalizeReport(reportSnap.id, data);
      }
      return null;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  // Update report status
  async updateReportStatus(reportId: string, status: Report['status'], notes?: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const updateData: any = {
        status,
        updatedAt: Timestamp.now()
      };

      if (notes) {
        updateData.resolutionNotes = notes;
      }

      await updateDoc(reportRef, updateData);
      await logAudit('report_status_update', {
        reportId,
        details: { newStatus: status, hasNotes: !!notes }
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }

  // Accept assignment
  async acceptAssignment(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assignmentStatus: 'accepted',
        status: 'accepted',
        updatedAt: Timestamp.now()
      });
      await logAudit('assignment_accept', { reportId });
    } catch (error) {
      console.error('Error accepting assignment:', error);
      throw error;
    }
  }

  // Decline assignment
  async declineAssignment(reportId: string, reason: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      await updateDoc(reportRef, {
        assignmentStatus: 'declined',
        status: 'unassigned',
        assignedTo: null,
        declineReason: reason,
        updatedAt: Timestamp.now()
      });
      await logAudit('assignment_decline', { reportId, details: { reason } });
    } catch (error) {
      console.error('Error declining assignment:', error);
      throw error;
    }
  }

  // Add officer note to report
  async addOfficerNote(reportId: string, note: string, authorUid: string): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const report = await getDoc(reportRef);
      
      if (report.exists()) {
        const currentNotes = report.data().officerNotes || [];
        const newNote = {
          note,
          author: authorUid,
          timestamp: Timestamp.now()
        };
        
        await updateDoc(reportRef, {
          officerNotes: [...currentNotes, newNote],
          updatedAt: Timestamp.now()
        });
        await logAudit('officer_note_add', { reportId, details: { authorUid, length: note.length } });
      }
    } catch (error) {
      console.error('Error adding officer note:', error);
      throw error;
    }
  }

  // Listen to real-time updates for assigned reports
  subscribeToAssignedReports(officerUid: string, callback: (reports: Report[]) => void) {
    const reportsRef = collection(db, 'reports');
    const q = query(
      reportsRef, 
      where('assignedTo', '==', officerUid),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const reports: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push(this.normalizeReport(doc.id, data));
      });
      callback(reports);
    });
  }

  // Get officer push token
  async getOfficerPushToken(officerUid: string): Promise<string | null> {
    try {
      const officerRef = doc(db, 'officers', officerUid);
      const officerSnap = await getDoc(officerRef);
      
      if (officerSnap.exists()) {
        const data = officerSnap.data();
        return data.pushToken || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting officer push token:', error);
      throw error;
    }
  }

  // Store/update Expo push token for officer
  async storePushToken(officerUid: string, token: string): Promise<void> {
    const officerRef = doc(db, 'officers', officerUid);
    await setDoc(
      officerRef,
      { pushToken: token, lastTokenUpdate: Timestamp.now() },
      { merge: true } as any
    );
  }

  // Clear Expo push token for officer (e.g., on logout)
  async clearPushToken(officerUid: string): Promise<void> {
    const officerRef = doc(db, 'officers', officerUid);
    await setDoc(
      officerRef,
      { pushToken: null, lastTokenUpdate: Timestamp.now() },
      { merge: true } as any
    );
  }

  // Compute officer analytics metrics (client-side aggregation for Free Tier)
  async getOfficerMetrics(officerUid: string): Promise<OfficerMetrics> {
    const reportsRef = collection(db, 'reports');
    const qy = query(reportsRef, where('assignedTo', '==', officerUid));
    const snap = await getDocs(qy);

    const now = new Date();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days7: Date[] = [];
    for (let i = 6; i >= 0; i--) {
      days7.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
    }

    let assignedLast30 = 0;
    let openCount = 0;
    let resolvedCount = 0;
    let resolutionDurationsMs: number[] = [];
    const dailyMap = new Map<string, number>();
    for (const d of days7) {
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const docSnap of snap.docs) {
      const data: any = docSnap.data();
      const createdAt: Date = data.timestamp?.toDate
        ? data.timestamp.toDate()
        : (data.timestamp ? new Date(data.timestamp) : (data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date())));
      if (createdAt >= days30Ago) assignedLast30++;

      const status: string = data.status;
      if (status === 'resolved') {
        resolvedCount++;
        const endAt: Date = data.closureReviewedAt?.toDate
          ? data.closureReviewedAt.toDate()
          : (data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date());
        const dur = endAt.getTime() - createdAt.getTime();
        if (dur > 0) resolutionDurationsMs.push(dur);
      } else if (status === 'assigned' || status === 'accepted' || status === 'responding') {
        openCount++;
      }

      // Daily assigned trend (by createdAt date)
      const key = createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }

    const averageResolutionHours = resolutionDurationsMs.length
      ? Math.round((resolutionDurationsMs.reduce((a, b) => a + b, 0) / resolutionDurationsMs.length) / (1000 * 60 * 60) * 10) / 10
      : null;

    const dailyAssignedLast7 = Array.from(dailyMap.entries()).map(([k, v]) => ({
      label: k.slice(5), // MM-DD
      count: v,
    }));

    return {
      officerUid,
      periodDays: 30,
      assignedLast30,
      openCount,
      resolvedCount,
      averageResolutionHours,
      dailyAssignedLast7,
    };
  }
}

export const firestoreService = new FirestoreService();
export default firestoreService;
