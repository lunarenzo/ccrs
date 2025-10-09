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
} from '../../../shared-types/sprint2-interfaces';

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
  // Page 1 fields - Based on actual template layout
  page1: {
    // === HEADER DETAILS ===
    'irf_entry_number': { x: 100, y: 465, fontSize: 30, maxWidth: 260 },           // IRF ENTRY NUMBER field
    'type_of_incident': { x: 800, y: 465, fontSize: 35, maxWidth: 280 },          // TYPE OF INCIDENT field  
    'copy_for': { x: 1600, y: 465, fontSize: 30, maxWidth: 500 },                 // COPY FOR field
    'date_time_reported': { x: 100, y: 665, fontSize: 30, maxWidth: 260 },         // DATE AND TIME REPORTED
    'date_time_of_incident': { x: 800, y: 665, fontSize: 30, maxWidth: 280 },      // DATE AND TIME OF INCIDENT
    'place_of_incident': { x: 1600, y: 665, fontSize: 35, maxWidth: 500 },         // PLACE OF INCIDENT
    
    // === ITEM A - REPORTING PERSON (around y: 315-350) ===
    'reporting_person.family_name': { x: 80, y: 880, fontSize: 30, maxWidth: 300 },               // FAMILY NAME
    'reporting_person.first_name': { x: 790, y: 880, fontSize: 30, maxWidth: 300 },               // FIRST NAME
    'reporting_person.middle_name': { x: 1460, y: 880, fontSize: 30, maxWidth: 300 },              // MIDDLE NAME
    'reporting_person.qualifier': { x: 1790, y: 880, fontSize: 30, maxWidth: 300 },               // QUALIFIER
    'reporting_person.nickname': { x: 2070, y: 880, fontSize: 30, maxWidth: 300 },                // NICKNAME
    
    // Second row of ITEM A (around y: 375)
    'reporting_person.citizenship': { x: 80, y: 990, fontSize: 30, maxWidth: 300 },              // CITIZENSHIP
    'reporting_person.sex_gender': { x: 370, y: 990, fontSize: 30, maxWidth: 300 },               // SEX/GENDER
    'reporting_person.civil_status': { x: 570, y: 990, fontSize: 30, maxWidth: 300 },             // CIVIL STATUS
    'reporting_person.date_of_birth': { x: 790, y: 990, fontSize: 30, maxWidth: 300 },             // DATE OF BIRTH
    'reporting_person.age': { x: 1210, y: 990, fontSize: 30, maxWidth: 300 },                      // AGE
    'reporting_person.place_of_birth': { x: 1320, y: 990, fontSize: 30, maxWidth: 300 },            // PLACE OF BIRTH
    'reporting_person.home_phone': { x: 1780, y: 990, fontSize: 30, maxWidth: 300 },               // HOME PHONE
    'reporting_person.mobile_phone': { x: 2060, y: 990, fontSize: 30, maxWidth: 300 },             // MOBILE PHONE
    
    // Address fields (around y: 410)
    'reporting_person.current_address.house_number_street': { x: 90, y: 1100, fontSize: 30, maxWidth: 300 },     // CURRENT ADDRESS
    'reporting_person.current_address.village_sitio': { x: 900, y: 1100, fontSize: 30, maxWidth: 300 },   // VILLAGE/SITIO
    'reporting_person.current_address.barangay': { x: 1460, y: 1100, fontSize: 30, maxWidth: 300 },  // BARANGAY
    'reporting_person.current_address.town_city': { x: 1780, y: 1100, fontSize: 30, maxWidth: 300 },      // TOWN/CITY
    'reporting_person.current_address.province': { x: 2060, y: 1100, fontSize: 30, maxWidth: 300 },  // PROVINCE
    
    // Additional fields (around y: 445-480)
    'reporting_person.highest_educational_attainment': { x: 70, y: 1320, fontSize: 30, maxWidth: 300 },                // HIGHEST EDUCATIONAL ATTAINMENT
    'reporting_person.occupation': { x: 900, y: 1320, fontSize: 30, maxWidth: 300 },              // OCCUPATION
    'reporting_person.id_card_presented': { x: 1460, y: 1320, fontSize: 30, maxWidth: 300 },         // ID CARD PRESENTED
    'reporting_person.email_address': { x: 1770, y: 1330, fontSize: 30, maxWidth: 300 },             // EMAIL ADDRESS
    
    // === ITEM B - SUSPECT'S DATA (around y: 530-630) ===
    'suspect.family_name': { x: 80, y: 1530, fontSize: 30, maxWidth: 300 },         // SUSPECT FAMILY NAME
    'suspect.first_name': { x: 790, y: 1530, fontSize: 30, maxWidth: 300 },         // SUSPECT FIRST NAME
    'suspect.middle_name': { x: 1460, y: 1530, fontSize: 30, maxWidth: 300 },        // SUSPECT MIDDLE NAME
    'suspect.qualifier': { x: 1790, y: 1530, fontSize: 30, maxWidth: 300 },         // SUSPECT QUALIFIER
    'suspect.nickname': { x: 2070, y: 1530, fontSize: 30, maxWidth: 300 },          // SUSPECT NICKNAME
    
    // Additional suspect fields with original coordinates
    'suspect.citizenship': { x: 80, y: 1640, fontSize: 30, maxWidth: 300 },        // SUSPECT CITIZENSHIP
    'suspect.sex_gender': { x: 370, y: 1640, fontSize: 30, maxWidth: 300 },         // SUSPECT SEX/GENDER
    'suspect.civil_status': { x: 570, y: 1640, fontSize: 30, maxWidth: 300 },       // SUSPECT CIVIL STATUS
    'suspect.date_of_birth': { x: 790, y: 1640, fontSize: 30, maxWidth: 300 },       // SUSPECT DATE OF BIRTH
    'suspect.age': { x: 1210, y: 1640, fontSize: 30, maxWidth: 300 },              // SUSPECT AGE
    'suspect.place_of_birth': { x: 1320, y: 1640, fontSize: 30, maxWidth: 300 },     // SUSPECT PLACE OF BIRTH
    'suspect.home_phone': { x: 1780, y: 1640, fontSize: 30, maxWidth: 300 },        // SUSPECT HOME PHONE
    'suspect.mobile_phone': { x: 2060, y: 1640, fontSize: 30, maxWidth: 300 },      // SUSPECT MOBILE PHONE
    'suspect.current_address.house_number_street': { x: 90, y: 1750, fontSize: 30, maxWidth: 300 },     // SUSPECT CURRENT ADDRESS (house number/street)
    'suspect.current_address.village_sitio': { x: 900, y: 1750, fontSize: 30, maxWidth: 300 },   // SUSPECT VILLAGE/SITIO
    'suspect.current_address.barangay': { x: 1460, y: 1750, fontSize: 30, maxWidth: 300 }, // SUSPECT BARANGAY
    'suspect.current_address.town_city': { x: 1780, y: 1750, fontSize: 30, maxWidth: 300 },     // SUSPECT TOWN/CITY
    'suspect.current_address.province': { x: 2060, y: 1750, fontSize: 30, maxWidth: 300 }, // SUSPECT PROVINCE
    'suspect.highest_educational_attainment': { x: 70, y: 1860, fontSize: 30, maxWidth: 300 },          // SUSPECT HIGHEST EDUCATIONAL ATTAINMENT
    'suspect.occupation': { x: 900, y: 1860, fontSize: 30, maxWidth: 300 },        // SUSPECT OCCUPATION
    'suspect.work_address': { x: 1320, y: 1970, fontSize: 30, maxWidth: 300 },      // SUSPECT WORK ADDRESS
    'suspect.relation_to_victim': { x: 1795, y: 1975, fontSize: 25, maxWidth: 350 }, // SUSPECT RELATION TO VICTIM
    'suspect.email_address': { x: 1770, y: 1970, fontSize: 30, maxWidth: 300 },            // SUSPECT EMAIL
    
    // === ITEM C - VICTIM'S DATA (around y: 1000-1100) ===
    'victim.family_name': { x: 18, y: 1040, fontSize: 10, maxWidth: 170 },         // VICTIM FAMILY NAME
    'victim.first_name': { x: 200, y: 1040, fontSize: 10, maxWidth: 170 },         // VICTIM FIRST NAME
    'victim.middle_name': { x: 380, y: 1040, fontSize: 10, maxWidth: 170 },        // VICTIM MIDDLE NAME
    'victim.qualifier': { x: 560, y: 1040, fontSize: 10, maxWidth: 120 },         // VICTIM QUALIFIER
    'victim.nickname': { x: 690, y: 1040, fontSize: 10, maxWidth: 120 },           // VICTIM NICKNAME
    
    // Additional victim fields with coordinates to be determined
    'victim.citizenship': { x: 80, y: 1150, fontSize: 10, maxWidth: 170 },        // VICTIM CITIZENSHIP
    'victim.sex_gender': { x: 260, y: 1150, fontSize: 10, maxWidth: 100 },         // VICTIM SEX/GENDER
    'victim.civil_status': { x: 370, y: 1150, fontSize: 10, maxWidth: 120 },       // VICTIM CIVIL STATUS
    'victim.date_of_birth': { x: 500, y: 1150, fontSize: 10, maxWidth: 120 },       // VICTIM DATE OF BIRTH
    'victim.age': { x: 630, y: 1150, fontSize: 10, maxWidth: 60 },              // VICTIM AGE
    'victim.place_of_birth': { x: 700, y: 1150, fontSize: 10, maxWidth: 170 },     // VICTIM PLACE OF BIRTH
    'victim.home_phone': { x: 18, y: 1180, fontSize: 10, maxWidth: 150 },        // VICTIM HOME PHONE
    'victim.mobile_phone': { x: 180, y: 1180, fontSize: 10, maxWidth: 150 },      // VICTIM MOBILE PHONE
    'victim.current_address.house_number_street': { x: 350, y: 1180, fontSize: 10, maxWidth: 200 },     // VICTIM CURRENT ADDRESS
    'victim.current_address.village_sitio': { x: 560, y: 1180, fontSize: 10, maxWidth: 120 },   // VICTIM VILLAGE/SITIO
    'victim.current_address.barangay': { x: 690, y: 1180, fontSize: 10, maxWidth: 120 }, // VICTIM BARANGAY
    'victim.current_address.town_city': { x: 18, y: 1210, fontSize: 10, maxWidth: 150 },     // VICTIM TOWN/CITY
    'victim.current_address.province': { x: 180, y: 1210, fontSize: 10, maxWidth: 150 }, // VICTIM PROVINCE
    'victim.highest_educational_attainment': { x: 350, y: 1210, fontSize: 10, maxWidth: 200 },          // VICTIM HIGHEST EDUCATIONAL ATTAINMENT
    'victim.occupation': { x: 560, y: 1210, fontSize: 10, maxWidth: 150 },        // VICTIM OCCUPATION
    'victim.work_address': { x: 720, y: 1210, fontSize: 10, maxWidth: 150 },      // VICTIM WORK ADDRESS
    'victim.email_address': { x: 18, y: 1240, fontSize: 10, maxWidth: 300 }            // VICTIM EMAIL
  },
  
  // Page 2 fields - Based on actual template layout
  page2: {
    // === ITEM D - NARRATIVE OF INCIDENT ===
    'incident_narrative.type_of_incident': { x: 18, y: 115, fontSize: 11, maxWidth: 230 },             // TYPE OF INCIDENT
    'incident_narrative.date_time_of_incident': { x: 260, y: 115, fontSize: 11, maxWidth: 200 },        // DATE/TIME OF INCIDENT
    'incident_narrative.place_of_incident': { x: 470, y: 115, fontSize: 11, maxWidth: 400 },           // PLACE OF INCIDENT
    
    // Large narrative text area
    'incident_narrative.narrative_details': { x: 18, y: 165, fontSize: 10, maxWidth: 860, maxHeight: 600, multiLine: true },  // Main narrative area
    
    // === CERTIFICATION SECTION ===
    'certification.reporting_person_name': { x: 290, y: 850, fontSize: 10, maxWidth: 250 },      // NAME OF REPORTING PERSON
    'certification.administering_officer_name': { x: 290, y: 900, fontSize: 10, maxWidth: 250 },     // NAME OF ADMINISTERING OFFICER
    'certification.duty_investigator.rank_name_designation': { x: 18, y: 950, fontSize: 10, maxWidth: 470 },          // RANK, NAME AND DESIGNATION OF POLICE OFFICER
    
    // Recorded by section
    'certification.recorded_by.desk_officer_rank_name': { x: 290, y: 1000, fontSize: 10, maxWidth: 250 },         // RANK/NAME OF DESK OFFICER
    'certification.recorded_by.blotter_entry_number': { x: 750, y: 1000, fontSize: 10, maxWidth: 120 },      // BLOTTER ENTRY NR
    
    // === POLICE STATION CONTACT DETAILS ===
    'police_station_contact.station_name': { x: 18, y: 1150, fontSize: 10, maxWidth: 500 },        // Name of Police Station
    'police_station_contact.telephone': { x: 550, y: 1150, fontSize: 10, maxWidth: 200 },  // Telephone
    'police_station_contact.investigator_mobile': { x: 18, y: 1180, fontSize: 10, maxWidth: 500 },       // Investigator-on-Case Mobile
    'police_station_contact.chief_head_mobile': { x: 550, y: 1180, fontSize: 10, maxWidth: 200 }              // Chief/Head Mobile
  }
};

