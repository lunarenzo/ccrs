import React, { useState, useMemo } from 'react';
import './ReportsTable.css';
import { 
  Table, 
  Form, 
  Row, 
  Col, 
  Badge, 
  Button, 
  OverlayTrigger, 
  Tooltip, 
  Dropdown 
} from 'react-bootstrap';
import { 
  MagnifyingGlass,
  CaretDown,
  CaretUp,
  Eye,
  CheckCircle,
  XCircle,
  Trash,
  Clock,
  ArrowClockwise,
  Warning,
  CheckSquare,
  SortAscending
} from 'phosphor-react';
import type { Report } from '../../services/firebaseService';
import { getCategoryIcon, getCategoryLabel, formatCategoryDisplay } from '../../lib/categoryIcons';
import { classNames, formatDate, getStatusVariant } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

interface ReportsTableProps {
  reports: Report[];
  onUpdateStatus?: (reportId: string, status: Report['status']) => Promise<void>;
  onDeleteReport?: (reportId: string) => Promise<void>;
  onViewReport?: (report: Report) => void;
  showActions?: boolean;
  limit?: number;
  className?: string;
  // Dashboard-specific props
  showSearch?: boolean;
  enableFilters?: boolean;
  showDescription?: boolean;
  compact?: boolean;
  onAssignReport?: (report: Report) => void;
  onChangePriority?: (reportId: string, priority: 'low' | 'medium' | 'high') => Promise<void> | void;
  usersById?: Record<string, { name?: string; email?: string }>;
  onAutoAssign?: (report: Report) => void;
  onNotifyOfficer?: (report: Report) => void;
}

type SortKey = 'timestamp' | 'status' | 'mainCategory' | 'category';
type SortDirection = 'asc' | 'desc';

// Status icons mapping
const statusIcons: Record<Report['status'], React.ReactNode> = {
  pending: <Clock size={12} weight="fill" className="me-1" />,
  validated: <CheckSquare size={12} weight="fill" className="me-1" />,
  assigned: <Clock size={12} weight="fill" className="me-1" />,
  accepted: <CheckSquare size={12} weight="fill" className="me-1" />,
  responding: <ArrowClockwise size={12} weight="fill" className="me-1" />,
  resolved: <CheckCircle size={12} weight="fill" className="me-1" />,
  rejected: <XCircle size={12} weight="fill" className="me-1" />
};

