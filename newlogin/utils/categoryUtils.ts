import {
  MAIN_CATEGORIES,
  CRIME_SUBCATEGORIES,
  CHILD_ABUSE_SUBCATEGORIES,
  WOMEN_ABUSE_SUBCATEGORIES,
} from '../constants/categories';
import { MainCategory, ReportCategory } from '../types';

const allSubcategories: {
  mainCategory: MainCategory;
  subcategories: { value: string; label: string }[];
}[] = [
  { mainCategory: 'crime', subcategories: CRIME_SUBCATEGORIES },
  { mainCategory: 'child_abuse', subcategories: CHILD_ABUSE_SUBCATEGORIES },
  { mainCategory: 'women_abuse', subcategories: WOMEN_ABUSE_SUBCATEGORIES },
];

export function findCategoryDetails(subcategoryValue: ReportCategory) {
  for (const group of allSubcategories) {
    const subcategory = group.subcategories.find(
      (sub) => sub.value === subcategoryValue
    );
    if (subcategory) {
      const mainCategory = MAIN_CATEGORIES.find(
        (main) => main.value === group.mainCategory
      );
      return {
        main: mainCategory,
        sub: subcategory,
      };
    }
  }

  // Fallback for 'other' or if not found in subcategories
  const mainCategory = MAIN_CATEGORIES.find((main) => main.value === 'other');
  return {
    main: mainCategory,
    sub: { value: 'other', label: 'Other' },
  };
}
