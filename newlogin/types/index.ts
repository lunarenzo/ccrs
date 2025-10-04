// User types
export interface User {
  id: string;
  name?: string;
  email?: string | null;
  phoneNumber?: string | null; // Consistent field name
  role: 'citizen' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
  authMethod?: 'email' | 'phone';
  isPhoneVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Report types
export interface Report {
  id: string;
  user_id?: string | null; // nullable for anonymous reports
  mainCategory: MainCategory;
  category: ReportCategory;
  description: string;
  media_urls?: string[];
  location?: Location;
  status: ReportStatus;
  timestamp: Date;
  updatedAt: Date;
  // Sprint 1: Emergency Triage fields
  isEmergency?: boolean;
  triageLevel?: TriageLevel;
  triageNotes?: string;
  triageBy?: string; // Officer UID
  triageAt?: Date;
  // Sprint 1: Blotter numbering fields
  blotterNumber?: string;
  blotterCreatedAt?: Date;
  blotterCreatedBy?: string; // Officer UID
}

export type MainCategory = 'crime' | 'child_abuse' | 'women_abuse' | 'other';

export type CrimeSubcategory = 
  | 'murder'
  | 'rape'
  | 'physical_injury'
  | 'carnapping'
  | 'robbery'
  | 'theft'
  | 'homicide'
  | 'scam'
  | 'traffic_accident'
  | 'child_abuse_crime'
  | 'other_crime';

export type ChildAbuseSubcategory = 
  | 'physical_abuse'
  | 'sexual_abuse'
  | 'emotional_abuse'
  | 'bullying'
  | 'child_labor'
  | 'online_sexual_abuse'
  | 'cicl'
  | 'abandoned'
  | 'neglected'
  | 'armed_conflict'
  | 'other_child_concerns';

export type WomenAbuseSubcategory = 
  | 'vawc_ra9262'
  | 'rape_women'
  | 'sexual_harassment'
  | 'acts_lasciviousness'
  | 'photo_video_voyeurism'
  | 'human_trafficking'
  | 'other_women_abuse';

export type ReportCategory = CrimeSubcategory | ChildAbuseSubcategory | WomenAbuseSubcategory;

export type ReportStatus = 
  | 'pending'
  | 'validated'
  | 'responding'
  | 'resolved'
  | 'rejected';

export type TriageLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Location {
  latitude: number;
  longitude: number;
  address?: DetailedAddress;
  accuracy?: number;
}

export interface DetailedAddress {
  street?: string;
  district?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string; // fallback for display
}

// Form types
export interface ReportFormData {
  mainCategory: MainCategory;
  category: ReportCategory;
  description: string;
  media?: string;
  location?: Location;
}

// Authentication types
export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  authMethod?: 'email' | 'phone';
  isPhoneVerified?: boolean;
  isAnonymous: boolean;
  // RBAC fields (from Firebase custom claims)
  role?: 'citizen' | 'officer' | 'supervisor' | 'admin';
  status?: 'active' | 'inactive' | 'suspended';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
