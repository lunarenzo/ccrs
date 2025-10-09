/**
 * Template-based PDF Generator for IRF
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation with Official Templates
 * 
 * This service generates PDF documents by overlaying form data onto official
 * PNP template images (Police-Report-Template-Sample_001.jpg & _002.jpg)
 */

// Import jsPDF for browser environment
import jsPDF from 'jspdf';

// Type assertion to handle potential module interop issues
const PDFDocument = (jsPDF as any).jsPDF || jsPDF;
import type { 
  IRFTemplate, 
  IRFData 
} from '../shared-types/sprint2-interfaces';

// Template image paths - relative to public directory
const TEMPLATE_PATHS = {
  page1: '/shared-data/Police-Report-Template-Sample_001.jpg',
  page2: '/shared-data/Police-Report-Template-Sample_002.jpg'
};

// Canvas dimensions to match template resolution
const CANVAS_WIDTH = 2481;
const CANVAS_HEIGHT = 3507;

// PDF dimensions (A4 at high DPI for quality)
const PDF_WIDTH = 210; // mm
const PDF_HEIGHT = 297; // mm

// Define coordinate configuration type
interface CoordinateConfig {
  x: number;
  y: number;
  fontSize: number;
  maxWidth: number;
  maxHeight?: number;
  multiLine?: boolean;
}

type FieldCoordinatesType = {
  [page: string]: {
    [fieldName: string]: CoordinateConfig;
  };
};

/**
 * Coordinate mapping for form fields on template images
 * These coordinates are approximate and should be fine-tuned based on actual template layout
 */
const FIELD_COORDINATES: FieldCoordinatesType = {
  // Page 1 fields
  page1: {
    irfEntryNumber: { x: 400, y: 280, fontSize: 14, maxWidth: 200 },
    typeOfIncident: { x: 800, y: 280, fontSize: 12, maxWidth: 300 },
    copyFor: { x: 400, y: 320, fontSize: 12, maxWidth: 200 },
    
    dateTimeReported: { x: 400, y: 380, fontSize: 11, maxWidth: 300 },
    dateTimeOfIncident: { x: 400, y: 420, fontSize: 11, maxWidth: 300 },
    placeOfIncident: { x: 400, y: 460, fontSize: 11, maxWidth: 600 },
    
    // Item A - Reporting Person
    familyName: { x: 400, y: 600, fontSize: 11, maxWidth: 200 },
    firstName: { x: 650, y: 600, fontSize: 11, maxWidth: 200 },
    middleName: { x: 900, y: 600, fontSize: 11, maxWidth: 200 },
    
    sexGender: { x: 400, y: 640, fontSize: 11, maxWidth: 100 },
    citizenship: { x: 600, y: 640, fontSize: 11, maxWidth: 150 },
    civilStatus: { x: 850, y: 640, fontSize: 11, maxWidth: 150 },
    
    // Additional fields can be added here
    reportingPersonName: { x: 400, y: 2800, fontSize: 11, maxWidth: 300 },
    blotterEntryNumber: { x: 800, y: 2800, fontSize: 11, maxWidth: 200 }
  },
  
  // Page 2 fields
  page2: {
    // Item D - Narrative
    narrativeType: { x: 400, y: 200, fontSize: 11, maxWidth: 400 },
    narrativeDateTime: { x: 400, y: 240, fontSize: 11, maxWidth: 400 },
    narrativePlace: { x: 400, y: 280, fontSize: 11, maxWidth: 600 },
    narrativeDetails: { x: 400, y: 350, fontSize: 10, maxWidth: 800, maxHeight: 500, multiLine: true },
    
    // Signatures
    deskOfficerName: { x: 400, y: 2400, fontSize: 11, maxWidth: 300 },
    investigatorName: { x: 800, y: 2400, fontSize: 11, maxWidth: 300 },
    
    // Police station info
    policeStationName: { x: 400, y: 2600, fontSize: 11, maxWidth: 400 },
    administeringOfficer: { x: 400, y: 2800, fontSize: 11, maxWidth: 300 }
  }
};

/**
 * Load image and return as HTMLImageElement
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(new Error(`Failed to load image: ${src} - ${error}`));
    img.src = src;
  });
}

/**
 * Draw text on canvas with proper positioning and formatting
 */
