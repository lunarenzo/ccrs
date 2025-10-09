/**
 * PDF Generation Service for IRF
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation
 * 
 * This service generates PDF documents from IRF templates and data using
 * pdfmake library for client-side PDF generation (Firebase Free Tier compliant).
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions, Content, Table, ContentText } from 'pdfmake/interfaces';
import type { 
  IRFTemplate, 
  IRFData, 
  PDFGenerationConfig,
  IRFTemplateField,
  IRFTemplateSection 
} from '../shared-types/sprint2-interfaces';

// Initialize pdfMake with fonts - Enhanced error handling
// Fix for newer versions of pdfmake where vfs is directly available
try {
  if (pdfFonts && typeof pdfFonts === 'object') {
    (pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs || pdfFonts;
  } else {
    console.warn('PDF fonts not properly loaded, using default fonts');
  }
} catch (error) {
  console.error('Error initializing PDF fonts:', error);
  // Continue with default fonts
}

// Default PDF configuration for PNP documents
const DEFAULT_PDF_CONFIG: PDFGenerationConfig = {
  pageSize: 'A4',
  orientation: 'portrait',
  margins: {
    top: 40,
    right: 40,
    bottom: 60,
    left: 40
  },
  header: {
    text: 'PHILIPPINE NATIONAL POLICE',
    alignment: 'center'
  },
  footer: {
    text: 'This is a system-generated document.',
    alignment: 'center'
  }
};

/**
 * Generate PDF document definition for IRF
 * @param template - IRF template
 * @param irfData - Populated IRF data
 * @param config - PDF generation configuration
 * @returns PDF document definition
 */
function createIRFDocumentDefinition(
  template: IRFTemplate,
  irfData: IRFData,
  config: PDFGenerationConfig = DEFAULT_PDF_CONFIG
): TDocumentDefinitions {
  const content: Content[] = [];
  
  // Header section with PNP logo placeholder
  content.push({
    columns: [
      {
        width: '*',
        text: ''
      },
      {
        width: 'auto',
        stack: [
          {
            text: 'PHILIPPINE NATIONAL POLICE',
            style: 'header',
            alignment: 'center'
          },
          {
            text: 'INCIDENT RECORD FORM',
            style: 'subheader',
            alignment: 'center',
            margin: [0, 5, 0, 20]
          }
        ]
      },
      {
        width: '*',
        text: ''
      }
    ]
  });

  // IRF Header Information
  if (template.sections.header) {
    content.push(createSectionContent(template.sections.header, irfData));
    content.push({ text: '\n' });
  }

  // Process each section in order
  const sectionOrder = ['itemA', 'itemB', 'itemC', 'itemD', 'signatures', 'reminder'];
  
  sectionOrder.forEach(sectionKey => {
    const section = template.sections[sectionKey];
    if (section) {
      content.push(createSectionContent(section, irfData));
      content.push({ text: '\n' });
    }
  });

  // Footer reminder section
  if (template.sections.reminder) {
    content.push({
      text: template.sections.reminder.content || 'Keep this form for your reference.',
      style: 'reminder',
      margin: [0, 20, 0, 10]
    });
  }

  return {
    content,
    pageSize: config.pageSize as any,
    pageOrientation: config.orientation,
    pageMargins: [config.margins.left, config.margins.top, config.margins.right, config.margins.bottom],
    
    header: config.header ? {
      text: config.header.text,
      alignment: config.header.alignment || 'center',
      margin: [40, 20, 40, 20],
      fontSize: 10
    } : undefined,
    
    footer: config.footer ? (currentPage: number, pageCount: number) => ({
      text: `${config.footer!.text} | Page ${currentPage} of ${pageCount}`,
      alignment: config.footer!.alignment || 'center',
      margin: [40, 10, 40, 10],
      fontSize: 8
    }) : undefined,

    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: '#000080'
      },
      subheader: {
        fontSize: 14,
        bold: true
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        margin: [0, 15, 0, 10],
        decoration: 'underline'
      },
      fieldLabel: {
        fontSize: 9,
        bold: true,
        margin: [0, 5, 0, 2]
      },
      fieldValue: {
        fontSize: 10,
        margin: [0, 0, 0, 8]
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: 'black',
        fillColor: '#cccccc'
      },
      reminder: {
        fontSize: 9,
        italics: true,
        color: '#666666'
      },
      signature: {
        margin: [0, 30, 0, 10]
      }
    },

    defaultStyle: {
      fontSize: 10,
      font: 'Roboto'
    }
  };
}

/**
 * Create content for a specific IRF section
 * @param section - Template section
 * @param irfData - Populated IRF data
 * @returns Content array for the section
 */
