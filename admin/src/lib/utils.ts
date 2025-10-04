// Bootstrap-compatible utility functions

/**
 * Combines class names with proper handling for Bootstrap classes
 * @param classes - Array of class names or conditional class objects
 * @returns Combined class string
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generates Bootstrap variant classes
 * @param variant - Bootstrap variant (primary, secondary, success, etc.)
 * @param component - Component type (btn, badge, alert, etc.)
 * @returns Bootstrap class string
 */
export function getBootstrapVariant(variant: string, component: string = 'btn'): string {
  return `${component}-${variant}`;
}

/**
 * Generates responsive Bootstrap classes
 * @param base - Base class
 * @param breakpoints - Object with breakpoint sizes
 * @returns Responsive class string
 */
export function getResponsiveClasses(base: string, breakpoints: Record<string, string>): string {
  const classes = [base];
  Object.entries(breakpoints).forEach(([breakpoint, value]) => {
    if (breakpoint === 'xs') {
      classes.push(`${base}-${value}`);
    } else {
      classes.push(`${base}-${breakpoint}-${value}`);
    }
  });
  return classes.join(' ');
}

/**
 * Format date for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Get status badge variant based on status
 * @param status - Status string
 * @returns Bootstrap badge variant
 */
export function getStatusVariant(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'warning';
    case 'validated':
    case 'active':
      return 'primary';
    case 'assigned':
      return 'info';
    case 'accepted':
      return 'primary';
    case 'responding':
      return 'info';
    case 'resolved':
    case 'success':
      return 'success';
    case 'rejected':
    case 'error':
    case 'suspended':
      return 'danger';
    case 'inactive':
      return 'secondary';
    default:
      return 'secondary';
  }
}
