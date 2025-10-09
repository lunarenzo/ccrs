/**
 * Crime Categories Seed Script
 * Sprint 2: Investigation & Approval Workflows
 * 
 * This script populates the Firestore crimeCategories collection with
 * Philippine RPC and Special Laws data for the PNP system.
 * 
 * Usage: Import and call seedCrimeCategories() from admin dashboard
 */

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import crimeCategoriesData from '../../../shared-data/crime-categories-seed.json';
import type { CrimeCategory } from '../../../shared-types/sprint2-interfaces';

interface SeedResult {
  success: boolean;
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function seedCrimeCategories(adminUserId: string): Promise<SeedResult> {
  const result: SeedResult = {
    success: false,
    inserted: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🌱 Starting crime categories seeding...');
    
    const crimeCategoriesCollection = collection(db, 'crimeCategories');
    
    for (const categoryData of crimeCategoriesData) {
      try {
        const category: Omit<CrimeCategory, 'createdAt' | 'updatedAt'> = {
          id: categoryData.id,
          code: categoryData.code,
          title: categoryData.title,
          description: categoryData.description,
          category: categoryData.category as 'rpc' | 'special_law',
          penalty: categoryData.penalty,
          elements: categoryData.elements || [],
          isActive: categoryData.isActive,
          createdBy: adminUserId
        };

        // Use the predefined ID to ensure consistency
        const docRef = doc(crimeCategoriesCollection, categoryData.id);
        
        await setDoc(docRef, {
          ...category,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        result.inserted++;
        console.log(`✅ Inserted: ${category.code} - ${category.title}`);
        
      } catch (error) {
        result.errors.push(`Failed to insert ${categoryData.code}: ${error}`);
        console.error(`❌ Error inserting ${categoryData.code}:`, error);
      }
    }

    result.success = result.errors.length === 0;
    console.log(`🎉 Seeding completed! Inserted: ${result.inserted}, Errors: ${result.errors.length}`);
    
    return result;
    
  } catch (error) {
    result.errors.push(`General seeding error: ${error}`);
    console.error('❌ General seeding error:', error);
    return result;
  }
}

/**
 * Verify that all categories were inserted correctly
 */
export async function verifyCrimeCategories(): Promise<{
  total: number;
  rpcCount: number;
  specialLawCount: number;
  missingCategories: string[];
}> {
  try {
    const { getDocs, query, where } = await import('firebase/firestore');
    
    // Count RPC categories
    const rpcQuery = query(
      collection(db, 'crimeCategories'),
      where('category', '==', 'rpc'),
      where('isActive', '==', true)
    );
    const rpcSnapshot = await getDocs(rpcQuery);
    
    // Count Special Law categories
    const specialLawQuery = query(
      collection(db, 'crimeCategories'),
      where('category', '==', 'special_law'),
      where('isActive', '==', true)
    );
    const specialLawSnapshot = await getDocs(specialLawQuery);
    
    // Check for missing categories
    const allDocsQuery = query(collection(db, 'crimeCategories'));
    const allSnapshot = await getDocs(allDocsQuery);
    const existingIds = allSnapshot.docs.map(doc => doc.id);
    const expectedIds = crimeCategoriesData.map(cat => cat.id);
    const missingCategories = expectedIds.filter(id => !existingIds.includes(id));
    
    return {
      total: rpcSnapshot.docs.length + specialLawSnapshot.docs.length,
      rpcCount: rpcSnapshot.docs.length,
      specialLawCount: specialLawSnapshot.docs.length,
      missingCategories
    };
    
  } catch (error) {
    console.error('Error verifying crime categories:', error);
    throw error;
  }
}

/**
 * Update existing crime categories with new data
 * Use this when you need to modify existing categories
 */
export async function updateCrimeCategories(_adminUserId: string): Promise<SeedResult> {
  const result: SeedResult = {
    success: false,
    inserted: 0,
    skipped: 0,
    errors: []
  };

  try {
    console.log('🔄 Updating existing crime categories...');
    
    const { updateDoc } = await import('firebase/firestore');
    const crimeCategoriesCollection = collection(db, 'crimeCategories');
    
    for (const categoryData of crimeCategoriesData) {
      try {
        const docRef = doc(crimeCategoriesCollection, categoryData.id);
        
        const updateData = {
          code: categoryData.code,
          title: categoryData.title,
          description: categoryData.description,
          category: categoryData.category,
          penalty: categoryData.penalty,
          elements: categoryData.elements || [],
          isActive: categoryData.isActive,
          updatedAt: serverTimestamp()
        };

        await updateDoc(docRef, updateData);
        
        result.inserted++;
        console.log(`✅ Updated: ${categoryData.code} - ${categoryData.title}`);
        
      } catch (error) {
        result.errors.push(`Failed to update ${categoryData.code}: ${error}`);
        console.error(`❌ Error updating ${categoryData.code}:`, error);
      }
    }

    result.success = result.errors.length === 0;
    console.log(`🎉 Update completed! Updated: ${result.inserted}, Errors: ${result.errors.length}`);
    
    return result;
    
  } catch (error) {
    result.errors.push(`General update error: ${error}`);
    console.error('❌ General update error:', error);
    return result;
  }
}

/**
 * Emergency function to clear all crime categories
 * Use with caution - this will delete all data!
 */
export async function clearCrimeCategories(): Promise<boolean> {
  try {
    console.log('🗑️ Clearing all crime categories...');
    
    const { getDocs, deleteDoc } = await import('firebase/firestore');
    const snapshot = await getDocs(collection(db, 'crimeCategories'));
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`🎉 Cleared ${snapshot.docs.length} crime categories`);
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing crime categories:', error);
    return false;
  }
}

/**
 * Get crime categories statistics
 */
export async function getCrimeCategoriesStats() {
  try {
    const verification = await verifyCrimeCategories();
    
    return {
      ...verification,
      status: verification.missingCategories.length === 0 ? 'complete' : 'incomplete',
      completionPercentage: Math.round(
        ((verification.total - verification.missingCategories.length) / crimeCategoriesData.length) * 100
      )
    };
    
  } catch (error) {
    console.error('Error getting crime categories stats:', error);
    throw error;
  }
}