export function ReportsTable({ 
  reports, 
  onUpdateStatus, 
  onDeleteReport, 
  onViewReport,
  onAssignReport,
  onChangePriority,
  usersById,
  onAutoAssign,
  onNotifyOfficer,
  showActions = true,
  limit,
  className = '',
  showSearch = true,
  enableFilters = true,
  showDescription = true,
  compact = false
}: ReportsTableProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Report['status'] | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Unique categories and statuses for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = new Set(reports.map(r => r.mainCategory).filter(Boolean));
    return Array.from(categories).sort();
  }, [reports]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(reports.map(r => r.status));
    return Array.from(statuses).sort();
  }, [reports]);

  // Filter and sort logic
  const processedReports = useMemo(() => {
    let filtered = reports;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.description?.toLowerCase().includes(search) ||
        report.category?.toLowerCase().includes(search) ||
        report.mainCategory?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(report => report.mainCategory === categoryFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortKey) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'mainCategory':
          aValue = a.mainCategory || '';
          bValue = b.mainCategory || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    // Apply limit if specified
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [reports, searchTerm, statusFilter, categoryFilter, sortKey, sortDirection, limit]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <SortAscending size={14} className="text-muted ms-1" />;
    }
    return sortDirection === 'asc' ? 
      <CaretUp size={14} className="text-primary ms-1" /> : 
      <CaretDown size={14} className="text-primary ms-1" />;
  };

  const handleStatusUpdate = async (reportId: string, newStatus: Report['status']) => {
    if (onUpdateStatus) {
      try {
        await onUpdateStatus(reportId, newStatus);
        showToast({
          type: 'success',
          title: 'Status Updated',
          message: `Report status changed to ${newStatus}`,
          duration: 3000
        });
      } catch (error) {
        console.error('Failed to update status:', error);
        showToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update report status. Please try again.',
          duration: 4000
        });
      }
    }
  };

  const handleDelete = async (reportId: string) => {
    if (onDeleteReport && window.confirm('Are you sure you want to delete this report?')) {
      try {
        await onDeleteReport(reportId);
        showToast({
          type: 'success',
          title: 'Report Deleted',
          message: 'Report has been permanently deleted',
          duration: 3000
        });
      } catch (error) {
        console.error('Failed to delete report:', error);
        showToast({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete report. Please try again.',
          duration: 4000
        });
      }
    }
  };

  const truncateText = (text: string | undefined, maxLength: number = 60): string => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className={classNames('reports-table-container', className)}>
      {/* Toolbar - only show if needed */}
      {(showSearch || enableFilters) && (
        <div className="mb-3">
          <Row className="align-items-center">
            {showSearch && (
              <Col md={enableFilters ? 4 : 8}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-5"
                  />
                  <MagnifyingGlass 
                    size={18} 
                    className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" 
                  />
                </div>
              </Col>
            )}
            
            {enableFilters && (
              <>
                <Col md={3}>
                  <Form.Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>
                        {formatCategoryDisplay(category)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as Report['status'] | '')}
                  >
                    <option value="">All Statuses</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </>
            )}
            
          </Row>
        </div>
      )}

      {/* Table */}
      <div className="table-responsive" style={{ overflow: 'visible' }}>
        <Table hover className={classNames('align-middle', compact && 'table-sm')}>
          <thead className="table-light">
            <tr>
              <th className="text-ccrs-primary fw-semibold">
                Category
              </th>
              <th className="text-ccrs-primary fw-semibold">
                Subcategory
              </th>
              {showDescription && <th className="text-ccrs-primary fw-semibold">Description</th>}
              <th className="text-ccrs-primary fw-semibold">
                Status
              </th>
              <th className="text-ccrs-primary fw-semibold">
                Assignment
              </th>
              <th 
                className="cursor-pointer user-select-none text-ccrs-primary fw-semibold"
                onClick={() => handleSort('timestamp')}
              >
                Date
                {getSortIcon('timestamp')}
              </th>
              {showActions && <th className="text-ccrs-primary fw-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {processedReports.length > 0 ? (
              processedReports.map((report) => (
                <tr 
                  key={report.id} 
                  className={classNames(
                    'border-bottom',
                    report.status === 'resolved' && 'opacity-75'
                  )}
                >
                  <td>
                    <div className="d-flex align-items-center">
                      {getCategoryIcon(report.mainCategory || 'other')}
                      <span className="fw-medium">
                        {getCategoryLabel(report.mainCategory || 'other')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="text-ccrs-secondary">
                      {formatCategoryDisplay(report.category || '')}
                    </span>
                  </td>
                  {showDescription && (
                    <td>
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip id={`tooltip-${report.id}`}>
                            {report.description || 'No description available'}
                          </Tooltip>
                        }
                      >
                        <span 
                          className="cursor-pointer text-decoration-underline text-decoration-underline-opacity-0 text-decoration-underline-opacity-100-hover"
                          onClick={() => onViewReport?.(report)}
                        >
                          {truncateText(report.description)}
                        </span>
                      </OverlayTrigger>
                    </td>
                  )}
                  <td>
                    <Badge 
                      bg={getStatusVariant(report.status)} 
                      className="d-flex align-items-center w-auto"
                      style={{ width: 'fit-content' }}
                    >
                      {statusIcons[report.status]}
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </Badge>
                  </td>
                  <td>
                    {Boolean((report as any).assignedTo) ? (
                      <div className="d-flex flex-column">
                        <span className="fw-semibold text-ccrs-primary small">
                          {usersById?.[(report as any).assignedTo!]?.name || usersById?.[(report as any).assignedTo!]?.email || (report as any).assignedTo}
                        </span>
                        {(report as any).assignmentStatus && (
                          <span className={classNames('badge mt-1',
                            ((report as any).assignmentStatus === 'pending' && 'bg-warning'),
                            ((report as any).assignmentStatus === 'accepted' && 'bg-primary'),
                            ((report as any).assignmentStatus === 'rejected' && 'bg-danger')
                          )}>
                            {(report as any).assignmentStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted small fst-italic">Unassigned</span>
                    )}
                  </td>
                  <td>
                    <small className="text-muted">
                      {formatDate(report.timestamp)}
                    </small>
                  </td>
                  {showActions && (
                    <td>
                      <Dropdown align="end" drop="down">
                        <Dropdown.Toggle 
                          variant="outline-secondary" 
                          size="sm" 
                          className="border-0 shadow-sm"
                          id={`actions-${report.id}`}
                        >
                          Actions
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="shadow" style={{ position: 'absolute', zIndex: 1055 }}>
                          <Dropdown.Item onClick={() => onViewReport?.(report)}>
                            <Eye size={14} className="me-2" />
                            View Details
                          </Dropdown.Item>
                          
                          <Dropdown.Divider />
                          
                          <Dropdown.Header>Status Actions</Dropdown.Header>
                          
                          {report.status === 'pending' && (
                            <>
                              <Dropdown.Item 
                                className="text-success"
                                onClick={() => handleStatusUpdate(report.id, 'validated')}
                              >
                                <CheckCircle size={14} className="me-2" />
                                Validate Report
                              </Dropdown.Item>
                              <Dropdown.Item 
                                className="text-danger"
                                onClick={() => handleStatusUpdate(report.id, 'rejected')}
                              >
                                <XCircle size={14} className="me-2" />
                                Reject Report
                              </Dropdown.Item>
                            </>
                          )}
                          
                          {report.status === 'validated' && (
                            <>
                              <Dropdown.Item 
                                className="text-info"
                                onClick={() => handleStatusUpdate(report.id, 'responding')}
                              >
                                <ArrowClockwise size={14} className="me-2" />
                                Start Investigation
                              </Dropdown.Item>
                              <Dropdown.Item 
                                className="text-danger"
                                onClick={() => handleStatusUpdate(report.id, 'rejected')}
                              >
                                <XCircle size={14} className="me-2" />
                                Reject Report
                              </Dropdown.Item>
                            </>
                          )}
                          
                          {report.status === 'responding' && (
                            <Dropdown.Item 
                              className="text-success"
                              onClick={() => handleStatusUpdate(report.id, 'resolved')}
                            >
                              <CheckSquare size={14} className="me-2" />
                              Mark as Resolved
                            </Dropdown.Item>
                          )}
                          
                          <Dropdown.Divider />
                          <Dropdown.Header>Assignment</Dropdown.Header>
                          <Dropdown.Item 
                            onClick={() => onAssignReport?.(report)}
                            disabled={Boolean((report as any).assignedTo)}
                          >
                            Assign to Officer
                          </Dropdown.Item>
                          {report.status === 'pending' && !(report as any).assignedTo && (
                            <Dropdown.Item 
                              onClick={() => onAutoAssign?.(report)}
                            >
                              Auto-Assign to Least-Loaded Officer
                            </Dropdown.Item>
                          )}

                          <Dropdown.Divider />
                          <Dropdown.Header>Notifications</Dropdown.Header>
                          <Dropdown.Item
                            onClick={() => onNotifyOfficer?.(report)}
                            disabled={!(report as any).assignedTo}
                          >
                            Notify Assigned Officer
                          </Dropdown.Item>

                          <Dropdown.Divider />
                          <Dropdown.Header>Priority</Dropdown.Header>
                          <Dropdown.Item 
                            active={(report as any).priority === 'low'}
                            onClick={() => onChangePriority?.(report.id, 'low')}
                          >
                            Set Priority: Low
                          </Dropdown.Item>
                          <Dropdown.Item 
                            active={(report as any).priority === 'medium'}
                            onClick={() => onChangePriority?.(report.id, 'medium')}
                          >
                            Set Priority: Medium
                          </Dropdown.Item>
                          <Dropdown.Item 
                            active={(report as any).priority === 'high'}
                            onClick={() => onChangePriority?.(report.id, 'high')}
                          >
                            Set Priority: High
                          </Dropdown.Item>

                          <Dropdown.Divider />
                          
                          <Dropdown.Item 
                            className="text-danger"
                            onClick={() => handleDelete(report.id)}
                          >
                            <Trash size={14} className="me-2" />
                            Delete Report
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td 
                  colSpan={(
                    2 + // Category + Subcategory
                    (showDescription ? 1 : 0) + // Description
                    3 + // Status + Assignment + Date
                    (showActions ? 1 : 0) // Actions
                  )} 
                  className="text-center py-5 text-muted"
                >
                  <Warning size={48} className="text-muted mb-2" />
                  <div>No reports found</div>
                  <small>Try adjusting your search or filter criteria</small>
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* Results Summary */}
      {limit && processedReports.length >= limit && (
        <div className="text-center pt-3 border-top">
          <small className="text-muted">
            Showing first {limit} results. Use filters to see more specific data.
          </small>
        </div>
      )}
    </div>
  );
}


export default ReportsTable;
