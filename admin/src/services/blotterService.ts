import { doc, runTransaction, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface BlotterCounter {
  year: number;
  month: number;
  lastNumber: number;
  updatedAt: Timestamp;
}

export interface BlotterNumberResult {
  success: boolean;
  blotterNumber?: string;
  error?: string;
}

export class BlotterService {
  /**
   * Generates the next sequential blotter number for the current month
   * Format: YYYY-MM-NNNNNN (e.g., "2025-10-000001")
   */
  static async generateBlotterNumber(): Promise<BlotterNumberResult> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed

      const counterDocId = `${year}-${month.toString().padStart(2, '0')}`;
      const counterRef = doc(db, 'counters', counterDocId);

      const result = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        
        let nextNumber = 1;
        
        if (counterDoc.exists()) {
          const data = counterDoc.data() as BlotterCounter;
          // Verify we're still in the same month/year
          if (data.year === year && data.month === month) {
            nextNumber = data.lastNumber + 1;
          }
        }

        // Update the counter
        const updatedCounter: BlotterCounter = {
          year,
          month,
          lastNumber: nextNumber,
          updatedAt: Timestamp.now(),
        };

        transaction.set(counterRef, updatedCounter);

        // Generate formatted blotter number
        const blotterNumber = `${year}-${month.toString().padStart(2, '0')}-${nextNumber.toString().padStart(6, '0')}`;
        
        return blotterNumber;
      });

      return {
        success: true,
        blotterNumber: result,
      };
    } catch (error) {
      console.error('Error generating blotter number:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate blotter number',
      };
    }
  }

  /**
   * Validates blotter number format
   */
  static validateBlotterNumber(blotterNumber: string): boolean {
    const blotterRegex = /^\d{4}-\d{2}-\d{6}$/;
    return blotterRegex.test(blotterNumber);
  }

  /**
   * Extracts year, month, and number from blotter number
   */
  static parseBlotterNumber(blotterNumber: string): {
    year: number;
    month: number;
    number: number;
  } | null {
    if (!this.validateBlotterNumber(blotterNumber)) {
      return null;
    }

    const parts = blotterNumber.split('-');
    return {
      year: parseInt(parts[0], 10),
      month: parseInt(parts[1], 10),
      number: parseInt(parts[2], 10),
    };
  }

  /**
   * Gets the current counter for a specific year/month (for debugging/admin purposes)
   */
  static async getCurrentCounter(year?: number, month?: number): Promise<BlotterCounter | null> {
    try {
      const now = new Date();
      const targetYear = year || now.getFullYear();
      const targetMonth = month || (now.getMonth() + 1);

      const counterDocId = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
      const counterRef = doc(db, 'counters', counterDocId);
      
      const counterDoc = await getDoc(counterRef);
      
      if (counterDoc.exists()) {
        return counterDoc.data() as BlotterCounter;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting current counter:', error);
      return null;
    }
  }
}