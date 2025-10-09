/**
 * IRF Template Seeding Script
 * PNP Citizen Crime Reporting System (CCRS)
 * 
 * This script seeds the official PNP Incident Record Form template
 * into the Firestore 'irfTemplates' collection.
 */

import { collection, doc, setDoc, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { IRFTemplate } from '../../../shared-types/sprint2-interfaces';

// Load the IRF template from JSON file
async function loadIRFTemplate(): Promise<any> {
  try {
    const response = await fetch('/shared-data/irf-template.json');
    const template = await response.json();
    return template;
  } catch (error) {
    console.error('Error loading IRF template:', error);
    // Fallback: return a minimal template
    return {
      id: 'pnp-irf-v1.0',
      name: 'PNP Incident Record Form',
      version: '1.0',
      description: 'Official Philippine National Police Incident Record Form template based on DIDM standards',
      isActive: true,
      sections: {},
      requiredFields: [],
      optionalFields: []
    };
  }
}

/**
 * Seeds the IRF template into Firestore
 * @param adminUserId - The admin user ID performing the seeding
 * @returns Promise<boolean> - Success status
 */
export async function seedIRFTemplate(adminUserId: string): Promise<boolean> {
  try {
    console.log('🔄 Starting IRF template seeding...');
    
    // Load template data
    const templateData = await loadIRFTemplate();
    
    // Convert to Firestore-compatible format
    const irfTemplate: IRFTemplate = {
      id: templateData.id || 'pnp-irf-v1.0',
      name: templateData.name || 'PNP Incident Record Form',
      version: templateData.version || '1.0',
      description: templateData.description,
      isActive: true,
      sections: templateData.sections || {},
      requiredFields: templateData.requiredFields || [],
      optionalFields: templateData.optionalFields || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: adminUserId
    };
    
    // Store in Firestore
    const irfTemplatesRef = collection(db, 'irfTemplates');
    const templateRef = doc(irfTemplatesRef, irfTemplate.id);
    
    await setDoc(templateRef, irfTemplate, { merge: true });
    
    console.log(`✅ IRF template seeded successfully: ${irfTemplate.name} v${irfTemplate.version}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error seeding IRF template:', error);
    return false;
  }
}

/**
 * Deactivate all existing IRF templates and activate a specific one
 * @param templateId - The template ID to activate
 * @param adminUserId - Admin user performing the action
 */
export async function setActiveIRFTemplate(templateId: string, adminUserId: string): Promise<boolean> {
  try {
    console.log(`🔄 Setting active IRF template: ${templateId}`);
    
    const batch = writeBatch(db);
    const irfTemplatesRef = collection(db, 'irfTemplates');
    
    // Get all templates
    const templatesSnapshot = await getDocs(irfTemplatesRef);
    
    // Deactivate all templates first
    templatesSnapshot.docs.forEach(docSnapshot => {
      const templateRef = doc(db, 'irfTemplates', docSnapshot.id);
      batch.update(templateRef, { 
        isActive: false, 
        updatedAt: Timestamp.now() 
      });
    });
    
    // Activate the specified template
    const targetTemplateRef = doc(db, 'irfTemplates', templateId);
    batch.update(targetTemplateRef, { 
      isActive: true, 
      updatedAt: Timestamp.now(),
      updatedBy: adminUserId
    });
    
    await batch.commit();
    
    console.log(`✅ IRF template activated: ${templateId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error setting active IRF template:', error);
    return false;
  }
}

/**
 * Get the currently active IRF template
 * @returns Promise<IRFTemplate | null>
 */
export async function getActiveIRFTemplate(): Promise<IRFTemplate | null> {
  try {
    const irfTemplatesRef = collection(db, 'irfTemplates');
    const templatesSnapshot = await getDocs(irfTemplatesRef);
    
    const activeTemplate = templatesSnapshot.docs.find(doc => 
      doc.data().isActive === true
    );
    
    if (activeTemplate) {
      return { id: activeTemplate.id, ...activeTemplate.data() } as IRFTemplate;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Error getting active IRF template:', error);
    return null;
  }
}

/**
 * Verify IRF template seeding
 * @returns Promise<object> - Verification results
 */
export async function verifyIRFTemplateSeeding(): Promise<{
  success: boolean;
  templateCount: number;
  activeTemplate?: string;
  errors?: string[];
}> {
  try {
    console.log('🔍 Verifying IRF template seeding...');
    
    const irfTemplatesRef = collection(db, 'irfTemplates');
    const snapshot = await getDocs(irfTemplatesRef);
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as (IRFTemplate & { id: string })[];
    
    const activeTemplates = templates.filter(t => t.isActive);
    const errors: string[] = [];
    
    // Validation checks
    if (templates.length === 0) {
      errors.push('No IRF templates found');
    }
    
    if (activeTemplates.length === 0) {
      errors.push('No active IRF template found');
    }
    
    if (activeTemplates.length > 1) {
      errors.push(`Multiple active templates found (${activeTemplates.length}). Only one should be active.`);
    }
    
    const result = {
      success: errors.length === 0,
      templateCount: templates.length,
      activeTemplate: activeTemplates[0]?.name,
      errors: errors.length > 0 ? errors : undefined
    };
    
    if (result.success) {
      console.log(`✅ IRF template verification passed: ${result.templateCount} templates, active: ${result.activeTemplate}`);
    } else {
      console.log('❌ IRF template verification failed:', errors);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error verifying IRF template seeding:', error);
    return {
      success: false,
      templateCount: 0,
      errors: [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Update IRF template with new data
 * @param templateId - Template ID to update
 * @param updates - Partial template data to update
 * @param adminUserId - Admin user performing the update
 */
export async function updateIRFTemplate(
  templateId: string, 
  updates: Partial<IRFTemplate>, 
  adminUserId: string
): Promise<boolean> {
  try {
    console.log(`🔄 Updating IRF template: ${templateId}`);
    
    const templateRef = doc(db, 'irfTemplates', templateId);
    
    await setDoc(templateRef, {
      ...updates,
      updatedAt: Timestamp.now(),
      updatedBy: adminUserId
    }, { merge: true });
    
    console.log(`✅ IRF template updated: ${templateId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Error updating IRF template:', error);
    return false;
  }
}

// Export all functions for admin dashboard usage
export {
  loadIRFTemplate,
  seedIRFTemplate as default
};