function createSectionContent(section: IRFTemplateSection, irfData: IRFData): Content {
  const sectionContent: Content[] = [];

  // Section title
  if (section.title) {
    sectionContent.push({
      text: section.title,
      style: 'sectionTitle'
    });
  }

  // Section content (if any)
  if (section.content) {
    sectionContent.push({
      text: section.content,
      margin: [0, 0, 0, 10],
      fontSize: 9
    });
  }

  // Process fields in a more structured way
  if (section.fields && section.fields.length > 0) {
    const fieldGroups = groupFieldsForDisplay(section.fields);
    
    fieldGroups.forEach(group => {
      if (group.type === 'table') {
        sectionContent.push(createFieldsTable(group.fields, irfData));
      } else {
        // Individual fields
        group.fields.forEach(field => {
          sectionContent.push(createFieldDisplay(field, irfData));
        });
      }
    });
  }

  return {
    stack: sectionContent,
    unbreakable: section.title?.includes('SIGNATURES') ? false : true
  };
}

/**
 * Group fields for optimal display layout
 * @param fields - Array of template fields
 * @returns Grouped fields for display
 */
function groupFieldsForDisplay(fields: IRFTemplateField[]): Array<{
  type: 'table' | 'individual';
  fields: IRFTemplateField[];
}> {
  const groups: Array<{ type: 'table' | 'individual'; fields: IRFTemplateField[] }> = [];
  
  // Simple grouping logic - can be enhanced based on field types
  let currentGroup: IRFTemplateField[] = [];
  let isTableGroup = false;

  fields.forEach(field => {
    if (field.type === 'signature' || field.name.includes('signature')) {
      // Signatures are individual
      if (currentGroup.length > 0) {
        groups.push({ type: isTableGroup ? 'table' : 'individual', fields: currentGroup });
        currentGroup = [];
      }
      groups.push({ type: 'individual', fields: [field] });
      isTableGroup = false;
    } else {
      currentGroup.push(field);
      isTableGroup = currentGroup.length > 1 && 
        !field.name.includes('narrative') && 
        field.type !== 'textarea';
    }
  });

  if (currentGroup.length > 0) {
    groups.push({ type: isTableGroup ? 'table' : 'individual', fields: currentGroup });
  }

  return groups;
}

/**
 * Create a table layout for multiple fields
 * @param fields - Fields to display in table format
 * @param irfData - Populated IRF data
 * @returns Table content
 */
function createFieldsTable(fields: IRFTemplateField[], irfData: IRFData): Content {
  const tableBody: any[][] = [];
  
  // Create rows with 2 columns each
  for (let i = 0; i < fields.length; i += 2) {
    const field1 = fields[i];
    const field2 = fields[i + 1];
    
    const row: any[] = [
      {
        text: [
          { text: field1.label + ':', style: 'fieldLabel' },
          { text: '\n' + (getFieldValue(field1, irfData) || '_________________'), style: 'fieldValue' }
        ],
        border: [true, true, field2 ? false : true, true]
      }
    ];
    
    if (field2) {
      row.push({
        text: [
          { text: field2.label + ':', style: 'fieldLabel' },
          { text: '\n' + (getFieldValue(field2, irfData) || '_________________'), style: 'fieldValue' }
        ],
        border: [false, true, true, true]
      });
    } else {
      // Single field takes full width
      row[0].colSpan = 2;
    }
    
    tableBody.push(row);
  }

  return {
    table: {
      widths: ['50%', '50%'],
      body: tableBody
    },
    layout: {
      defaultBorder: false,
      paddingLeft: () => 5,
      paddingRight: () => 5,
      paddingTop: () => 5,
      paddingBottom: () => 5
    },
    margin: [0, 0, 0, 10]
  };
}

/**
 * Create display for individual field
 * @param field - Template field
 * @param irfData - Populated IRF data
 * @returns Field content
 */
function createFieldDisplay(field: IRFTemplateField, irfData: IRFData): Content {
  const value = getFieldValue(field, irfData);
  
  if (field.type === 'signature') {
    return {
      columns: [
        {
          width: '70%',
          text: field.label + ':',
          style: 'fieldLabel'
        },
        {
          width: '30%',
          text: '_________________________',
          alignment: 'center',
          margin: [0, 10, 0, 10]
        }
      ],
      style: 'signature'
    };
  }

  if (field.type === 'textarea' || field.name.includes('narrative')) {
    return {
      stack: [
        {
          text: field.label + ':',
          style: 'fieldLabel'
        },
        {
          text: value || field.note || '(Enter details here)',
          style: 'fieldValue',
          margin: [0, 5, 0, 10]
        }
      ]
    };
  }

  return {
    text: [
      { text: field.label + ': ', style: 'fieldLabel' },
      { text: value || '_________________', style: 'fieldValue' }
    ],
    margin: [0, 0, 0, 3]
  };
}

/**
 * Get field value from IRF data
 * @param field - Template field
 * @param irfData - Populated IRF data
 * @returns Field value
 */
function getFieldValue(field: IRFTemplateField, irfData: IRFData): string {
  const value = irfData.populatedFields[field.name] || irfData.customFields?.[field.name];
  
  if (value === null || value === undefined) return '';
  
  // Format based on field type
  switch (field.type) {
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'date':
    case 'datetime':
      return String(value);
    default:
      return String(value);
  }
}

