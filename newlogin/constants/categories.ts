import { ChildAbuseSubcategory, CrimeSubcategory, MainCategory, ReportCategory, WomenAbuseSubcategory } from '../types';

export const MAIN_CATEGORIES: { value: MainCategory; label: string; icon: any }[] = [
  { value: 'crime', label: 'Crime', icon: require('../assets/images/crime.ico') },
  { value: 'women_abuse', label: 'Women Abuse', icon: require('../assets/images/stop-violence.ico') },
  { value: 'child_abuse', label: 'Child Abuse', icon: require('../assets/images/abused.ico') },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' }
];

export const CRIME_SUBCATEGORIES: { value: CrimeSubcategory; label: string; labelFilipino: string }[] = [
  { value: 'murder', label: 'Murder', labelFilipino: 'Pagpatay' },
  { value: 'rape', label: 'Rape', labelFilipino: 'Panggagahasa' },
  { value: 'physical_injury', label: 'Physical Injury', labelFilipino: 'Pisikal na Pinsala/Pananakit' },
  { value: 'carnapping', label: 'Carnapping', labelFilipino: 'Pagnanakaw ng Sasakyan' },
  { value: 'robbery', label: 'Robbery', labelFilipino: 'Panloloob/Pagnanakaw sa pamamagitan ng puwersa o pananakot' },
  { value: 'theft', label: 'Theft', labelFilipino: 'Pagnanakaw' },
  { value: 'homicide', label: 'Homicide', labelFilipino: 'Homicide' },
  { value: 'scam', label: 'Scam', labelFilipino: 'Panloloko' },
  { value: 'traffic_accident', label: 'Traffic Accident', labelFilipino: 'Aksidente sa Trapiko' },
  { value: 'child_abuse_crime', label: 'Child Abuse', labelFilipino: 'Pang-aabuso sa Bata' },
  { value: 'other_crime', label: 'Other Crime', labelFilipino: 'Iba pang uri ng Krimen' }
];

export const CHILD_ABUSE_SUBCATEGORIES: { value: ChildAbuseSubcategory; label: string }[] = [
  { value: 'physical_abuse', label: 'Physical Abuse' },
  { value: 'sexual_abuse', label: 'Sexual Abuse' },
  { value: 'emotional_abuse', label: 'Emotional/Psychological Abuse' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'child_labor', label: 'Child Labor' },
  { value: 'online_sexual_abuse', label: 'Online Sexual Abuse and Exploitation of Children' },
  { value: 'cicl', label: 'Children in Conflict with the Law (CICL)' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'neglected', label: 'Neglected' },
  { value: 'armed_conflict', label: 'Children in Situation of Armed Conflict' },
  { value: 'other_child_concerns', label: 'Other Concerns' }
];

export const WOMEN_ABUSE_SUBCATEGORIES: { value: WomenAbuseSubcategory; label: string }[] = [
  { value: 'vawc_ra9262', label: 'VAWC (RA 9262)' },
  { value: 'rape_women', label: 'Rape (women)' },
  { value: 'sexual_harassment', label: 'Sexual harassment' },
  { value: 'acts_lasciviousness', label: 'Acts of Lasciviousness' },
  { value: 'photo_video_voyeurism', label: 'Photo/Video Voyeurism' },
  { value: 'human_trafficking', label: 'Human trafficking' },
  { value: 'other_women_abuse', label: 'Other forms of abuse' }
];

export const getSubcategoriesByMain = (mainCategory: MainCategory) => {
  switch (mainCategory) {
    case 'crime':
      return CRIME_SUBCATEGORIES;
    case 'child_abuse':
      return CHILD_ABUSE_SUBCATEGORIES;
    case 'women_abuse':
      return WOMEN_ABUSE_SUBCATEGORIES;
    case 'other':
      return []; // No subcategories for 'other'
    default:
      return [];
  }
};

// Legacy export for backward compatibility
export const REPORT_CATEGORIES = CRIME_SUBCATEGORIES.map(cat => ({
  value: cat.value as ReportCategory,
  label: cat.label,
  icon: '*'
}));

export const REPORT_STATUS_LABELS = {
  pending: 'Pending Review',
  validated: 'Validated',
  responding: 'Under Investigation',
  resolved: 'Resolved',
  rejected: 'Rejected'
} as const;
