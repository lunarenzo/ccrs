/**
 * IRF Generation Service
 * Sprint 2: Investigation & Approval Workflows
 * 
 * Client-side PDF generation for PNP-compliant Incident Record Forms
 * Uses pdfmake library to maintain Firebase Free Tier compliance
 */

// Remove jsPDF import - using pdfmake instead via pdfGenerator utility
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  Timestamp,
  runTransaction 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase'; // Adjust import path
import { generateIRFPDFBlob } from '../../shared-utils/pdfGenerator';
import { 
  IRFTemplate, 
  IRFData, 
  IRFGenerationResponse, 
  EnhancedCCRSReport 
} from '../../shared-types/sprint2-interfaces';
import irfTemplateData from '../../shared-data/irf-template.json';

export interface IRFGenerationOptions {
  reportId: string;
  officerId: string;
  officerName: string;
  customFields?: Record<string, any>;
  generatePDF?: boolean;
  saveToPDF?: boolean;
}

export interface PopulatedIRFData {
  [key: string]: any;
  templateId: string;
  templateVersion: string;
  reportId: string;
  generatedBy: string;
  generatedAt: Timestamp;
  isFinalized: boolean;
}

export class IRFGenerationService {
  /**
   * Generate IRF data from a report with auto-population
   */
  static async generateIRFData(options: IRFGenerationOptions): Promise<IRFGenerationResponse> {
    try {
      // Get the report data
      const reportRef = doc(db, 'reports', options.reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (!reportSnap.exists()) {
        return {
          success: false,
          errors: [{ field: 'reportId', message: 'Report not found', code: 'REPORT_NOT_FOUND' }]
        };
      }

      const report = reportSnap.data() as EnhancedCCRSReport;
      
      // Get IRF template
      const template = await this.getActiveIRFTemplate();
      if (!template) {
        return {
          success: false,
          errors: [{ field: 'template', message: 'No active IRF template found', code: 'TEMPLATE_NOT_FOUND' }]
        };
      }

      // Auto-populate IRF fields from report data
      const populatedData = this.populateIRFFields(report, template, options);
      
      // Create IRF data object
      const irfData: IRFData = {
        reportId: options.reportId,
        templateId: template.id,
        templateVersion: template.version,
        generatedBy: options.officerId,
        generatedAt: Timestamp.now(),
        populatedFields: populatedData,
        customFields: options.customFields || {},
        isFinalized: false
      };

      // Generate PDF if requested
      let pdfUrl: string | undefined;
      if (options.generatePDF && options.saveToPDF) {
        pdfUrl = await this.generatePDF(irfData, template, report);
        irfData.pdfUrl = pdfUrl;
        irfData.pdfFilename = `IRF_${options.reportId}_${Date.now()}.pdf`;
      }

      return {
        success: true,
        irfData,
        pdfUrl
      };

    } catch (error) {
      console.error('IRF generation error:', error);
      return {
        success: false,
        errors: [{ field: 'general', message: error instanceof Error ? error.message : 'Unknown error', code: 'GENERATION_ERROR' }]
      };
    }
  }

  /**
   * Get active IRF template
   */
  private static async getActiveIRFTemplate(): Promise<IRFTemplate | null> {
    try {
      // First try to get from Firestore
      const templatesQuery = query(
        collection(db, 'irfTemplates'),
        where('isActive', '==', true)
      );
      const templatesSnap = await getDocs(templatesQuery);
      
      if (!templatesSnap.empty) {
        const templateDoc = templatesSnap.docs[0];
        return { id: templateDoc.id, ...templateDoc.data() } as IRFTemplate;
      }

      // Fallback to default template from JSON
      return {
        id: irfTemplateData.id,
        name: irfTemplateData.name,
        version: irfTemplateData.version,
        description: irfTemplateData.description,
        template: JSON.stringify(irfTemplateData.sections),
        requiredFields: irfTemplateData.requiredFields,
        optionalFields: irfTemplateData.optionalFields,
        isActive: irfTemplateData.isActive,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'system'
      } as IRFTemplate;

    } catch (error) {
      console.error('Error getting IRF template:', error);
      return null;
    }
  }

  /**
   * Auto-populate IRF fields from report data
   */
  private static populateIRFFields(
    report: EnhancedCCRSReport, 
    template: IRFTemplate, 
    options: IRFGenerationOptions
  ): Record<string, any> {
    const populated: Record<string, any> = {};
    
    try {
      const sections = typeof template.template === 'string' 
        ? JSON.parse(template.template) 
        : irfTemplateData.sections;

      // Generate IRF entry number
      populated.irfEntryNumber = this.generateIRFEntryNumber();
      
      // Map basic report information
      populated.typeOfIncident = report.category || 'Unknown';
      populated.dateTimeReported = this.formatDateTime(report.timestamp);
      populated.dateTimeOfIncident = this.formatDateTime(report.timestamp); // Use report timestamp as incident time
      populated.placeOfIncident = report.location?.address?.formattedAddress || 'Not specified';
      
      // Item A - Reporting Person (use authenticated user data if available)
      if (report.user_id) {
        // In a real implementation, you'd fetch user data here
        populated.familyName = 'To be filled';
        populated.firstName = 'To be filled';
        populated.sexGender = 'To be filled';
        populated.reportingPersonName = 'To be filled';
      }
      
      // Item D - Narrative
      populated.narrativeType = report.category || 'Unknown';
      populated.narrativeDateTime = this.formatDateTime(report.timestamp);
      populated.narrativePlace = report.location?.address?.formattedAddress || 'Not specified';
      populated.narrativeDetails = report.description || 'No details provided';
      
      // Official data
      populated.administeringOfficer = options.officerName;
      populated.investigatorName = options.officerName;
      populated.deskOfficerName = options.officerName;
      populated.blotterEntryNumber = report.blotterNumber || 'Pending';
      
      // Police station information (default values)
      populated.policeStationName = 'Local Police Station';
      populated.policeStationTelephone = 'To be filled';
      populated.investigatorMobile = 'To be filled';
      populated.chiefMobile = 'To be filled';
      
      // Crime classification if available
      if (report.crimeCode) {
        populated.typeOfIncident = `${report.crimeCode} - ${report.category}`;
        populated.narrativeType = `${report.crimeCode} - ${report.category}`;
      }
      
      // Default values for optional fields
      populated.copyFor = 'STATION RECORDS';
      populated.citizenship = 'Filipino';
      
      return populated;
      
    } catch (error) {
      console.error('Error populating IRF fields:', error);
      return populated;
    }
  }

  /**
   * Generate IRF entry number
   */
  private static generateIRFEntryNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    
    return `IRF-${year}${month}${day}-${timestamp}`;
  }

