# ReportsTable Component

A professional, feature-rich table component for managing crime reporting system reports in the admin dashboard.

## Features

- **Category Icons**: Utilizes custom icons from assets for main categories (crime, child_abuse, women_abuse) and Phosphor icons for others
- **Advanced Filtering**: Search by text, filter by category and status
- **Sorting**: Click column headers to sort by category, status, date, or subcategory
- **Workflow Actions**: Quick action buttons for status updates, viewing details, and deletion
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Accessibility**: Full keyboard navigation, tooltips, and screen reader support
- **Optimistic UI**: Immediate feedback with error handling

## Usage

```tsx
import { ReportsTable } from '../components/reports/ReportsTable';
import { firebaseService } from '../services/firebaseService';

function MyComponent() {
  const [reports, setReports] = useState<Report[]>([]);

  const handleStatusUpdate = async (reportId: string, status: Report['status']) => {
    await firebaseService.updateReportStatus(reportId, status);
  };

  const handleDeleteReport = async (reportId: string) => {
    await firebaseService.deleteReport(reportId);
  };

  const handleViewReport = (report: Report) => {
    // Navigate to detail view or open modal
    console.log('Viewing report:', report);
  };

  return (
    <ReportsTable
      reports={reports}
      onUpdateStatus={handleStatusUpdate}
      onDeleteReport={handleDeleteReport}
      onViewReport={handleViewReport}
      showActions={true}
      limit={10}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `reports` | `Report[]` | Required | Array of report objects |
| `onUpdateStatus` | `(reportId: string, status: Report['status']) => Promise<void>` | Optional | Callback for status updates |
| `onDeleteReport` | `(reportId: string) => Promise<void>` | Optional | Callback for report deletion |
| `onViewReport` | `(report: Report) => void` | Optional | Callback for viewing report details |
| `showActions` | `boolean` | `true` | Whether to show action buttons |
| `limit` | `number` | Optional | Maximum number of reports to display |
| `className` | `string` | `''` | Additional CSS classes |

## Report Data Structure

The component expects reports with the following structure:

```typescript
interface Report {
  id: string;
  mainCategory: 'crime' | 'child_abuse' | 'women_abuse' | 'other';
  category: string; // Subcategory
  description: string;
  status: 'pending' | 'validated' | 'responding' | 'resolved' | 'rejected';
  timestamp: Date;
  // ... other fields
}
```

## Category Icons

The component automatically maps main categories to their respective icons:

- **Crime**: `src/assets/crime.ico`
- **Child Abuse**: `src/assets/child_abuse.ico`
- **Women Abuse**: `src/assets/women_abuse.ico`
- **Other**: Phosphor `FolderOpen` icon

## Status Workflow

The component supports the following status transitions:

1. **Pending** → Validate (becomes Validated) or Reject (becomes Rejected)
2. **Validated** → Start Investigation (becomes Responding) or Reject (becomes Rejected)
3. **Responding** → Mark as Resolved (becomes Resolved)

## Action Buttons

Each row provides context-aware action buttons:

- **View**: Always available - opens report details
- **Validate**: Available for pending reports
- **Reject**: Available for pending and validated reports
- **Investigate**: Available for validated reports
- **Resolve**: Available for responding reports
- **Delete**: Available via dropdown menu for all reports

## Filtering and Search

- **Search**: Text search across description, category, and main category
- **Category Filter**: Dropdown to filter by main category
- **Status Filter**: Dropdown to filter by report status
- **Show/Hide Filters**: Toggle button to expand/collapse filter options

## Sorting

Click any column header to sort:
- **Category**: Sorts by main category
- **Subcategory**: Sorts by specific category
- **Status**: Sorts by status
- **Date**: Sorts by timestamp (default: newest first)

## Styling

The component includes custom CSS (`ReportsTable.css`) with:
- Professional Bootstrap-based styling
- Hover effects and transitions
- Responsive design breakpoints
- Dark mode support
- Focus states for accessibility

## Accessibility Features

- Full keyboard navigation
- Screen reader compatible
- ARIA labels and tooltips
- High contrast focus indicators
- Semantic HTML structure

## Customization

To extend the component:

1. **Add new status**: Update the `statusIcons` mapping and workflow logic
2. **Custom icons**: Modify the `categoryIcons.tsx` utility
3. **Additional columns**: Extend the table structure and sorting logic
4. **Custom styling**: Override CSS classes or add new ones

## Dependencies

- React Bootstrap for UI components
- Phosphor React for icons
- Custom category icon utilities
- Firebase service for data operations

## Performance

- Uses `useMemo` for filtering and sorting operations
- Optimistic UI updates for better perceived performance
- Lazy loading support through the `limit` prop
- Efficient re-renders through proper state management