function drawText(
  ctx: CanvasRenderingContext2D, 
  text: string, 
  config: {
    x: number;
    y: number;
    fontSize: number;
    maxWidth: number;
    maxHeight?: number;
    multiLine?: boolean;
  }
) {
  if (!text) return;
  
  ctx.font = `${config.fontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  if (config.multiLine) {
    // Handle multi-line text with word wrapping
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > config.maxWidth && currentLine !== '') {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    // Draw lines with line spacing
    const lineHeight = config.fontSize * 1.2;
    lines.forEach((line, index) => {
      const yPos = config.y + (index * lineHeight);
      if (!config.maxHeight || yPos < config.y + config.maxHeight) {
        ctx.fillText(line, config.x, yPos);
      }
    });
  } else {
    // Single line text with overflow truncation
    let displayText = text;
    let textWidth = ctx.measureText(displayText).width;
    
    while (textWidth > config.maxWidth && displayText.length > 0) {
      displayText = displayText.substring(0, displayText.length - 1);
      textWidth = ctx.measureText(displayText + '...').width;
    }
    
    if (displayText.length < text.length) {
      displayText += '...';
    }
    
    ctx.fillText(displayText, config.x, config.y);
  }
}

/**
 * Create canvas with template background and form data overlay
 */
async function createTemplateCanvas(
  templateImageSrc: string, 
  fieldCoordinates: Record<string, any>,
  formData: Record<string, any>
): Promise<HTMLCanvasElement> {
  console.log('Creating template canvas for:', templateImageSrc);
  
  // Load template image
  const templateImage = await loadImage(templateImageSrc);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Draw template background
  ctx.drawImage(templateImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Overlay form data
  for (const [fieldName, coordinates] of Object.entries(fieldCoordinates)) {
    const fieldValue = formData[fieldName];
    if (fieldValue) {
      drawText(ctx, String(fieldValue), coordinates);
    }
  }
  
  console.log('Template canvas created successfully');
  return canvas;
}

/**
 * Generate PDF from IRF template with form data overlay
 */
export async function generateTemplatePDF(
  _template: IRFTemplate,
  irfData: IRFData
): Promise<Blob> {
  try {
    console.log('Starting template-based PDF generation...');
    
    // Prepare form data for overlay
    const formData = {
      ...irfData.populatedFields,
      ...irfData.customFields
    };
    
    console.log('Form data prepared:', Object.keys(formData));
    
    // Create canvases for both template pages
    const page1Canvas = await createTemplateCanvas(
      TEMPLATE_PATHS.page1,
      FIELD_COORDINATES.page1,
      formData
    );
    
    const page2Canvas = await createTemplateCanvas(
      TEMPLATE_PATHS.page2,
      FIELD_COORDINATES.page2,
      formData
    );
    
    // Create PDF with high quality settings
    const pdf = new PDFDocument({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: false // Higher quality
    });
    
    // Add page 1
    const page1DataUrl = page1Canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(page1DataUrl, 'JPEG', 0, 0, PDF_WIDTH, PDF_HEIGHT);
    
    // Add page 2
    pdf.addPage();
    const page2DataUrl = page2Canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(page2DataUrl, 'JPEG', 0, 0, PDF_WIDTH, PDF_HEIGHT);
    
    // Convert to blob
    const pdfBlob = pdf.output('blob');
    
    console.log('Template-based PDF generated successfully, size:', pdfBlob.size);
    return pdfBlob;
    
  } catch (error) {
    console.error('Error generating template PDF:', error);
    throw new Error(`Template PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download template-based PDF
 */
export function downloadTemplatePDF(
  template: IRFTemplate,
  irfData: IRFData,
  filename?: string
): void {
  generateTemplatePDF(template, irfData)
    .then(pdfBlob => {
      const downloadFilename = filename || 
        `IRF_${irfData.populatedFields.irfEntryNumber || irfData.reportId}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Template PDF download initiated:', downloadFilename);
    })
    .catch(error => {
      console.error('Error downloading template PDF:', error);
      throw error;
    });
}

/**
 * Preview template-based PDF in new window
 */
export function previewTemplatePDF(
  template: IRFTemplate,
  irfData: IRFData
): void {
  generateTemplatePDF(template, irfData)
    .then(pdfBlob => {
      const url = URL.createObjectURL(pdfBlob);
      const previewWindow = window.open(url, '_blank');
      
      if (!previewWindow) {
        throw new Error('Failed to open preview window - popup blocker may be active');
      }
      
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      
      console.log('Template PDF preview opened successfully');
    })
    .catch(error => {
      console.error('Error previewing template PDF:', error);
      throw error;
    });
}

/**
 * Update field coordinates (for fine-tuning positions)
 */
export function updateFieldCoordinates(
  page: 'page1' | 'page2',
  fieldName: string,
  coordinates: Partial<CoordinateConfig>
): void {
  if (FIELD_COORDINATES[page] && FIELD_COORDINATES[page][fieldName]) {
    FIELD_COORDINATES[page][fieldName] = {
      ...FIELD_COORDINATES[page][fieldName],
      ...coordinates
    };
    console.log(`Updated coordinates for ${fieldName} on ${page}:`, coordinates);
  }
}