import { DivIcon } from 'leaflet';
import { STATUS_COLORS } from '../constants/map';
import type { Report } from '../services/firebaseService';

/**
 * Map-related utility functions
 */

// Icon cache to avoid recreation
const iconCache = new Map<string, DivIcon>();

/**
 * Creates a custom marker icon using Phosphor MapPin with status-based coloring
 * @param status - Report status
 * @returns Leaflet DivIcon
 */
export const getMarkerIcon = (status: Report['status']): DivIcon => {
  const cacheKey = status;
  
  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey)!;
  }
  
  const color = STATUS_COLORS[status];
  
  // Create SVG with Phosphor MapPin icon
  const svgIcon = `
    <svg width="32" height="32" fill="${color}" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"/>
    </svg>
  `;
  
  const icon = new DivIcon({
    html: svgIcon,
    className: 'custom-div-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
  
  iconCache.set(cacheKey, icon);
  return icon;
};

/**
 * Filters reports that have valid location data
 * @param reports - Array of reports
 * @returns Reports with valid latitude and longitude
 */
export const filterReportsWithLocation = (reports: Report[]): Report[] => {
  return reports.filter(report => 
    report.location?.latitude !== undefined && 
    report.location?.longitude !== undefined
  );
};

/**
 * Gets the status badge variant class for Bootstrap styling
 * @param status - Report status
 * @returns Bootstrap badge variant class
 */
export const getStatusVariant = (status: Report['status']): string => {
  switch (status) {
    case 'pending': return 'warning';
    case 'validated': return 'primary';
    case 'responding': return 'info';
    case 'resolved': return 'success';
    case 'rejected': return 'danger';
    default: return 'secondary';
  }
};
