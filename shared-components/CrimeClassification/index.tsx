/**
 * Crime Classification Component
 * Sprint 2: Investigation & Approval Workflows
 * 
 * A reusable React component for selecting crime categories with:
 * - RPC and Special Laws classification
 * - Local caching with IndexedDB for Firebase Free Tier optimization
 * - Search and filtering capabilities
 * - Mobile-responsive design
 * - TypeScript support
 */

import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust import path as needed
import { CrimeCategory, CrimeClassificationType, CrimeSelectOption } from '../../shared-types/sprint2-interfaces';
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import './CrimeClassification.css';

// IndexedDB Schema for local caching
interface CrimeCacheDB extends DBSchema {
  crimeCategories: {
    key: string;
    value: CrimeCategory & { cachedAt: number };
  };
  metadata: {
    key: string;
    value: { lastFetch: number; version: string };
  };
}

interface CrimeClassificationProps {
  value?: string;                    // Selected crime category ID
  onChange: (categoryId: string, code: string, title: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showDescription?: boolean;         // Show crime description tooltip
  filterByType?: CrimeClassificationType; // Filter by 'rpc' or 'special_law'
  allowSearch?: boolean;             // Enable search functionality
  compact?: boolean;                 // Compact mode for mobile
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const DB_NAME = 'CrimeCategoriesCache';
const DB_VERSION = 1;

export const CrimeClassification: React.FC<CrimeClassificationProps> = ({
  value = '',
  onChange,
  required = false,
  placeholder = 'Select Crime Category',
  className = '',
  disabled = false,
  showDescription = true,
  filterByType,
  allowSearch = true,
  compact = false
}) => {
  const [categories, setCategories] = useState<CrimeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [db, setDb] = useState<IDBPDatabase<CrimeCacheDB> | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB<CrimeCacheDB>(DB_NAME, DB_VERSION, {
          upgrade(db) {
            // Create object stores
            if (!db.objectStoreNames.contains('crimeCategories')) {
              db.createObjectStore('crimeCategories', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
              db.createObjectStore('metadata', { keyPath: 'key' });
            }
          },
        });
        setDb(database);
      } catch (err) {
        console.error('Failed to initialize IndexedDB:', err);
        // Continue without caching if IndexedDB fails
      }
    };

    initDB();
  }, []);

  // Load crime categories with caching
  useEffect(() => {
    const loadCrimeCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cache first
        if (db) {
          const cachedData = await loadFromCache();
          if (cachedData && cachedData.length > 0) {
            setCategories(cachedData);
            setLoading(false);
            return;
          }
        }

        // Fetch from Firestore
        const data = await fetchFromFirestore();
        setCategories(data);

        // Cache the data
        if (db && data.length > 0) {
          await saveToCache(data);
        }
      } catch (err) {
        console.error('Error loading crime categories:', err);
        setError('Failed to load crime categories');
      } finally {
        setLoading(false);
      }
    };

    if (db !== null) { // Wait for DB to be initialized (or failed)
      loadCrimeCategories();
    }
  }, [db]);

  // Load from IndexedDB cache
  const loadFromCache = async (): Promise<CrimeCategory[] | null> => {
    if (!db) return null;

    try {
      // Check cache validity
      const metadata = await db.get('metadata', 'lastFetch');
      const now = Date.now();

      if (!metadata || (now - metadata.lastFetch) > CACHE_DURATION) {
        return null; // Cache expired
      }

      // Load cached categories
      const cachedCategories = await db.getAll('crimeCategories');
      return cachedCategories.map(item => {
        const { cachedAt, ...category } = item;
        return category as CrimeCategory;
      });
    } catch (err) {
      console.error('Error loading from cache:', err);
      return null;
    }
  };

  // Fetch from Firestore
  const fetchFromFirestore = async (): Promise<CrimeCategory[]> => {
    let q = query(
      collection(db, 'crimeCategories'),
      where('isActive', '==', true),
      orderBy('category'),
      orderBy('code')
    );

    if (filterByType) {
      q = query(
        collection(db, 'crimeCategories'),
        where('isActive', '==', true),
        where('category', '==', filterByType),
        orderBy('code')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CrimeCategory[];
  };

  // Save to IndexedDB cache
  const saveToCache = async (data: CrimeCategory[]) => {
    if (!db) return;

    try {
      const tx = db.transaction(['crimeCategories', 'metadata'], 'readwrite');
      
      // Clear old data
      await tx.objectStore('crimeCategories').clear();
      
      // Save new data
      const now = Date.now();
      for (const category of data) {
        await tx.objectStore('crimeCategories').put({
          ...category,
          cachedAt: now
        });
      }
      
      // Update metadata
      await tx.objectStore('metadata').put({
        key: 'lastFetch',
        lastFetch: now,
        version: '1.0'
      });
      
      await tx.done;
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  };

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.title.toLowerCase().includes(search) ||
        cat.code.toLowerCase().includes(search) ||
        cat.description?.toLowerCase().includes(search)
      );
    }

    // Group by category type
    const rpcCategories = filtered.filter(cat => cat.category === 'rpc');
    const specialLawCategories = filtered.filter(cat => cat.category === 'special_law');

    return { rpcCategories, specialLawCategories };
  }, [categories, searchTerm]);

  // Convert to select options
  const selectOptions: CrimeSelectOption[] = useMemo(() => {
    return categories.map(cat => ({
      value: cat.id,
      label: `${cat.code} - ${cat.title}`,
      code: cat.code,
      category: cat.category,
      description: cat.description
    }));
  }, [categories]);

  // Find selected category
  const selectedCategory = categories.find(cat => cat.id === value);

  // Handle selection
  const handleSelect = (category: CrimeCategory) => {
    onChange(category.id, category.code, category.title);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Render category option
  const renderCategoryOption = (category: CrimeCategory) => (
    <div
      key={category.id}
      className={`crime-option ${compact ? 'crime-option--compact' : ''}`}
      onClick={() => handleSelect(category)}
      title={showDescription ? category.description : undefined}
    >
      <div className="crime-option__code">{category.code}</div>
      <div className="crime-option__title">{category.title}</div>
      {!compact && category.penalty && (
        <div className="crime-option__penalty">{category.penalty}</div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`crime-classification ${className}`}>
        <div className="crime-classification__loading">
          <span>Loading crime categories...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`crime-classification ${className}`}>
        <div className="crime-classification__error">
          <span>{error}</span>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`crime-classification ${className} ${compact ? 'crime-classification--compact' : ''}`}>
      <label className="crime-classification__label">
        Crime Classification {required && <span className="required">*</span>}
      </label>
      
      <div className="crime-classification__dropdown">
        <button
          type="button"
          className={`crime-classification__trigger ${isOpen ? 'crime-classification__trigger--open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="crime-classification__value">
            {selectedCategory 
              ? `${selectedCategory.code} - ${selectedCategory.title}`
              : placeholder
            }
          </span>
          <span className="crime-classification__arrow">▼</span>
        </button>

        {isOpen && (
          <div className="crime-classification__dropdown-content">
            {allowSearch && (
              <div className="crime-classification__search">
                <input
                  type="text"
                  placeholder="Search crime categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="crime-classification__search-input"
                />
              </div>
            )}

            <div className="crime-classification__options">
              {!filterByType && (
                <>
                  {filteredCategories.rpcCategories.length > 0 && (
                    <div className="crime-classification__group">
                      <div className="crime-classification__group-header">
                        Revised Penal Code (RPC)
                      </div>
                      {filteredCategories.rpcCategories.map(renderCategoryOption)}
                    </div>
                  )}

                  {filteredCategories.specialLawCategories.length > 0 && (
                    <div className="crime-classification__group">
                      <div className="crime-classification__group-header">
                        Special Laws
                      </div>
                      {filteredCategories.specialLawCategories.map(renderCategoryOption)}
                    </div>
                  )}
                </>
              )}

              {filterByType && (
                <div className="crime-classification__group">
                  {[...filteredCategories.rpcCategories, ...filteredCategories.specialLawCategories]
                    .map(renderCategoryOption)}
                </div>
              )}

              {filteredCategories.rpcCategories.length === 0 && 
               filteredCategories.specialLawCategories.length === 0 && (
                <div className="crime-classification__no-results">
                  No crime categories found
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="crime-classification__clear-search"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedCategory && showDescription && !compact && (
        <div className="crime-classification__description">
          <strong>Description:</strong> {selectedCategory.description}
          {selectedCategory.penalty && (
            <>
              <br />
              <strong>Penalty:</strong> {selectedCategory.penalty}
            </>
          )}
        </div>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name="crimeCategory"
        value={value}
        required={required}
      />
    </div>
  );
};

export default CrimeClassification;