/**
 * Generate PDF from IRF template and data
 * @param template - IRF template
 * @param irfData - Populated IRF data
 * @param config - PDF configuration (optional)
 * @returns Promise<Uint8Array> - Generated PDF as bytes
 */
export async function generateIRFPDF(
  template: IRFTemplate,
  irfData: IRFData,
  config: PDFGenerationConfig = DEFAULT_PDF_CONFIG
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting PDF generation for IRF:', irfData.reportId);
      const docDefinition = createIRFDocumentDefinition(template, irfData, config);
      
      const pdfDoc = pdfMake.createPdf(docDefinition);
      
      // Add timeout to prevent infinite hanging
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timed out after 30 seconds'));
      }, 30000);
      
      pdfDoc.getBuffer((buffer: any) => {
        clearTimeout(timeout);
        if (buffer) {
          console.log('PDF generation successful');
          resolve(new Uint8Array(buffer));
        } else {
          reject(new Error('PDF buffer is empty'));
        }
      });
      
    } catch (error) {
      console.error('Error in generateIRFPDF:', error);
      reject(error);
    }
  });
}

/**
 * Generate PDF and trigger download
 * @param template - IRF template
 * @param irfData - Populated IRF data
 * @param filename - Optional filename for download
 * @param config - PDF configuration (optional)
 */
export function downloadIRFPDF(
  template: IRFTemplate,
  irfData: IRFData,
  filename?: string,
  config: PDFGenerationConfig = DEFAULT_PDF_CONFIG
): void {
  try {
    console.log('Starting PDF download for IRF:', irfData.reportId);
    const docDefinition = createIRFDocumentDefinition(template, irfData, config);
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    const downloadFilename = filename || 
      `IRF_${irfData.irfEntryNumber || irfData.reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    pdfDoc.download(downloadFilename);
    console.log('PDF download initiated:', downloadFilename);
  } catch (error) {
    console.error('Error in downloadIRFPDF:', error);
    throw error;
  }
}

/**
 * Generate PDF and open in new window for preview
 * @param template - IRF template
 * @param irfData - Populated IRF data
 * @param config - PDF configuration (optional)
 */
export function previewIRFPDF(
  template: IRFTemplate,
  irfData: IRFData,
  config: PDFGenerationConfig = DEFAULT_PDF_CONFIG
): void {
  try {
    console.log('Starting PDF preview for IRF:', irfData.reportId);
    const docDefinition = createIRFDocumentDefinition(template, irfData, config);
    const pdfDoc = pdfMake.createPdf(docDefinition);
    
    // Add error handling for PDF open
    try {
      pdfDoc.open();
      console.log('PDF preview opened successfully');
    } catch (openError) {
      console.error('Error opening PDF preview:', openError);
      // Fallback: try to get URL and open manually
      pdfDoc.getDataUrl((dataUrl: string) => {
        if (dataUrl) {
          window.open(dataUrl, '_blank');
        } else {
          throw new Error('Unable to generate PDF preview URL');
        }
      });
    }
  } catch (error) {
    console.error('Error in previewIRFPDF:', error);
    throw error;
  }
}

/**
 * Generate PDF blob for Firebase Storage upload
 * @param template - IRF template
 * @param irfData - Populated IRF data
 * @param config - PDF configuration (optional)
 * @returns Promise<Blob> - PDF as blob for upload
 */
export async function generateIRFPDFBlob(
  template: IRFTemplate,
  irfData: IRFData,
  config: PDFGenerationConfig = DEFAULT_PDF_CONFIG
): Promise<Blob> {
  const pdfBytes = await generateIRFPDF(template, irfData, config);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Create PDF filename for storage
 * @param irfData - IRF data
 * @returns Standardized filename
 */
export function createPDFFilename(irfData: IRFData): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const irfNumber = irfData.irfEntryNumber?.replace(/[^a-zA-Z0-9]/g, '_') || 'UNKNOWN';
  
  return `IRF_${irfNumber}_${timestamp}.pdf`;
}

/**
 * Validate PDF generation requirements
 * @param template - IRF template
 * @param irfData - IRF data to validate
 * @returns Validation result
 */
export function validatePDFGeneration(template: IRFTemplate, irfData: IRFData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!template) {
    errors.push('IRF template is required');
  }
  
  if (!irfData) {
    errors.push('IRF data is required');
  }
  
  if (!irfData.populatedFields) {
    errors.push('Populated fields are required');
  }
  
  // Check for required fields with empty values
  if (template && irfData) {
    template.requiredFields.forEach(fieldName => {
      const value = irfData.populatedFields[fieldName];
      if (!value || value === '') {
        errors.push(`Required field '${fieldName}' is empty`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export configuration constants
export { DEFAULT_PDF_CONFIG };

// Export all functions
export {
  createIRFDocumentDefinition,
  createSectionContent,
  createFieldDisplay,
  getFieldValue
};