/**
 * Get nested field value from object using dot notation
 * Example: getNestedFieldValue(obj, 'reporting_person.family_name')
 * Supports both nested objects and flat dot-notation keys for backward compatibility
 */
function getNestedFieldValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  // First try direct access with dot notation (flat keys)
  if (obj[path] !== undefined) {
    return obj[path];
  }
  
  // Handle direct property access (no dots)
  if (!path.includes('.')) {
    return obj[path];
  }
  
  // Handle nested property access
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

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
  console.log('=== FIELD OVERLAY PROCESS ===');
  console.log('Available form data keys:', Object.keys(formData));
  console.log('Field coordinates to process:', Object.keys(fieldCoordinates));
  
  let fieldsFound = 0;
  let fieldsProcessed = 0;
  
  for (const [fieldName, coordinates] of Object.entries(fieldCoordinates)) {
    fieldsProcessed++;
    const fieldValue = getNestedFieldValue(formData, fieldName);
    
    if (fieldValue) {
      fieldsFound++;
      console.log(`✅ Field ${fieldName}: "${fieldValue}" at (${coordinates.x}, ${coordinates.y})`);
      drawText(ctx, String(fieldValue), coordinates);
    } else {
      console.log(`❌ Field ${fieldName}: NOT FOUND or EMPTY`);
      // Debug: try to find similar keys
      const similarKeys = Object.keys(formData).filter(key => 
        key.includes(fieldName.split('.').pop() || '')
      );
      if (similarKeys.length > 0) {
        console.log(`   Similar keys found:`, similarKeys);
      }
    }
  }
  
  console.log(`=== FIELD OVERLAY SUMMARY ===`);
  console.log(`Fields processed: ${fieldsProcessed}`);
  console.log(`Fields found and drawn: ${fieldsFound}`);
  console.log(`Fields missing: ${fieldsProcessed - fieldsFound}`);
  console.log('=====================================');
  
  console.log('Template canvas created successfully');
  return canvas;
}

