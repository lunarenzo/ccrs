/**
 * Template Coordinate Debugger
 * 
 * This utility helps fine-tune the field coordinates for the template-based PDF generator.
 * Run this in the browser console while viewing the IRF preview to visualize and adjust field positions.
 */

// Debug function to overlay coordinate guides on template images
function debugTemplateCoordinates() {
  console.log('Template Coordinate Debugger loaded');
  console.log('Available functions:');
  console.log('- showCoordinateOverlay() - Show coordinate grid on template');
  console.log('- updateFieldPosition(fieldName, x, y) - Test new field positions');
  console.log('- exportCoordinates() - Export current coordinates for code update');
  
  // Current field coordinates (copy from templatePdfGenerator.ts)
  window.DEBUG_COORDINATES = {
    page1: {
      irfEntryNumber: { x: 400, y: 280, fontSize: 100, maxWidth: 200 },
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
      
      reportingPersonName: { x: 400, y: 2800, fontSize: 11, maxWidth: 300 },
      blotterEntryNumber: { x: 800, y: 2800, fontSize: 11, maxWidth: 200 }
    },
    page2: {
      narrativeType: { x: 400, y: 200, fontSize: 11, maxWidth: 400 },
      narrativeDateTime: { x: 400, y: 240, fontSize: 11, maxWidth: 400 },
      narrativePlace: { x: 400, y: 280, fontSize: 11, maxWidth: 600 },
      narrativeDetails: { x: 400, y: 350, fontSize: 10, maxWidth: 800, maxHeight: 500, multiLine: true },
      
      deskOfficerName: { x: 400, y: 2400, fontSize: 11, maxWidth: 300 },
      investigatorName: { x: 800, y: 2400, fontSize: 11, maxWidth: 300 },
      
      policeStationName: { x: 400, y: 2600, fontSize: 11, maxWidth: 400 },
      administeringOfficer: { x: 400, y: 2800, fontSize: 11, maxWidth: 300 }
    }
  };
}

// Show coordinate overlay on template image
function showCoordinateOverlay(page = 'page1') {
  const templatePath = page === 'page1' 
    ? '/shared-data/Police-Report-Template-Sample_001.jpg'
    : '/shared-data/Police-Report-Template-Sample_002.jpg';
  
  // Create overlay canvas
  const canvas = document.createElement('canvas');
  canvas.width = 2481;
  canvas.height = 3507;
  canvas.style.position = 'fixed';
  canvas.style.top = '50px';
  canvas.style.left = '50px';
  canvas.style.zIndex = '9999';
  canvas.style.border = '2px solid red';
  canvas.style.maxWidth = '80vw';
  canvas.style.maxHeight = '80vh';
  canvas.style.backgroundColor = 'rgba(255,255,255,0.9)';
  canvas.id = 'coordinate-overlay';
  
  const ctx = canvas.getContext('2d');
  
  // Load template image
  const img = new Image();
  img.onload = function() {
    // Draw template
    ctx.drawImage(img, 0, 0);
    
    // Draw coordinate guides
    const coords = window.DEBUG_COORDINATES[page];
    ctx.fillStyle = 'red';
    ctx.font = '12px Arial';
    
    for (const [fieldName, config] of Object.entries(coords)) {
      // Draw coordinate point
      ctx.fillRect(config.x - 2, config.y - 2, 4, 4);
      
      // Draw field name label
      ctx.fillStyle = 'yellow';
      ctx.fillRect(config.x, config.y - 20, fieldName.length * 8, 16);
      ctx.fillStyle = 'black';
      ctx.fillText(fieldName, config.x + 2, config.y - 6);
      
      // Draw bounding box
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(config.x, config.y, config.maxWidth, 20);
      
      ctx.fillStyle = 'red';
    }
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '5px';
    closeBtn.style.right = '5px';
    closeBtn.style.zIndex = '10000';
    closeBtn.style.fontSize = '20px';
    closeBtn.onclick = () => {
      document.body.removeChild(canvas);
      document.body.removeChild(closeBtn);
    };
    
    document.body.appendChild(canvas);
    document.body.appendChild(closeBtn);
  };
  
  img.src = templatePath;
}

// Update field position for testing
function updateFieldPosition(page, fieldName, x, y, fontSize, maxWidth) {
  if (!window.DEBUG_COORDINATES[page] || !window.DEBUG_COORDINATES[page][fieldName]) {
    console.error(`Field ${fieldName} not found in ${page}`);
    return;
  }
  
  window.DEBUG_COORDINATES[page][fieldName].x = x;
  window.DEBUG_COORDINATES[page][fieldName].y = y;
  if (fontSize) window.DEBUG_COORDINATES[page][fieldName].fontSize = fontSize;
  if (maxWidth) window.DEBUG_COORDINATES[page][fieldName].maxWidth = maxWidth;
  
  console.log(`Updated ${fieldName}:`, window.DEBUG_COORDINATES[page][fieldName]);
}

// Export current coordinates for code update
function exportCoordinates() {
  console.log('=== UPDATED COORDINATES FOR COPY/PASTE ===');
  console.log('const FIELD_COORDINATES = {');
  
  for (const [page, fields] of Object.entries(window.DEBUG_COORDINATES)) {
    console.log(`  ${page}: {`);
    for (const [fieldName, config] of Object.entries(fields)) {
      console.log(`    ${fieldName}: ${JSON.stringify(config)},`);
    }
    console.log('  },');
  }
  
  console.log('};');
  console.log('=== END COORDINATES ===');
}

// Usage instructions
console.log('Template Coordinate Debugger Instructions:');
console.log('1. Run debugTemplateCoordinates() to initialize');
console.log('2. Run showCoordinateOverlay("page1") or showCoordinateOverlay("page2") to see current positions');
console.log('3. Use updateFieldPosition(page, fieldName, x, y) to test new positions');
console.log('4. Run exportCoordinates() to get updated code for templatePdfGenerator.ts');

// Initialize on load
debugTemplateCoordinates();