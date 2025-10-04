import type { LatLngBoundsExpression } from 'leaflet';

/**
 * Map configuration constants for Pangasinan province
 * 
 * Pangasinan has 44 municipalities and 4 cities:
 * Municipalities: Agno, Aguilar, Alcala, Anda, Asingan, Balungao, Bani, Basista, 
 * Bautista, Bayambang, Binalonan, Binmaley, Bolinao, Bugallon, Burgos, Calasiao, 
 * Dasol, Infanta, Labrador, Laoac, Lingayen, Mabini, Malasiqui, Manaoag, Mangaldan, 
 * Mangatarem, Mapandan, Natividad, Pozorrubio, Rosales, San Fabian, San Jacinto, 
 * San Manuel, San Nicolas, San Quintin, Santa Barbara, Santa Maria, Santo Tomas, 
 * Sison, Sual, Tayug, Umingan, Urbiztondo, Villasis
 * 
 * Cities: Alaminos, Dagupan, San Carlos, Urdaneta
 */

// Pangasinan province geographical bounds (simplified)
// Approximate bounds covering the entire province
// Southwest: [15.70, 119.80], Northeast: [16.60, 120.80]
export const PANGASINAN_BOUNDS: LatLngBoundsExpression = [
  [15.70, 119.80], // Southwest corner
  [16.60, 120.80]  // Northeast corner
];

// Center of Pangasinan province (Dagupan - geographic center)
export const MAP_CENTER: [number, number] = [16.043, 120.190];

// Default zoom level for the province view
export const DEFAULT_ZOOM = 9;

// Minimum and maximum zoom levels
export const MIN_ZOOM = 8;
export const MAX_ZOOM = 18;

// Status colors matching Bootstrap theme
export const STATUS_COLORS = {
  pending: '#ffc107',     // Bootstrap warning
  validated: '#0d6efd',   // Bootstrap primary  
  responding: '#fd7e14',  // Bootstrap orange
  resolved: '#198754',    // Bootstrap success
  rejected: '#dc3545',    // Bootstrap danger
  assigned: '#6f42c1',    // Bootstrap purple for assigned status
  accepted: '#17a2b8',    // Bootstrap teal for accepted status
  investigating: '#20c997' // Bootstrap success variant for investigating
} as const;