/**
 * Transform IRF field names to PDF template field names
 * Maps IRF data keys (e.g., "familyName") to PDF template keys (e.g., "reporting_person.family_name")
 */
function mapIRFKeysToPDFKeys(irfData: Record<string, any>): Record<string, any> {
  console.log('=== MAPPING IRF KEYS TO PDF KEYS ===');
  console.log('Input IRF keys:', Object.keys(irfData));
  
  // Key mapping from IRF field names to PDF template field names
  const keyMapping: Record<string, string> = {
    // Basic IRF info
    'irfEntryNumber': 'irf_entry_number',
    'typeOfIncident': 'type_of_incident',
    'copyFor': 'copy_for',
    'dateTimeReported': 'date_time_reported',
    'dateTimeOfIncident': 'date_time_of_incident',
    'placeOfIncident': 'place_of_incident',
    
    // Reporting Person (Item A)
    'familyName': 'reporting_person.family_name',
    'firstName': 'reporting_person.first_name',
    'middleName': 'reporting_person.middle_name',
    'qualifier': 'reporting_person.qualifier',
    'nickname': 'reporting_person.nickname',
    'citizenship': 'reporting_person.citizenship',
    'sexGender': 'reporting_person.sex_gender',
    'civilStatus': 'reporting_person.civil_status',
    'dateOfBirth': 'reporting_person.date_of_birth',
    'age': 'reporting_person.age',
    'placeOfBirth': 'reporting_person.place_of_birth',
    'homePhone': 'reporting_person.home_phone',
    'mobilePhone': 'reporting_person.mobile_phone',
    'currentAddressStreet': 'reporting_person.current_address.house_number_street',
    'currentAddressVillage': 'reporting_person.current_address.village_sitio',
    'currentAddressBarangay': 'reporting_person.current_address.barangay',
    'currentAddressCity': 'reporting_person.current_address.town_city',
    'currentAddressProvince': 'reporting_person.current_address.province',
    'education': 'reporting_person.highest_educational_attainment',
    'occupation': 'reporting_person.occupation',
    'idCardPresented': 'reporting_person.id_card_presented',
    'emailAddress': 'reporting_person.email_address',
    
    // Suspect Data (Item B)
    'suspectFamilyName': 'suspect.family_name',
    'suspectFirstName': 'suspect.first_name',
    'suspectMiddleName': 'suspect.middle_name',
    'suspectQualifier': 'suspect.qualifier',
    'suspectNickname': 'suspect.nickname',
    'suspectCitizenship': 'suspect.citizenship',
    'suspectSexGender': 'suspect.sex_gender',
    'suspectCivilStatus': 'suspect.civil_status',
    'suspectDateOfBirth': 'suspect.date_of_birth',
    'suspectAge': 'suspect.age',
    'suspectPlaceOfBirth': 'suspect.place_of_birth',
    'suspectHeight': 'suspect.height',
    'suspectWeight': 'suspect.weight',
    'suspectBuilt': 'suspect.built',
    'suspectEyeColor': 'suspect.color_of_eyes',
    'suspectHairColor': 'suspect.color_of_hair',
    'suspectWorkAddress': 'suspect.work_address',
    'relationToVictim': 'suspect.relation_to_victim',
    'previousCriminalRecord': 'suspect.previous_criminal_record',
    'underInfluence': 'suspect.under_influence',
    
    // Victim Data (Item C)
    'victimFamilyName': 'victim.family_name',
    'victimFirstName': 'victim.first_name',
    'victimMiddleName': 'victim.middle_name',
    'victimQualifier': 'victim.qualifier',
    'victimNickname': 'victim.nickname',
    'victimCitizenship': 'victim.citizenship',
    'victimSexGender': 'victim.sex_gender',
    'victimCivilStatus': 'victim.civil_status',
    'victimDateOfBirth': 'victim.date_of_birth',
    'victimAge': 'victim.age',
    'victimPlaceOfBirth': 'victim.place_of_birth',
    'victimEducation': 'victim.highest_educational_attainment',
    'victimOccupation': 'victim.occupation',
    'victimWorkAddress': 'victim.work_address',
    'victimEmailAddress': 'victim.email_address',
    
    // Narrative (Item D)
    'narrativeType': 'incident_narrative.type_of_incident',
    'narrativeDateTime': 'incident_narrative.date_time_of_incident',
    'narrativePlace': 'incident_narrative.place_of_incident',
    'narrativeDetails': 'incident_narrative.narrative_details',
    
    // Certification Section
    'reportingPersonName': 'certification.reporting_person_name',
    'reportingPersonSignature': 'certification.reporting_person_signature',
    'administeringOfficer': 'certification.administering_officer_name',
    'administeringOfficerSignature': 'certification.administering_officer_signature',
    'investigatorName': 'certification.duty_investigator.rank_name_designation',
    'investigatorSignature': 'certification.duty_investigator_signature',
    'deskOfficerName': 'certification.recorded_by.desk_officer_rank_name',
    'deskOfficerSignature': 'certification.desk_officer_signature',
    'blotterEntryNumber': 'certification.recorded_by.blotter_entry_number',
    
    // Police Station Contact
    'policeStationName': 'police_station_contact.station_name',
    'policeStationTelephone': 'police_station_contact.telephone',
    'investigatorMobile': 'police_station_contact.investigator_mobile',
    'chiefMobile': 'police_station_contact.chief_head_mobile'
  };
  
  const mappedData: Record<string, any> = {};
  
  Object.entries(irfData).forEach(([irfKey, value]) => {
    const pdfKey = keyMapping[irfKey];
    if (pdfKey) {
      console.log(`✅ Mapped: ${irfKey} -> ${pdfKey} = "${value}"`);
      mappedData[pdfKey] = value;
    } else {
      // Keep unmapped keys as-is (they might already be in the correct format)
      console.log(`⚠️ No mapping for key: ${irfKey}, keeping as-is`);
      mappedData[irfKey] = value;
    }
  });
  
  console.log('Mapped keys output:', Object.keys(mappedData));
  return mappedData;
}

