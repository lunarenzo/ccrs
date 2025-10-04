import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Report } from '../types';
import { ReportFormData } from '../utils/validation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Backward-compat note (write-path only)
 * This service now maps citizen submissions to the canonical Firestore schema defined in PRD 6.
 * Specifically, it writes `location` as:
 *   { coordinates: { latitude: number; longitude: number }, address?: string, accuracy?: number }
 * and avoids setting officer-only fields. Read paths are not changed here and will be handled in a
 * follow-up task to prefer `location.coordinates` when present.
 */

// Canonical Firestore create payload (subset used on citizen create)
export interface ReportCreatePayload {
  user_id: string;
  mainCategory?: string;
  category: string;
  description: string;
  media_urls?: string[];
  location?: {
    coordinates?: { latitude: number; longitude: number };
    address?: string;
    accuracy?: number;
  } | null;
  status: 'pending';
  timestamp: Timestamp;
  updatedAt: Timestamp;
  submission_type: 'anonymous' | 'authenticated';
  media_count?: number;
  has_location?: boolean;
  isEmergency?: boolean;
}

export interface ReportSubmissionResult {
  success: boolean;
  reportId?: string;
  error?: {
    code: 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'PERMISSION_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    userMessage: string;
  };
}

export class ReportService {
  private static readonly COLLECTION_NAME = 'reports';

  /**
   * Transforms canonical Firestore data back to client Report format.
   * - Converts location.coordinates back to location.latitude/longitude
   * - Handles backward compatibility with both old and new formats
   */
  private static transformFirestoreToClient(data: any): Report {
    const result: any = { ...data };

    // Transform location from canonical format to client format
    if (data.location) {
      if (data.location.coordinates) {
        // New canonical format: { coordinates: { lat, lng }, address?, accuracy? }
        result.location = {
          latitude: data.location.coordinates.latitude,
          longitude: data.location.coordinates.longitude,
          accuracy: data.location.accuracy,
          address: data.location.address ? { formattedAddress: data.location.address } : undefined
        };
      } else if (data.location.latitude !== undefined && data.location.longitude !== undefined) {
        // Old format: { latitude, longitude, address?, accuracy? } - keep as is
        result.location = data.location;
      }
    }

    return result as Report;
  }

  /**
   * Maps form data to the canonical Firestore payload.
   * - Transforms location { latitude, longitude, address?: object, accuracy? }
   *   into { coordinates: { latitude, longitude }, address?: string, accuracy? }.
   * - Composes address string from formattedAddress or parts if available.
   * - Ensures only allowed fields are present for citizen create.
   */
  private static mapToCanonicalPayload(
    reportData: ReportFormData,
    finalUserId: string,
    isAnonymous: boolean
  ): ReportCreatePayload {
    // Derive location in canonical shape
    let mappedLocation: ReportCreatePayload['location'] = null;
    if (reportData.location) {
      const { latitude, longitude, accuracy, address } = reportData.location as any;
      const addressString: string | undefined =
        address?.formattedAddress ??
        [address?.street, address?.district, address?.city, address?.region, address?.postalCode, address?.country]
          .filter(Boolean)
          .join(', ');

      mappedLocation = {
        coordinates: typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : undefined,
        accuracy: typeof accuracy === 'number' ? accuracy : undefined,
        address: addressString || undefined
      };
    }

    const mediaUrls = (reportData as any).mediaUrls || [];

    const payload: ReportCreatePayload = {
      user_id: finalUserId,
      mainCategory: reportData.mainCategory,
      category: reportData.category,
      description: reportData.description.trim(),
      ...(mappedLocation ? { location: mappedLocation } : {}),
      media_urls: mediaUrls,
      status: 'pending',
      timestamp: Timestamp.now(),
      updatedAt: Timestamp.now(),
      submission_type: isAnonymous ? 'anonymous' : 'authenticated',
      media_count: mediaUrls.length,
      has_location: !!reportData.location,
      isEmergency: reportData.isEmergency
    };

    return payload;
  }

