/**
 * IRF Service
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation
 * 
 * Service for managing IRF templates, generation, and Firebase Storage integration.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { 
  IRFTemplate, 
  IRFData, 
  EnhancedCCRSReport 
} from '../../../shared-types/sprint2-interfaces';
import type { CCRSReport } from '../../../shared-types/rbac';
import type {
  IRFTrackingData,
  IRFHistoryEntry
} from '../../../shared-utils/irfTracker';
import {
  createIRFTracking,
  addIRFHistoryEntry,
  markIRFGenerated,
  markPDFUploaded,
  trackPDFDownload,
  generateIRFSummary
} from '../../../shared-utils/irfTracker';

export class IRFService {
  /**
   * Get the active IRF template
   * @returns Promise<IRFTemplate | null>
   */
  static async getActiveTemplate(): Promise<IRFTemplate | null> {
    try {
      const templatesRef = collection(db, 'irfTemplates');
      const q = query(templatesRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.warn('No active IRF template found');
        return null;
      }
      
      const templateDoc = snapshot.docs[0];
      return {
        id: templateDoc.id,
        ...templateDoc.data()
      } as IRFTemplate;
      
    } catch (error) {
      console.error('Error getting active IRF template:', error);
      throw new Error('Failed to load IRF template');
    }
  }

  /**
   * Get all IRF templates
   * @returns Promise<IRFTemplate[]>
   */
  static async getAllTemplates(): Promise<IRFTemplate[]> {
    try {
      const templatesRef = collection(db, 'irfTemplates');
      const snapshot = await getDocs(templatesRef);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as IRFTemplate));
      
    } catch (error) {
      console.error('Error getting IRF templates:', error);
      throw new Error('Failed to load IRF templates');
    }
  }

  /**
   * Save IRF data to Firestore
   * @param irfData - IRF data to save
   * @returns Promise<void>
   */
  static async saveIRFData(irfData: IRFData): Promise<void> {
    try {
      const irfRef = doc(db, 'irfData', `${irfData.reportId}-${irfData.templateId}`);
      await setDoc(irfRef, irfData);
      
    } catch (error) {
      console.error('Error saving IRF data:', error);
      throw new Error('Failed to save IRF data');
    }
  }

  /**
   * Upload PDF to Firebase Storage
   * @param pdfBlob - PDF blob to upload
   * @param filename - Filename for the PDF
   * @param reportId - Report ID for organization
   * @returns Promise<string> - Download URL
   */
  static async uploadPDF(
    pdfBlob: Blob, 
    filename: string, 
    reportId: string
  ): Promise<string> {
    try {
      // Create storage path: irf-pdfs/YYYY/MM/reportId/filename
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const storagePath = `irf-pdfs/${year}/${month}/${reportId}/${filename}`;
      
      const storageRef = ref(storage, storagePath);
      
      // Upload the PDF
      const uploadResult = await uploadBytes(storageRef, pdfBlob, {
        contentType: 'application/pdf',
        customMetadata: {
          reportId: reportId,
          uploadedAt: new Date().toISOString(),
          fileType: 'irf-pdf'
        }
      });
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading PDF:', error);
      throw new Error('Failed to upload PDF to storage');
    }
  }

  /**
   * Update report with IRF tracking information
   * @param reportId - Report ID to update
   * @param irfData - IRF data for tracking
   * @param pdfUrl - PDF download URL
   * @returns Promise<void>
   */
  static async updateReportWithIRF(
    reportId: string, 
    irfData: IRFData, 
    pdfUrl: string
  ): Promise<void> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      
      const updateData = {
        irfGenerated: true,
        irfData: {
          templateId: irfData.templateId,
          templateVersion: irfData.templateVersion,
          generatedBy: irfData.generatedBy,
          generatedAt: irfData.generatedAt,
          isFinalized: irfData.isFinalized,
          irfEntryNumber: irfData.irfEntryNumber
        },
        irfPdfUrl: pdfUrl,
        irfPdfFilename: irfData.pdfFilename,
        updatedAt: Timestamp.now()
      };

      await updateDoc(reportRef, updateData);
      
    } catch (error) {
      console.error('Error updating report with IRF data:', error);
      throw new Error('Failed to update report with IRF information');
    }
  }

  /**
   * Get IRF data for a report
   * @param reportId - Report ID
   * @returns Promise<IRFData | null>
   */
  static async getIRFData(reportId: string): Promise<IRFData | null> {
    try {
      // Try to find IRF data by report ID
      const irfDataRef = collection(db, 'irfData');
      const q = query(irfDataRef, where('reportId', '==', reportId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const irfDoc = snapshot.docs[0];
      return {
        ...irfDoc.data()
      } as IRFData;
      
    } catch (error) {
      console.error('Error getting IRF data:', error);
      return null;
    }
  }

  /**
   * Check if report has IRF generated
   * @param reportId - Report ID to check
   * @returns Promise<boolean>
   */
  static async hasIRFGenerated(reportId: string): Promise<boolean> {
    try {
      const reportRef = doc(db, 'reports', reportId);
      const reportDoc = await getDoc(reportRef);
      
      if (!reportDoc.exists()) {
        return false;
      }
      
      const reportData = reportDoc.data();
      return Boolean(reportData.irfGenerated);
      
    } catch (error) {
      console.error('Error checking IRF status:', error);
      return false;
    }
  }

  /**
   * Delete IRF PDF from storage
   * @param pdfUrl - PDF download URL to delete
   * @returns Promise<void>
   */
  static async deletePDF(pdfUrl: string): Promise<void> {
    try {
      const storageRef = ref(storage, pdfUrl);
      await deleteObject(storageRef);
      
    } catch (error) {
      console.error('Error deleting PDF:', error);
      throw new Error('Failed to delete PDF from storage');
    }
  }

  /**
   * Complete IRF generation workflow with comprehensive tracking
   * @param report - Report data
   * @param irfData - Generated IRF data
   * @param pdfBlob - Generated PDF blob
   * @param officerId - Officer completing the generation
   * @param officerName - Officer name for tracking
   * @param generationStartTime - When generation started
   * @returns Promise<{ pdfUrl: string; success: boolean; trackingData: IRFTrackingData }>
   */
  static async completeIRFGeneration(
    report: CCRSReport | EnhancedCCRSReport,
    irfData: IRFData,
    pdfBlob: Blob,
    officerId?: string,
    officerName?: string,
    generationStartTime?: Date
  ): Promise<{ pdfUrl: string; success: boolean; trackingData: IRFTrackingData }> {
    try {
      // 1. Get or create tracking data
      let tracking = await this.getIRFTracking(report.id);
      if (!tracking) {
        tracking = createIRFTracking(report.id, officerId || irfData.generatedBy);
      }

      // 2. Upload PDF to Firebase Storage
      const pdfUrl = await this.uploadPDF(
        pdfBlob, 
        irfData.pdfFilename || `IRF_${report.id}.pdf`, 
        report.id
      );
      
      // 3. Update tracking with generation completion
      tracking = markIRFGenerated(
        tracking,
        irfData,
        officerId || irfData.generatedBy,
        officerName,
        generationStartTime
      );

      // 4. Update tracking with PDF upload
      tracking = markPDFUploaded(
        tracking,
        pdfUrl,
        irfData.pdfFilename || `IRF_${report.id}.pdf`,
        pdfBlob.size,
        officerId || irfData.generatedBy,
        officerName
      );
      
      // 5. Save complete IRF data to Firestore
      const completeIRFData = {
        ...irfData,
        pdfUrl: pdfUrl
      };
      await this.saveIRFData(completeIRFData);
      
      // 6. Save tracking data
      await this.saveIRFTracking(tracking);
      
      // 7. Update report with IRF tracking
      await this.updateReportWithIRF(report.id, completeIRFData, pdfUrl);
      
      return { pdfUrl, success: true, trackingData: tracking };
      
    } catch (error) {
      console.error('Error completing IRF generation:', error);
      throw error;
    }
  }

  /**
   * Get IRF generation statistics
   * @returns Promise<object> - Statistics about IRF generation
   */
  static async getIRFStatistics(): Promise<{
    totalGenerated: number;
    generatedToday: number;
    generatedThisWeek: number;
    generatedThisMonth: number;
  }> {
    try {
      const irfDataRef = collection(db, 'irfData');
      const snapshot = await getDocs(irfDataRef);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let totalGenerated = 0;
      let generatedToday = 0;
      let generatedThisWeek = 0;
      let generatedThisMonth = 0;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const generatedAt = data.generatedAt?.toDate();
        
        if (generatedAt) {
          totalGenerated++;
          
          if (generatedAt >= today) {
            generatedToday++;
          }
          
          if (generatedAt >= weekAgo) {
            generatedThisWeek++;
          }
          
          if (generatedAt >= monthAgo) {
            generatedThisMonth++;
          }
        }
      });
      
      return {
        totalGenerated,
        generatedToday,
        generatedThisWeek,
        generatedThisMonth
      };
      
    } catch (error) {
      console.error('Error getting IRF statistics:', error);
      return {
        totalGenerated: 0,
        generatedToday: 0,
        generatedThisWeek: 0,
        generatedThisMonth: 0
      };
    }
  }

  /**
   * Save IRF tracking data to Firestore
   * @param trackingData - IRF tracking data to save
   * @returns Promise<void>
   */
  static async saveIRFTracking(trackingData: IRFTrackingData): Promise<void> {
    try {
      const trackingRef = doc(db, 'irfTracking', trackingData.reportId);
      await setDoc(trackingRef, trackingData);
      
    } catch (error) {
      console.error('Error saving IRF tracking data:', error);
      throw new Error('Failed to save IRF tracking data');
    }
  }

  /**
   * Get IRF tracking data for a report
   * @param reportId - Report ID
   * @returns Promise<IRFTrackingData | null>
   */
  static async getIRFTracking(reportId: string): Promise<IRFTrackingData | null> {
    try {
      const trackingRef = doc(db, 'irfTracking', reportId);
      const trackingDoc = await getDoc(trackingRef);
      
      if (!trackingDoc.exists()) {
        return null;
      }
      
      return {
        ...trackingDoc.data()
      } as IRFTrackingData;
      
    } catch (error) {
      console.error('Error getting IRF tracking data:', error);
      return null;
    }
  }

  /**
   * Track PDF download activity
   * @param reportId - Report ID
   * @param officerId - Officer who downloaded
   * @param officerName - Officer name
   * @param downloadType - Type of download
   * @returns Promise<void>
   */
  static async trackDownload(
    reportId: string,
    officerId: string,
    officerName?: string,
    downloadType: 'view' | 'download' | 'print' = 'download'
  ): Promise<void> {
    try {
      const tracking = await this.getIRFTracking(reportId);
      if (!tracking) {
        console.warn('No IRF tracking data found for report:', reportId);
        return;
      }

      const updatedTracking = trackPDFDownload(tracking, officerId, officerName, downloadType);
      await this.saveIRFTracking(updatedTracking);
      
    } catch (error) {
      console.error('Error tracking PDF download:', error);
    }
  }

  /**
   * Get IRF summary and status for a report
   * @param reportId - Report ID
   * @returns Promise<object | null>
   */
  static async getIRFSummary(reportId: string): Promise<{
    status: 'pending' | 'generated' | 'finalized' | 'complete';
    summary: string;
    details: Record<string, any>;
    recommendations: string[];
  } | null> {
    try {
      const tracking = await this.getIRFTracking(reportId);
      if (!tracking) {
        return {
          status: 'pending',
          summary: 'IRF generation not yet started',
          details: {},
          recommendations: ['Initiate IRF generation process']
        };
      }

      return generateIRFSummary(tracking);
      
    } catch (error) {
      console.error('Error getting IRF summary:', error);
      return null;
    }
  }

  /**
   * Get recent IRF activity across all reports
   * @param limit - Number of recent entries to return
   * @returns Promise<IRFHistoryEntry[]>
   */
  static async getRecentIRFActivity(limit: number = 10): Promise<{
    reportId: string;
    activity: IRFHistoryEntry;
  }[]> {
    try {
      const trackingRef = collection(db, 'irfTracking');
      const snapshot = await getDocs(trackingRef);
      
      const allActivity: { reportId: string; activity: IRFHistoryEntry }[] = [];
      
      snapshot.docs.forEach(doc => {
        const tracking = doc.data() as IRFTrackingData;
        tracking.history.forEach(activity => {
          allActivity.push({
            reportId: tracking.reportId,
            activity
          });
        });
      });
      
      // Sort by timestamp and limit
      return allActivity
        .sort((a, b) => b.activity.timestamp.toMillis() - a.activity.timestamp.toMillis())
        .slice(0, limit);
      
    } catch (error) {
      console.error('Error getting recent IRF activity:', error);
      return [];
    }
  }

  /**
   * Get comprehensive IRF statistics with tracking data
   * @returns Promise<object> - Enhanced statistics
   */
  static async getEnhancedIRFStatistics(): Promise<{
    totalGenerated: number;
    generatedToday: number;
    generatedThisWeek: number;
    generatedThisMonth: number;
    averageGenerationTime: number; // minutes
    totalEdits: number;
    totalDownloads: number;
    statusBreakdown: Record<string, number>;
    recentActivity: { reportId: string; activity: IRFHistoryEntry }[];
  }> {
    try {
      const trackingRef = collection(db, 'irfTracking');
      const snapshot = await getDocs(trackingRef);
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      let totalGenerated = 0;
      let generatedToday = 0;
      let generatedThisWeek = 0;
      let generatedThisMonth = 0;
      let totalGenerationTime = 0;
      let totalEdits = 0;
      let totalDownloads = 0;
      const statusBreakdown: Record<string, number> = {
        pending: 0,
        generated: 0,
        finalized: 0,
        complete: 0
      };
      
      snapshot.docs.forEach(doc => {
        const tracking = doc.data() as IRFTrackingData;
        const summary = generateIRFSummary(tracking);
        
        statusBreakdown[summary.status]++;
        totalEdits += tracking.editCount;
        totalDownloads += tracking.downloadCount;
        
        if (tracking.isGenerated && tracking.generatedAt) {
          totalGenerated++;
          const generatedAt = tracking.generatedAt.toDate();
          
          if (generatedAt >= today) {
            generatedToday++;
          }
          
          if (generatedAt >= weekAgo) {
            generatedThisWeek++;
          }
          
          if (generatedAt >= monthAgo) {
            generatedThisMonth++;
          }
          
          if (tracking.generationDuration) {
            totalGenerationTime += tracking.generationDuration;
          }
        }
      });
      
      const averageGenerationTime = totalGenerated > 0 
        ? (totalGenerationTime / totalGenerated) / (1000 * 60) // Convert to minutes
        : 0;
      
      const recentActivity = await this.getRecentIRFActivity(5);
      
      return {
        totalGenerated,
        generatedToday,
        generatedThisWeek,
        generatedThisMonth,
        averageGenerationTime,
        totalEdits,
        totalDownloads,
        statusBreakdown,
        recentActivity
      };
      
    } catch (error) {
      console.error('Error getting enhanced IRF statistics:', error);
      return {
        totalGenerated: 0,
        generatedToday: 0,
        generatedThisWeek: 0,
        generatedThisMonth: 0,
        averageGenerationTime: 0,
        totalEdits: 0,
        totalDownloads: 0,
        statusBreakdown: { pending: 0, generated: 0, finalized: 0, complete: 0 },
        recentActivity: []
      };
    }
  }
}