  /**
   * Format date/time for IRF
   */
  private static formatDateTime(timestamp: Timestamp): string {
    try {
      const date = timestamp.toDate();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${month}/${day}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return 'Invalid Date';
    }
  }

  /**
   * Generate PDF using pdfmake (client-side) and upload to Firebase Storage
   */
  private static async generatePDF(
    irfData: IRFData, 
    template: IRFTemplate, 
    report: EnhancedCCRSReport
  ): Promise<string> {
    try {
      console.log('Generating PDF using pdfmake for IRF:', irfData.reportId);
      
      // Generate PDF blob using our pdfmake-based generator
      const pdfBlob = await generateIRFPDFBlob(template, irfData);
      
      console.log('PDF blob generated, size:', pdfBlob.size);
      
      // Upload to Firebase Storage
      const filename = `irf_${irfData.reportId}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `irf-documents/${filename}`);
      
      console.log('Uploading PDF to Firebase Storage...');
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('PDF uploaded successfully, URL:', downloadURL);
      return downloadURL;

    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // jsPDF helper methods removed - now using pdfmake via pdfGenerator utility

  /**
   * Save IRF data to report document
   */
  static async saveIRFToReport(reportId: string, irfData: IRFData): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, 'reports', reportId);
        
        transaction.update(reportRef, {
          irfGenerated: true,
          irfData: irfData,
          irfPdfUrl: irfData.pdfUrl,
          updatedAt: Timestamp.now()
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error saving IRF to report:', error);
      return false;
    }
  }

  /**
   * Finalize IRF (mark as complete)
   */
  static async finalizeIRF(reportId: string, officerId: string): Promise<boolean> {
    try {
      await runTransaction(db, async (transaction) => {
        const reportRef = doc(db, 'reports', reportId);
        const reportSnap = await transaction.get(reportRef);
        
        if (reportSnap.exists()) {
          const currentData = reportSnap.data();
          const updatedIRFData = {
            ...currentData.irfData,
            isFinalized: true,
            finalizedBy: officerId,
            finalizedAt: Timestamp.now()
          };
          
          transaction.update(reportRef, {
            irfData: updatedIRFData,
            updatedAt: Timestamp.now()
          });
        }
      });
      
      return true;
    } catch (error) {
      console.error('Error finalizing IRF:', error);
      return false;
    }
  }
}