/**
 * Transform flat dot-notation keys to nested object structure
 * Converts { "reporting_person.family_name": "Santos" } to { reporting_person: { family_name: "Santos" } }
 */
function transformFlatKeysToNestedObject(flatData: Record<string, any>): Record<string, any> {
  console.log('=== TRANSFORM FLAT KEYS TO NESTED ===');
  console.log('Input keys:', Object.keys(flatData));
  
  const nestedData: Record<string, any> = {};
  
  Object.entries(flatData).forEach(([key, value]) => {
    if (!key.includes('.')) {
      // Direct property - no nesting needed
      console.log(`Direct key: ${key} = "${value}"`);
      nestedData[key] = value;
      return;
    }
    
    // Split the key and create nested structure
    const keyParts = key.split('.');
    console.log(`Nested key: ${key} -> ${keyParts.join(' > ')} = "${value}"`);
    let currentLevel = nestedData;
    
    // Navigate/create nested structure
    for (let i = 0; i < keyParts.length - 1; i++) {
      const part = keyParts[i];
      if (!currentLevel[part]) {
        currentLevel[part] = {};
      }
      currentLevel = currentLevel[part];
    }
    
    // Set the final value
    const finalKey = keyParts[keyParts.length - 1];
    currentLevel[finalKey] = value;
  });
  
  console.log('Output nested structure keys:', Object.keys(nestedData));
  return nestedData;
}