  static async generateAnonymousUserId(): Promise<string> {
    try {
      let anonymousUserId = await AsyncStorage.getItem('anonymousUserId');
      if (!anonymousUserId) {
        anonymousUserId = `anon_${uuidv4()}`;
        await AsyncStorage.setItem('anonymousUserId', anonymousUserId);
      }
      return anonymousUserId;
    } catch (error) {
      console.error('Error generating anonymous user ID:', error);
      return `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  static async submitReport(
    reportData: ReportFormData, 
    userId?: string | null,
    isAnonymous: boolean = false
  ): Promise<ReportSubmissionResult> {
    try {
      // Validate required fields
      if (!reportData.description?.trim()) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Description is required',
            userMessage: 'Please provide a description of the incident.'
          }
        };
      }

      // Handle anonymous user ID
      let finalUserId = userId;
      if (isAnonymous || !userId) {
        finalUserId = await this.generateAnonymousUserId();
      }

      // Prepare canonical report data
      const report = this.mapToCanonicalPayload(reportData, finalUserId!, isAnonymous);

      console.log('Submitting report:', {
        category: report.category,
        hasLocation: report.has_location,
        mediaCount: report.media_count,
        submissionType: report.submission_type
      });

      // Debug: full canonical payload shape
      console.log('Submitting canonical payload:', report);

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), report);
      
      return {
        success: true,
        reportId: docRef.id
      };
    } catch (error: any) {
      console.error('Error submitting report:', error);
      
      let errorResult: ReportSubmissionResult['error'];
      
      if (error.code === 'permission-denied') {
        errorResult = {
          code: 'PERMISSION_ERROR',
          message: 'Permission denied to submit report',
          userMessage: 'You do not have permission to submit reports. Please check your account status.'
        };
      } else if (error.code === 'unavailable' || error.message?.includes('network')) {
        errorResult = {
          code: 'NETWORK_ERROR',
          message: 'Network error during submission',
          userMessage: 'Network error. Please check your internet connection and try again.'
        };
      } else {
        errorResult = {
          code: 'UNKNOWN_ERROR',
          message: error.message || 'Unknown error occurred',
          userMessage: 'An unexpected error occurred. Please try again later.'
        };
      }
      
      return {
        success: false,
        error: errorResult
      };
    }
  }

  static async getUserReports(userId: string): Promise<Report[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const reports: Report[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const transformedData = this.transformFirestoreToClient({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
          updatedAt: data.updatedAt.toDate()
        });
        reports.push(transformedData);
      });

      return reports;
    } catch (error) {
      console.error('Error fetching user reports:', error);
      throw new Error('Failed to fetch reports');
    }
  }

  static async getAnonymousReports(): Promise<Report[]> {
    try {
      const anonymousUserId = await AsyncStorage.getItem('anonymousUserId');
      if (!anonymousUserId) {
        return [];
      }

      return this.getUserReports(anonymousUserId);
    } catch (error) {
      console.error('Error fetching anonymous reports:', error);
      return [];
    }
  }

  static async getReportById(reportId: string): Promise<Report | null> {
    try {
      const docRef = collection(db, this.COLLECTION_NAME);
      const q = query(docRef, where('__name__', '==', reportId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return this.transformFirestoreToClient({
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
        updatedAt: data.updatedAt.toDate()
      });
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      return null;
    }
  }

  static subscribeToUserReports(
    userId: string, 
    callback: (reports: Report[]) => void
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('user_id', '==', userId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const reports: Report[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const transformedData = this.transformFirestoreToClient({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
          updatedAt: data.updatedAt.toDate()
        });
        reports.push(transformedData);
      });
      callback(reports);
    });
  }

  static async subscribeToAnonymousReports(
    callback: (reports: Report[]) => void
  ): Promise<(() => void) | null> {
    try {
      const anonymousUserId = await AsyncStorage.getItem('anonymousUserId');
      if (!anonymousUserId) {
        callback([]);
        return null;
      }
      return this.subscribeToUserReports(anonymousUserId, callback);
    } catch {
      callback([]);
      return null;
    }
  }
}
