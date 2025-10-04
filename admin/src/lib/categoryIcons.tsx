import React from 'react';
import { DotsThreeOutline } from 'phosphor-react';

// Import category icons from assets
import CrimeIcon from '../assets/crime.ico';
import ChildAbuseIcon from '../assets/child_abuse.ico';
import WomenAbuseIcon from '../assets/women_abuse.ico';

export type MainCategory = 'crime' | 'child_abuse' | 'women_abuse' | 'other';

// Category icon mapping
export const categoryIcons: Record<MainCategory, React.ReactNode> = {
  crime: (
    <img 
      src={CrimeIcon} 
      alt="Crime" 
      className="me-2"
      style={{ width: '24px', height: '24px', objectFit: 'contain' }}
    />
  ),
  child_abuse: (
    <img 
      src={ChildAbuseIcon} 
      alt="Child Abuse" 
      className="me-2"
      style={{ width: '24px', height: '24px', objectFit: 'contain' }}
    />
  ),
  women_abuse: (
    <img 
      src={WomenAbuseIcon} 
      alt="Women Abuse" 
      className="me-2"
      style={{ width: '24px', height: '24px', objectFit: 'contain' }}
    />
  ),
  other: (
    <DotsThreeOutline 
      size={24} 
      weight="regular" 
      className="me-2 text-muted"
      style={{ color: '#6c757d' }}
    />
  ),
};

// Category display labels
export const categoryLabels: Record<MainCategory, string> = {
  crime: 'Crime',
  child_abuse: 'Child Abuse',
  women_abuse: 'Women Abuse',
  other: 'Other',
};

/**
 * Get the icon component for a given category
 * @param category - Main category
 * @returns React node with the appropriate icon
 */
export function getCategoryIcon(category: MainCategory | string): React.ReactNode {
  const categoryKey = category as MainCategory;
  return categoryIcons[categoryKey] || categoryIcons.other;
}

/**
 * Get the display label for a given category
 * @param category - Main category
 * @returns Display label
 */
export function getCategoryLabel(category: MainCategory | string): string {
  const categoryKey = category as MainCategory;
  return categoryLabels[categoryKey] || categoryLabels.other;
}

/**
 * Format category for display (with proper casing)
 * @param category - Main category string
 * @returns Formatted category string
 */
export function formatCategoryDisplay(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