/**
 * Generate PDF from IRF template with form data overlay
 */
export async function generateTemplatePDF(
  _template: IRFTemplate,
  irfData: IRFData
): Promise<Blob> {
  try {
    console.log('=== STARTING TEMPLATE PDF GENERATION ===');
    console.log('IRF Data received:', {
      reportId: irfData.reportId,
      templateId: irfData.templateId,
      populatedFields: Object.keys(irfData.populatedFields),
      customFields: Object.keys(irfData.customFields || {})
    });
    
    // Prepare form data for overlay - merge populated and custom fields first
    const flatFormData = {
      ...irfData.populatedFields,
      ...irfData.customFields
    };
    
    console.log('=== FLAT FORM DATA ===');
    console.log('All flat form data keys:', Object.keys(flatFormData));
    console.log('Sample flat form data values:');
    Object.entries(flatFormData).slice(0, 10).forEach(([key, value]) => {
      console.log(`  ${key}: "${value}"`);
    });
    
    // Step 1: Map IRF field names to PDF template field names
    const mappedFormData = mapIRFKeysToPDFKeys(flatFormData);
    
    // Step 2: Transform flat dot-notation keys to nested object structure for PDF overlay
    const formData = transformFlatKeysToNestedObject(mappedFormData);
    
    console.log('=== NESTED FORM DATA ===');
    console.log('Nested form data structure:', Object.keys(formData));
    console.log('Nested form data sample:', JSON.stringify(formData, null, 2).substring(0, 1000));
    
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
  console.log('=== PREVIEW TEMPLATE PDF FUNCTION CALLED ===');
  console.log('Template:', template);
  console.log('IRF Data keys:', Object.keys(irfData));
  console.log('About to call generateTemplatePDF...');
  
  generateTemplatePDF(template, irfData)
    .then(pdfBlob => {
      console.log('✅ PDF blob received, size:', pdfBlob.size);
      const url = URL.createObjectURL(pdfBlob);
      console.log('✅ Object URL created:', url);
      const previewWindow = window.open(url, '_blank');
      
      if (!previewWindow) {
        throw new Error('Failed to open preview window - popup blocker may be active');
      }
      
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      
      console.log('✅ Template PDF preview opened successfully');
    })
    .catch(error => {
      console.error('❌ Error in previewTemplatePDF:', error);
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
