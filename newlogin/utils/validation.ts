import { z } from 'zod';
import { ReportCategory } from '../types';

// Report form validation schema
export const reportFormSchema = z.object({
  mainCategory: z.enum(['crime', 'child_abuse', 'women_abuse', 'other']),
  category: z.enum([
    // Crime subcategories
    'murder',
    'rape',
    'physical_injury',
    'carnapping',
    'robbery',
    'theft',
    'homicide',
    'scam',
    'traffic_accident',
    'child_abuse_crime',
    'other_crime',
    // Child abuse subcategories
    'physical_abuse',
    'sexual_abuse',
    'emotional_abuse',
    'bullying',
    'child_labor',
    'online_sexual_abuse',
    'cicl',
    'abandoned',
    'neglected',
    'armed_conflict',
    'other_child_concerns',
    // Women abuse subcategories
    'vawc_ra9262',
    'rape_women',
    'sexual_harassment',
    'acts_lasciviousness',
    'photo_video_voyeurism',
    'human_trafficking',
    'other_women_abuse'
  ] as const),
  description: z.string()
    .min(10, 'Description must be at least 10 characters.')
    .max(1000, 'Description cannot exceed 1000 characters.'),
  mediaUrls: z.array(z.string().url()).nonempty('At least one piece of evidence (photo or video) is required.'),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.object({
      street: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      region: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      formattedAddress: z.string().optional()
    }).optional(),
    accuracy: z.number().optional()
  })
});

// User registration validation schema
export const userRegistrationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number')
    .optional()
});

// User login validation schema
export const userLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

// User profile update validation schema
export const userProfileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{10,}$/, 'Please enter a valid phone number')
    .optional()
});

export type ReportFormData = z.infer<typeof reportFormSchema>;
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>;
export type UserLoginData = z.infer<typeof userLoginSchema>;
export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>;
