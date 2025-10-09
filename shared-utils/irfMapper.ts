/**
 * IRF Data Mapping Utility
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation
 * 
 * This utility maps CCRS report data to IRF template fields using the
 * mapFrom property in the template, handling data transformation and validation.
 */

import { Timestamp } from 'firebase/firestore';
import type { 
  IRFTemplate, 
  IRFData, 
  IRFFieldMapping,
  IRFGenerationRequest,
  ValidationError,
  ValidationResult,
  EnhancedCCRSReport 
} from '../shared-types/sprint2-interfaces';
import type { CCRSReport, CCRSUser } from '../shared-types/rbac';

// Helper function to safely get nested object properties using dot notation
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
}

// Helper function to format dates for IRF
function formatDateForIRF(date: Date | Timestamp | string | null): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('en-PH', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit'
  });
}

// Helper function to format datetime for IRF
function formatDateTimeForIRF(date: Date | Timestamp | string | null): string {
  if (!date) return '';
  
  let dateObj: Date;
  
  if (date instanceof Timestamp) {
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    return '';
  }
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleString('en-PH', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Generate unique IRF entry number
function generateIRFEntryNumber(report: CCRSReport | EnhancedCCRSReport): string {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // Use blotter number if available, otherwise use report ID suffix
  const identifier = ('blotterNumber' in report && report.blotterNumber) 
    ? report.blotterNumber.replace(/[^0-9]/g, '').substr(-4).padStart(4, '0')
    : report.id.replace(/[^a-zA-Z0-9]/g, '').substr(-4).toUpperCase();
  
  return `IRF-${year}${month}${day}-${identifier}`;
}

/**
 * Map CCRS report data to IRF template fields
 * @param report - The CCRS report data
 * @param template - The IRF template
 * @param reporterUser - Optional user data for reporter information
 * @param officerData - Officer data for signatures and administrative info
 * @returns Mapped field data
 */
export function mapReportToIRFFields(
  report: CCRSReport | EnhancedCCRSReport,
  template: IRFTemplate,
  reporterUser?: CCRSUser,
  officerData?: {
    deskOfficer?: CCRSUser;
    investigator?: CCRSUser;
    policeStation?: {
      name: string;
      telephone?: string;
      chiefMobile?: string;
    };
  }
): Record<string, any> {
  const mappedData: Record<string, any> = {};
  
  // Create enriched report data with additional context
  const enrichedReport = {
    ...report,
    reporter: reporterUser ? {
      fullName: reporterUser.fullName || '',
      firstName: reporterUser.fullName?.split(' ')[0] || '',
      lastName: reporterUser.fullName?.split(' ').slice(1).join(' ') || '',
      email: reporterUser.email || '',
      mobilePhone: reporterUser.phoneNumber || '',
      // Default values for missing reporter data
      middleName: '',
      qualifier: '',
      nickname: '',
      citizenship: 'Filipino',
      gender: '',
      civilStatus: '',
      dateOfBirth: null,
      age: null,
      placeOfBirth: '',
      homePhone: '',
      address: {
        street: '',
        village: '',
        barangay: report.location?.address?.district || '',
        city: report.location?.address?.city || '',
        province: report.location?.address?.region || ''
      },
      education: '',
      occupation: '',
      idPresented: ''
    } : null,
    // Map existing fields to expected IRF structure
    incidentDateTime: report.timestamp,
    administeringOfficer: officerData?.deskOfficer ? {
      name: `${officerData.deskOfficer.rank || ''} ${officerData.deskOfficer.fullName || ''}`.trim()
    } : null,
    investigator: officerData?.investigator ? {
      rankAndName: `${officerData.investigator.rank || ''} ${officerData.investigator.fullName || ''}`.trim(),
      mobile: officerData.investigator.phoneNumber || ''
    } : null,
    deskOfficer: officerData?.deskOfficer ? {
      rankAndName: `${officerData.deskOfficer.rank || ''} ${officerData.deskOfficer.fullName || ''}`.trim()
    } : null,
    policeStation: officerData?.policeStation || { name: 'Police Station' },
    chiefOfOffice: {
      mobile: officerData?.policeStation?.chiefMobile || ''
    },
    // Handle enhanced report fields
    blotterNumber: ('blotterNumber' in report) ? report.blotterNumber : '',
    suspect: null, // Will be populated if suspect data is available
    victim: null   // Will be populated if victim data is available
  };

  // Process each section of the template
  Object.values(template.sections).forEach(section => {
    section.fields.forEach(field => {
      let value: any = null;
      
      // Handle auto-generated fields
      if (field.autoGenerate && field.name === 'irfEntryNumber') {
        value = generateIRFEntryNumber(report);
      }
      // Handle fields with mapFrom property
      else if (field.mapFrom) {
        value = getNestedValue(enrichedReport, field.mapFrom);
        
        // Apply field-specific transformations
        if (value !== null) {
          switch (field.type) {
            case 'date':
              value = formatDateForIRF(value);
              break;
            case 'datetime':
              value = formatDateTimeForIRF(value);
              break;
            case 'text':
              value = String(value || '');
              break;
            case 'number':
              value = typeof value === 'number' ? value : (parseFloat(value) || null);
              break;
            case 'checkbox':
              value = Boolean(value);
              break;
            case 'email':
              value = String(value || '').toLowerCase();
              break;
            default:
              value = value;
          }
        }
      }
      
      // Use default value if no mapping yielded a result
      if ((value === null || value === undefined || value === '') && field.defaultValue) {
        value = field.defaultValue;
      }
      
      // Store the mapped value
      mappedData[field.name] = value;
    });
  });
  
  return mappedData;
}

/**
 * Validate mapped IRF data against template requirements
 * @param mappedData - The mapped field data
 * @param template - The IRF template
 * @returns Validation result with errors
 */
export function validateIRFData(
  mappedData: Record<string, any>,
  template: IRFTemplate
): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Check required fields
  template.requiredFields.forEach(fieldName => {
    const value = mappedData[fieldName];
    
    if (value === null || value === undefined || value === '') {
      // Find field definition for better error message
      let fieldLabel = fieldName;
      Object.values(template.sections).forEach(section => {
        const field = section.fields.find(f => f.name === fieldName);
        if (field) fieldLabel = field.label;
      });
      
      errors.push({
        field: fieldName,
        message: `${fieldLabel} is required but not provided`,
        code: 'REQUIRED_FIELD_MISSING'
      });
    }
  });
  
  // Validate field formats
  Object.values(template.sections).forEach(section => {
    section.fields.forEach(field => {
      const value = mappedData[field.name];
      
      if (value !== null && value !== undefined && value !== '') {
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
              errors.push({
                field: field.name,
                message: `${field.label} must be a valid email address`,
                code: 'INVALID_EMAIL_FORMAT'
              });
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push({
                field: field.name,
                message: `${field.label} must be a valid number`,
                code: 'INVALID_NUMBER_FORMAT'
              });
            }
            break;
          case 'select':
            if (field.options && !field.options.includes(String(value))) {
              errors.push({
                field: field.name,
                message: `${field.label} must be one of: ${field.options.join(', ')}`,
                code: 'INVALID_OPTION_SELECTED'
              });
            }
            break;
        }
      }
    });
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate IRF data from a CCRS report and template
 * @param request - IRF generation request
 * @param report - The CCRS report
 * @param template - The IRF template
 * @param reporterUser - Optional reporter user data
 * @param officerData - Officer and station data
 * @returns Generated IRF data
 */
export function generateIRFData(
  request: IRFGenerationRequest,
  report: CCRSReport | EnhancedCCRSReport,
  template: IRFTemplate,
  reporterUser?: CCRSUser,
  officerData?: {
    deskOfficer?: CCRSUser;
    investigator?: CCRSUser;
    policeStation?: {
      name: string;
      telephone?: string;
      chiefMobile?: string;
    };
  }
): IRFData {
  // Map report data to IRF fields
  const populatedFields = mapReportToIRFFields(report, template, reporterUser, officerData);
  
  // Add any custom fields from the request
  if (request.customFields) {
    Object.assign(populatedFields, request.customFields);
  }
  
  // Validate the data
  const validation = validateIRFData(populatedFields, template);
  
  // Generate IRF data object
  const irfData: IRFData = {
    reportId: request.reportId,
    templateId: template.id,
    templateVersion: template.version,
    generatedBy: request.generatedBy,
    generatedAt: Timestamp.now(),
    populatedFields,
    customFields: request.customFields,
    isFinalized: request.autoFinalize || false,
    irfEntryNumber: populatedFields.irfEntryNumber || generateIRFEntryNumber(report),
    validationErrors: validation.errors.length > 0 ? validation.errors : undefined
  };
  
  return irfData;
}

/**
 * Update IRF data with edited field values
 * @param irfData - Existing IRF data
 * @param fieldUpdates - Field updates from user editing
 * @param template - The IRF template for validation
 * @returns Updated IRF data
 */
export function updateIRFData(
  irfData: IRFData,
  fieldUpdates: Record<string, any>,
  template: IRFTemplate
): IRFData {
  // Merge field updates
  const updatedFields = {
    ...irfData.populatedFields,
    ...fieldUpdates
  };
  
  // Re-validate the updated data
  const validation = validateIRFData(updatedFields, template);
  
  return {
    ...irfData,
    populatedFields: updatedFields,
    validationErrors: validation.errors.length > 0 ? validation.errors : undefined,
    isFinalized: validation.isValid && irfData.isFinalized // Keep finalized only if still valid
  };
}

/**
 * Check if IRF data is ready for PDF generation
 * @param irfData - The IRF data to check
 * @returns Boolean indicating readiness
 */
export function isIRFReadyForPDF(irfData: IRFData): boolean {
  return !irfData.validationErrors || irfData.validationErrors.length === 0;
}

/**
 * Get human-readable field value for display
 * @param value - The field value
 * @param fieldType - The field type
 * @returns Formatted value for display
 */
export function formatFieldValueForDisplay(value: any, fieldType: string): string {
  if (value === null || value === undefined) return '';
  
  switch (fieldType) {
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'date':
    case 'datetime':
      return String(value);
    default:
      return String(value);
  }
}

// Export utility functions
export {
  generateIRFEntryNumber,
  formatDateForIRF,
  formatDateTimeForIRF,
  getNestedValue
};