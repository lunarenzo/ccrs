import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Badge, Button as BootstrapButton } from 'react-bootstrap';
import { 
  FileText,
  Clock,
  CheckCircle,
  ShieldCheck,
  MagnifyingGlass,
  XCircle,
  Archive,
  MapTrifold,
  NavigationArrow,
  Eye,
  Fire,
  ChartLine,
  ArrowsOut,
  ArrowsIn,
  FileImage
} from 'phosphor-react';
import { firebaseService, type Report } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Modal, ModalHeader, ModalBody } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ReportsTable } from '../components/reports/ReportsTable';
import MediaViewer from '../components/ui/MediaViewer';
import AssignReportModal from '../components/modals/AssignReportModal';
import { auditService, type AuditLog } from '../services/auditService';
import { getStatusVariant, formatDate } from '../lib/utils';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  useMap 
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { 
  MAP_CENTER, 
  DEFAULT_ZOOM, 
  PANGASINAN_BOUNDS,
  MIN_ZOOM,
  MAX_ZOOM 
} from '../constants/map';
import { 
  getMarkerIcon, 
  filterReportsWithLocation, 
  getStatusVariant as getMapStatusVariant 
} from '../lib/mapUtils';
import HeatmapLayer from '../components/map/HeatmapLayer';
import TimeSlider from '../components/map/TimeSlider';
import '../styles/map.css';
import { autoPickOfficer } from '../lib/assign';
import NotifyOfficerModal from '../components/modals/NotifyOfficerModal';
import { realtimePushService } from '../services/realtimePushService';


interface Comment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: Date;
}

// Custom component to reset map view
function ResetViewButton() {
  const map = useMap();
  
  const resetView = () => {
    map.setView(MAP_CENTER, DEFAULT_ZOOM);
  };

  return (
    <div className="leaflet-control-container">
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control">
          <BootstrapButton
            variant="light"
            size="sm"
            onClick={resetView}
            className="shadow-sm border d-flex align-items-center gap-1"
            title="Reset view to center"
          >
            <NavigationArrow size={14} weight="regular" />
            Reset
          </BootstrapButton>
        </div>
      </div>
    </div>
  );
}

function Reports() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [reportToAssign, setReportToAssign] = useState<Report | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [reportToNotify, setReportToNotify] = useState<Report | null>(null);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showMap, setShowMap] = useState(true); // Toggle for map visibility
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);
  const [usersById, setUsersById] = useState<Record<string, { name?: string; email?: string }>>({});
  // SLA quick filter state
  const [slaFilter, setSlaFilter] = useState<'none' | 'unaccepted15' | 'noresp30'>('none');
  // Audit trail state (client-side filtered from recent logs to avoid composite index requirements)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // Map filters
  const [mapFilters, setMapFilters] = useState({
    status: 'all',
    category: 'all',
    dateRange: 'all' // all, today, week, month
  });
  
  // Phase 3: Heatmap and Time Slider state
  const [mapMode, setMapMode] = useState<'markers' | 'heatmap' | 'temporal'>('markers');
  const [showTimeSlider, setShowTimeSlider] = useState(false);
  const [timeRange, setTimeRange] = useState(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 30); // Default to last 30 days
    return {
      start,
      end,
      current: end
    };
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playbackInterval, setPlaybackInterval] = useState<NodeJS.Timeout | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Stats for the header cards
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    validated: reports.filter(r => r.status === 'validated').length,
    responding: reports.filter(r => r.status === 'responding').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  };

  // SLA metrics (client-side; Free Tier compliant)
  const nowMs = Date.now();
  const fifteenMinMs = 15 * 60 * 1000;
  const thirtyMinMs = 30 * 60 * 1000;
  function toMs(d: any): number {
    if (!d) return 0;
    // Firestore Timestamp or Date
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return typeof d?.toDate === 'function' ? d.toDate().getTime() : new Date(d).getTime();
  }
  const unacceptedOver15 = reports.filter(
    (r) => r.status === 'assigned' && (r as any).assignmentStatus === 'pending' && toMs(r.updatedAt) < (nowMs - fifteenMinMs)
  );
  const noResponseOver30 = reports.filter(
    (r) => r.status === 'accepted' && toMs(r.updatedAt) < (nowMs - thirtyMinMs)
  );

  const reportsForTable = slaFilter === 'none'
    ? reports
    : slaFilter === 'unaccepted15'
      ? unacceptedOver15
      : noResponseOver30;

  // Filter reports based on map filters
  const getFilteredReportsForMap = () => {
    let filteredReports = filterReportsWithLocation(reports);
    
    // Filter by status
    if (mapFilters.status !== 'all') {
      filteredReports = filteredReports.filter(report => report.status === mapFilters.status);
    }
    
    // Filter by main category
    if (mapFilters.category !== 'all') {
      filteredReports = filteredReports.filter(report => report.mainCategory === mapFilters.category);
    }
    
    // Filter by date range
    if (mapFilters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (mapFilters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      
      filteredReports = filteredReports.filter(report => 
        new Date(report.timestamp) >= filterDate
      );
    }
    
    return filteredReports;
  };

  const filteredMapReports = getFilteredReportsForMap();
  
  // Phase 3: Temporal filtering for time slider
  const getTemporalFilteredReports = () => {
    if (mapMode !== 'temporal') return filteredMapReports;
    
    const currentDate = new Date(timeRange.current);
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    return filteredMapReports.filter(report => {
      const reportDate = new Date(report.timestamp);
      return reportDate >= startOfDay && reportDate <= endOfDay;
    });
  };
  
  // Phase 3: Heatmap data preparation
  const getHeatmapData = () => {
    const reportsForHeatmap = mapMode === 'temporal' ? getTemporalFilteredReports() : filteredMapReports;
    
    // Group reports by location for intensity calculation
    const locationMap = new Map<string, number>();
    
    reportsForHeatmap.forEach(report => {
      if (report.location?.latitude && report.location?.longitude) {
        // Round coordinates to group nearby reports
        const lat = Math.round(report.location.latitude * 10000) / 10000;
        const lng = Math.round(report.location.longitude * 10000) / 10000;
        const key = `${lat},${lng}`;
        locationMap.set(key, (locationMap.get(key) || 0) + 1);
      }
    });
    
    // Convert to heatmap format: [lat, lng, intensity]
    return Array.from(locationMap.entries()).map(([key, count]) => {
      const [lat, lng] = key.split(',').map(Number);
      return [lat, lng, Math.min(count / 5, 1)] as [number, number, number]; // Normalize intensity
    });
  };
  
  // Phase 3: Daily report counts for time slider
  const getDailyReportCounts = () => {
    const counts: { [key: string]: number } = {};
    const reportsInRange = filteredMapReports.filter(report => {
      const reportDate = new Date(report.timestamp);
      return reportDate >= timeRange.start && reportDate <= timeRange.end;
    });
    
    reportsInRange.forEach(report => {
      const dateKey = new Date(report.timestamp).toISOString().split('T')[0];
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });
    
    return counts;
  };
  
  const temporalFilteredReports = getTemporalFilteredReports();
  const heatmapData = getHeatmapData();
  const dailyReportCounts = getDailyReportCounts();
  
  // Get unique categories for filter dropdown
  const uniqueCategories = [...new Set(reports.map(r => r.mainCategory).filter(Boolean))];

  useEffect(() => {
    let mounted = true;
    
    // Subscribe to real-time reports
    const unsubscribe = firebaseService.subscribeToReports((reportsData) => {
      if (mounted) {
        setReports(reportsData);
        setLoading(false);
      }
    });

    // Set a fallback timeout to stop loading even if Firebase fails
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Reports loading timeout - proceeding with empty data');
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Load audit trail when the detail modal opens for a specific report
  useEffect(() => {
    async function loadAudit() {
      if (!showModal || !selectedReport) {
        setAuditLogs([]);
        return;
      }
      setAuditLoading(true);
      try {
        // Fetch a recent window of logs and filter client-side by reportId to avoid needing a composite index
        const logs = await auditService.getRecentLogs(200);
        const filtered = (logs as any[]).filter((l) => (
          (l?.targetType === 'report' && l?.targetId === selectedReport.id) ||
          (l?.reportId === selectedReport.id)
        ));
        // Sort DESC by timestamp just in case
        filtered.sort((a, b) => {
          const ta = (a?.timestamp?.getTime ? a.timestamp.getTime() : new Date(a?.timestamp).getTime()) || 0;
          const tb = (b?.timestamp?.getTime ? b.timestamp.getTime() : new Date(b?.timestamp).getTime()) || 0;
          return tb - ta;
        });
        setAuditLogs(filtered);
      } catch (e) {
        console.error('Failed to load audit logs:', e);
        setAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    }
    void loadAudit();
  }, [showModal, selectedReport?.id]);

  // Helpers: formatting for audit items
  function humanize(text: string): string {
    if (!text) return '';
    return text.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatActionLine(log: AuditLog): string {
    const action = log.action || 'action';
    const d: any = (log as any).details || {};
    switch (action) {
      case 'report_status_change':
        return `Status changed from ${d.oldStatus || 'unknown'} to ${d.newStatus || 'unknown'}`;
      case 'report_priority_change':
        return `Priority updated to ${d.newPriority || 'unknown'}` + (d.previousPriority ? ` (was ${d.previousPriority})` : '');
      case 'report_assigned':
        return `Report assigned to ${displayForUid(d.assignedTo)}` + (d.previousAssignedTo ? ` (previously ${displayForUid(d.previousAssignedTo)})` : '');
      case 'report_auto_assigned':
        // Present a friendly label and resolve the officer name
        return `Auto-assigned to ${displayForUid(d.assignedTo)} (reason: Least Loaded)`;
      case 'report_deletion':
        return 'Report deleted';
      case 'report_comment_add':
        return `Admin added a comment (length ${d.length ?? 'n/a'})`;
      default:
        return humanize(action);
    }
  }

  function formatActor(log: AuditLog): string {
    const anyLog: any = log as any;
    return anyLog.adminEmail || anyLog.adminUserId || anyLog.actorUid || 'unknown';
  }

  // Prefer full name + email when available via usersById subscription
  function formatActorDisplay(log: AuditLog): string {
    const anyLog: any = log as any;
    const uid = anyLog.adminUserId || anyLog.actorUid || anyLog.officerUid;
    const email = anyLog.adminEmail || anyLog.email;
    if (uid && usersById[uid]) {
      const profile = usersById[uid];
      if (profile?.name && profile?.email) return `${profile.name} (${profile.email})`;
      if (profile?.name) return profile.name;
      if (profile?.email) return profile.email;
      return uid as string;
    }
    return email || uid || 'unknown';
  }

  // Resolve a UID to a display name for inline action text
  function displayForUid(uid?: string): string {
    if (!uid) return 'officer';
    const profile = usersById[uid];
    if (profile?.name) return profile.name;
    if (profile?.email) return profile.email as string;
    return uid;
  }

  function safeDetailPairs(log: AuditLog): Array<{ key: string; value: string }>{
    const raw: any = (log as any).details;
    if (!raw || typeof raw !== 'object') return [];
    // Strip potential text-like fields (defense-in-depth; rules already block raw content)
    const { note, text, comment, commentText, content, message, reason, ...rest } = raw as any;

    const derived: Array<{ key: string; value: string }> = [];
    if (typeof reason === 'string') {
      const openMatch = reason.match(/open\s*=\s*(\d+)/i);
      const lastMatch = reason.match(/lastUpdated\s*=\s*(\d+)/i);
      if (openMatch) derived.push({ key: 'Open Cases', value: openMatch[1] });
      if (lastMatch) {
        const ms = parseInt(lastMatch[1], 10);
        derived.push({ key: 'Tie-break Last Update', value: ms > 0 ? new Date(ms).toLocaleString() : 'n/a' });
      }
    }

    const entries = Object.entries(rest).filter(([, v]) => v !== undefined && v !== null);
    // Convert to readable key/value strings; limit length to keep UI tidy
    const mapped = entries.slice(0, 6).map(([k, v]) => ({
      key: humanize(String(k)),
      value: typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : '[object]'
    }));
    return [...derived, ...mapped];
  }


  const handleStatusUpdate = async (reportId: string, newStatus: Report['status']) => {
    try {
      const prevReport = reports.find(r => r.id === reportId);
      const prevStatus = prevReport?.status || 'pending';
      // Optimistic update
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );
      
      await firebaseService.updateReportStatus(reportId, newStatus);
      
      // Non-blocking: notify citizen of status update via Realtime DB
      try {
        const citizenUid = (prevReport as any)?.user_id as string | undefined;
        if (citizenUid) {
          const title = 'Report Status Update';
          const reportTitle = (prevReport as any)?.category || 'Report';
          await realtimePushService.sendReportStatusUpdate(
            citizenUid,
            reportId,
            reportTitle,
            String(prevStatus),
            String(newStatus)
          );
        }
      } catch (e) {
        console.warn('Citizen notification failed (non-blocking):', e);
      }
      // Audit (non-blocking)
      try {
        if (user) {
          await auditService.logReportStatusChange(
            user.id,
            user.email || 'unknown',
            reportId,
            prevStatus as string,
            newStatus as string
          );
        }
      } catch {}
      
      setAlertMessage({ 
        type: 'success', 
        message: `Report ${newStatus} successfully` 
      });
      
      // Clear alert after 3 seconds
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Error updating report status:', error);
      
      // Revert optimistic update on error
      setReports(prevReports => 
        prevReports.map(report => 
          report.id === reportId ? { ...report, status: report.status } : report
        )
      );
      
      setAlertMessage({ 
        type: 'error', 
        message: 'Failed to update report status. Please try again.' 
      });
      
      setTimeout(() => setAlertMessage(null), 5000);
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  // Open Assign Modal
  const handleOpenAssign = (report: Report) => {
    setReportToAssign(report);
    setShowAssignModal(true);
  };

  // Open Notify Modal
  const handleOpenNotify = (report: Report) => {
    setReportToNotify(report);
    setShowNotifyModal(true);
  };

  const handleCloseNotify = () => {
    setShowNotifyModal(false);
    setReportToNotify(null);
  };

  const handleConfirmNotify = async ({ title, body }: { title: string; body: string }) => {
    if (!reportToNotify) return;
    const assignedTo = (reportToNotify as any).assignedTo as string | undefined;
    if (!assignedTo) {
      showToast({ type: 'error', title: 'No Assignee', message: 'This report has no assigned officer.', duration: 3500 });
      return;
    }
    try {
      // RTDB-only: always write to Realtime Database where police app listens
      const payloadData = {
        reportId: reportToNotify.id,
        priority: (reportToNotify as any)?.priority,
        status: reportToNotify.status,
        type: 'assignment',
      } as Record<string, unknown>;

      await realtimePushService.sendNotification({
        officerUid: assignedTo,
        title,
        body,
        data: payloadData,
        type: 'assignment',
      });
      showToast({ type: 'success', title: 'Notification Sent', message: 'Real-time notification delivered to officer.', duration: 3000 });
      
      // Audit (avoid storing raw message content)
      try {
        if (user) {
          await auditService.logAction({
            adminUserId: user.id,
            adminEmail: user.email || 'unknown',
            action: 'admin_realtime_notify',
            targetType: 'report',
            targetId: reportToNotify.id,
            details: { officerUid: assignedTo, titleLength: title.length, bodyLength: body.length, method: 'realtime_database' }
          });
        }
      } catch {}
      handleCloseNotify();
    } catch (e: any) {
      showToast({ 
        type: 'error', 
        title: 'Send Failed', 
        message: e?.message || 'Failed to send real-time notification.', 
        duration: 5000 
      });
    }
  };

  const handleCloseAssign = () => {
    setShowAssignModal(false);
    setReportToAssign(null);
  };

  // Confirm assignment action
  const handleConfirmAssign = async (officerId: string) => {
    if (!reportToAssign || !user) return;
    const reportId = reportToAssign.id;
    // Optimistic UI
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, assignedTo: officerId, status: 'assigned' as Report['status'], assignmentStatus: 'pending' } : r));
    try {
      await firebaseService.assignReportToOfficer(reportId, officerId);
      showToast({ type: 'success', title: 'Assigned', message: 'Report assigned to officer', duration: 3000 });
      // Audit (non-blocking)
      try {
        await auditService.logAction({
          adminUserId: user.id,
          adminEmail: user.email || 'unknown',
          action: 'report_assigned',
          targetType: 'report',
          targetId: reportId,
          details: { assignedTo: officerId, previousAssignedTo: (reportToAssign as any).assignedTo || null }
        });
      } catch {}
      handleCloseAssign();
    } catch (e) {
      console.error('Assignment failed', e);
      // Revert optimistic update
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, assignedTo: (reportToAssign as any).assignedTo, status: (reportToAssign as any).status, assignmentStatus: (reportToAssign as any).assignmentStatus } : r));
      showToast({ type: 'error', title: 'Assignment Failed', message: 'Could not assign report. Check permissions and try again.', duration: 5000 });
      throw e;
    }
  };

  // Auto-assign to least-loaded officer
  const handleAutoAssign = async (report: Report) => {
    if (!user) return;
    const reportId = report.id;
    try {
      // Pick officer client-side (Free Tier compliant)
      const pick = await autoPickOfficer(reportId);
      const previousAssignedTo = (report as any).assignedTo || null;

      // Optimistic UI
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, assignedTo: pick.officerUid, status: 'assigned' as Report['status'], assignmentStatus: 'pending' } : r));

      await firebaseService.assignReportToOfficer(reportId, pick.officerUid);
      showToast({ type: 'success', title: 'Auto-Assigned', message: 'Report auto-assigned to least-loaded officer', duration: 3000 });

      // Audit (non-blocking)
      try {
        await auditService.logAction({
          adminUserId: user.id,
          adminEmail: user.email || 'unknown',
          action: 'report_auto_assigned',
          targetType: 'report',
          targetId: reportId,
          details: { assignedTo: pick.officerUid, previousAssignedTo, reason: pick.reason }
        });
      } catch {}
    } catch (e: any) {
      console.error('Auto-assign failed', e);
      showToast({ type: 'error', title: 'Auto-Assign Failed', message: e?.message || 'Could not auto-assign report.', duration: 5000 });
      // No change persisted if failure, so no revert needed beyond optimistic state not set when error before write
    }
  };

  // Change priority with optimistic UI
  const handleChangePriority = async (reportId: string, priority: 'low' | 'medium' | 'high') => {
    setUpdatingPriority(reportId);
    const prev = reports.find(r => r.id === reportId);
    // Optimistic
    setReports(prevReports => prevReports.map(r => r.id === reportId ? { ...r, priority } : r));
    try {
      await firebaseService.updateReportPriority(reportId, priority);
      showToast({ type: 'success', title: 'Priority Updated', message: `Set to ${priority}`, duration: 2500 });
      // Audit (non-blocking)
      try {
        if (user) {
          await auditService.logAction({
            adminUserId: user.id,
            adminEmail: user.email || 'unknown',
            action: 'report_priority_change',
            targetType: 'report',
            targetId: reportId,
            details: { newPriority: priority, previousPriority: (prev as any)?.priority }
          });
        }
      } catch {}
    } catch (e) {
      console.error('Priority update failed', e);
      // Revert
      setReports(prevReports => prevReports.map(r => r.id === reportId ? { ...r, priority: (prev as any)?.priority } : r));
      showToast({ type: 'error', title: 'Update Failed', message: 'Could not update priority.', duration: 4000 });
    } finally {
      setUpdatingPriority(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const prev = reports.find(r => r.id === reportId);
      await firebaseService.deleteReport(reportId);
      
      setAlertMessage({ 
        type: 'success', 
        message: 'Report deleted successfully' 
      });
      // Audit (non-blocking)
      try {
        if (user) {
          await auditService.logReportDeletion(
            user.id,
            user.email || 'unknown',
            reportId,
            prev || { id: reportId }
          );
        }
      } catch {}
      
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete report:', error);
      
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete report. Please try again.',
        duration: 5000
      });
    }
  };


  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReport(null);
    setNewComment('');
  };

  // Phase 3: Playback controls
  const handlePlayToggle = () => {
    if (isPlaying) {
      // Stop playback
      if (playbackInterval) {
        clearInterval(playbackInterval);
        setPlaybackInterval(null);
      }
      setIsPlaying(false);
    } else {
      // Start playback
      setIsPlaying(true);
      const interval = setInterval(() => {
        setTimeRange(prev => {
          const nextDay = new Date(prev.current);
          nextDay.setDate(nextDay.getDate() + 1);
          
          if (nextDay > prev.end) {
            // End of range reached, stop playback
            setIsPlaying(false);
            return prev;
          }
          
          return {
            ...prev,
            current: nextDay
          };
        });
      }, 1000 / playbackSpeed); // Adjust speed
      
      setPlaybackInterval(interval);
    }
  };
  
  const handleTimeChange = (newDate: Date) => {
    setTimeRange(prev => ({
      ...prev,
      current: newDate
    }));
  };
  
  const handleRangeChange = (start: Date, end: Date) => {
    setTimeRange({
      start,
      end,
      current: start
    });
  };
  
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    
    // If playing, restart with new speed
    if (isPlaying && playbackInterval) {
      clearInterval(playbackInterval);
      const interval = setInterval(() => {
        setTimeRange(prev => {
          const nextDay = new Date(prev.current);
          nextDay.setDate(nextDay.getDate() + 1);
          
          if (nextDay > prev.end) {
            setIsPlaying(false);
            return prev;
          }
          
          return {
            ...prev,
            current: nextDay
          };
        });
      }, 1000 / speed);
      
      setPlaybackInterval(interval);
    }
  };
  
  // Fullscreen functionality
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  // Handle escape key for fullscreen exit
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFullscreen]);

  // Subscribe to users to map officer names/emails
  useEffect(() => {
    const unsubscribe = firebaseService.subscribeToUsers((users) => {
      const map: Record<string, { name?: string; email?: string }> = {};
      users.forEach((u: any) => {
        map[u.id] = { name: u.fullName || u.name, email: u.email };
      });
      setUsersById(map);
    });
    return unsubscribe;
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playbackInterval) {
        clearInterval(playbackInterval);
      }
    };
  }, [playbackInterval]);

  const handleAddComment = async () => {
    if (!selectedReport || !newComment.trim() || !user) return;
    
    setAddingComment(true);
    try {
      // Add comment to report (you'll need to extend firebaseService for this)
      const comment = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: user.fullName || user.email || 'Admin',
        authorId: user.id,
        timestamp: new Date()
      };
      
      // For now, store comments as an array field in the report document
      const currentComments = selectedReport.comments || [];
      const updatedComments = [...currentComments, comment];
      
      await firebaseService.updateReportWithComments(selectedReport.id, updatedComments);
      
      setSelectedReport(prev => prev ? { ...prev, comments: updatedComments } : null);
      setNewComment('');
      // Audit (non-blocking)
      try {
        await auditService.logAction({
          adminUserId: user.id,
          adminEmail: user.email || 'unknown',
          action: 'report_comment_add',
          targetType: 'report',
          targetId: selectedReport.id,
          details: { length: comment.text.length }
        });
      } catch {}
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setAddingComment(false);
    }
  };


  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <LoadingSpinner size="sm" />
      </Container>
    );
  }

  return (
    <div className="reports-page-container">
      <Container fluid className="p-0">
        <div className="d-flex flex-column gap-4">
          {/* Page Header */}
          <div className="mb-4">
            <h1 className="h3 fw-bold text-ccrs-primary mb-1">Reports Management</h1>
            <p className="text-ccrs-secondary mb-0">
              Manage and track all incident reports in the system
            </p>
          </div>

          {/* Professional Stats Cards */}
          <Row xs={1} sm={2} lg={3} xl={6} className="g-4 mb-4">
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-primary rounded-circle p-3 shadow-sm">
                    <Archive size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-primary mb-2 mt-3">{stats.total}</div>
                  <div className="text-muted fw-medium">Total Reports</div>
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-warning rounded-circle p-3 shadow-sm">
                    <Clock size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-warning mb-2 mt-3">{stats.pending}</div>
                  <div className="text-muted fw-medium">Pending Review</div>
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-info rounded-circle p-3 shadow-sm">
                    <ShieldCheck size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-info mb-2 mt-3">{stats.validated}</div>
                  <div className="text-muted fw-medium">Validated</div>
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-secondary rounded-circle p-3 shadow-sm">
                    <MagnifyingGlass size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-secondary mb-2 mt-3">{stats.responding}</div>
                  <div className="text-muted fw-medium">Investigating</div>
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-success rounded-circle p-3 shadow-sm">
                    <CheckCircle size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-success mb-2 mt-3">{stats.resolved}</div>
                  <div className="text-muted fw-medium">Resolved</div>
                </Card.Body>
              </Card>
            </Col>
            <Col>
              <Card className="border-0 shadow-sm h-100 position-relative">
                <div className="position-absolute top-0 start-50 translate-middle">
                  <div className="bg-danger rounded-circle p-3 shadow-sm">
                    <XCircle size={28} weight="duotone" className="text-white" />
                  </div>
                </div>
                <Card.Body className="p-4 text-center pt-5">
                  <div className="h3 fw-bold text-danger mb-2 mt-3">{stats.rejected}</div>
                  <div className="text-muted fw-medium">Rejected</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* GIS Map Section */}
          <Row>
            <Col>
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-light border-bottom">
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <h3 className="h6 mb-0 text-ccrs-primary d-flex align-items-center gap-2">
                          <MapTrifold size={18} weight="regular" />
                          GIS Map View ({mapMode === 'temporal' ? temporalFilteredReports.length : filteredMapReports.length} of {filterReportsWithLocation(reports).length} reports)
                        </h3>
                        
                        {/* Phase 3: Map Mode Selector */}
                        {showMap && (
                          <div className="btn-group" role="group">
                            <input
                              type="radio"
                              className="btn-check"
                              name="mapMode"
                              id="markers-mode"
                              checked={mapMode === 'markers'}
                              onChange={() => setMapMode('markers')}
                            />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="markers-mode">
                              <MapTrifold size={14} /> Markers
                            </label>
                            
                            <input
                              type="radio"
                              className="btn-check"
                              name="mapMode"
                              id="heatmap-mode"
                              checked={mapMode === 'heatmap'}
                              onChange={() => setMapMode('heatmap')}
                            />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="heatmap-mode">
                              <Fire size={14} /> Heatmap
                            </label>
                            
                            <input
                              type="radio"
                              className="btn-check"
                              name="mapMode"
                              id="temporal-mode"
                              checked={mapMode === 'temporal'}
                              onChange={() => {
                                setMapMode('temporal');
                                setShowTimeSlider(true);
                              }}
                            />
                            <label className="btn btn-outline-primary btn-sm" htmlFor="temporal-mode">
                              <ChartLine size={14} /> Temporal
                            </label>
                          </div>
                        )}
                      </div>
                      
                      <div className="d-flex gap-2">
                        {/* Fullscreen Button */}
                        {showMap && (
                          <BootstrapButton
                            variant="outline-secondary"
                            size="sm"
                            onClick={toggleFullscreen}
                            className="d-flex align-items-center gap-1"
                            title={isFullscreen ? 'Exit fullscreen (ESC)' : 'Enter fullscreen'}
                          >
                            {isFullscreen ? (
                              <ArrowsIn size={14} weight="regular" />
                            ) : (
                              <ArrowsOut size={14} weight="regular" />
                            )}
                          </BootstrapButton>
                        )}
                        
                        {/* Show/Hide Map Button */}
                        <BootstrapButton
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setShowMap(!showMap)}
                          className="d-flex align-items-center gap-1"
                        >
                          {showMap ? 'Hide Map' : 'Show Map'}
                        </BootstrapButton>
                      </div>
                    </div>
                    
                    {showMap && (
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <small className="text-muted fw-medium">Filters:</small>
                        
                        {/* Status Filter */}
                        <Form.Select 
                          size="sm" 
                          style={{ width: '140px' }}
                          value={mapFilters.status}
                          onChange={(e) => setMapFilters({...mapFilters, status: e.target.value})}
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="validated">Validated</option>
                          <option value="responding">Investigating</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </Form.Select>
                        
                        {/* Category Filter */}
                        <Form.Select 
                          size="sm" 
                          style={{ width: '140px' }}
                          value={mapFilters.category}
                          onChange={(e) => setMapFilters({...mapFilters, category: e.target.value})}
                        >
                          <option value="all">All Categories</option>
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                            </option>
                          ))}
                        </Form.Select>
                        
                        {/* Date Range Filter */}
                        <Form.Select 
                          size="sm" 
                          style={{ width: '120px' }}
                          value={mapFilters.dateRange}
                          onChange={(e) => setMapFilters({...mapFilters, dateRange: e.target.value})}
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">Last Week</option>
                          <option value="month">Last Month</option>
                        </Form.Select>
                        
                        {/* Clear Filters */}
                        {(mapFilters.status !== 'all' || mapFilters.category !== 'all' || mapFilters.dateRange !== 'all') && (
                          <BootstrapButton
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setMapFilters({ status: 'all', category: 'all', dateRange: 'all' })}
                          >
                            Clear Filters
                          </BootstrapButton>
                        )}
                      </div>
                    )}
                  </div>
                </Card.Header>
                
                {/* Phase 3: Time Slider */}
                {showMap && mapMode === 'temporal' && (
                  <Card.Body className="p-3 border-bottom">
                    <TimeSlider
                      timeRange={timeRange}
                      onTimeChange={handleTimeChange}
                      onRangeChange={handleRangeChange}
                      isPlaying={isPlaying}
                      onPlayToggle={handlePlayToggle}
                      playbackSpeed={playbackSpeed}
                      onSpeedChange={handleSpeedChange}
                      reportCounts={dailyReportCounts}
                    />
                  </Card.Body>
                )}
                
                {showMap && (
                  <Card.Body className="p-0" style={{ height: mapMode === 'temporal' ? '350px' : '400px' }}>
                    <MapContainer
                      center={MAP_CENTER}
                      zoom={DEFAULT_ZOOM}
                      minZoom={MIN_ZOOM}
                      maxZoom={MAX_ZOOM}
                      maxBounds={PANGASINAN_BOUNDS}
                      maxBoundsViscosity={1.0}
                      worldCopyJump={false}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={true}
                      zoomControl={true}
                    >
                      {/* OpenStreetMap Tile Layer */}
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        bounds={PANGASINAN_BOUNDS}
                        maxNativeZoom={18}
                      />

                      {/* Custom Controls */}
                      <ResetViewButton />

                      {/* Phase 3: Heatmap Layer */}
                      {mapMode === 'heatmap' && heatmapData.length > 0 && (
                        <HeatmapLayer 
                          points={heatmapData}
                          options={{
                            radius: 25,
                            blur: 15,
                            maxZoom: 17,
                            max: 1.0,
                            minOpacity: 0.3
                          }}
                        />
                      )}

                      {/* Markers (for markers and temporal modes) */}
                      {(mapMode === 'markers' || mapMode === 'temporal') && (
                      <MarkerClusterGroup 
                        chunkedLoading
                        maxClusterRadius={60}
                        spiderfyOnMaxZoom={true}
                        showCoverageOnHover={false}
                        zoomToBoundsOnClick={true}
                        removeOutsideVisibleBounds={true}
                        animate={true}
                        iconCreateFunction={(cluster: any) => {
                          const count = cluster.getChildCount();
                          let className = 'marker-cluster-';
                          
                          if (count < 10) {
                            className += 'small';
                          } else if (count < 100) {
                            className += 'medium';
                          } else {
                            className += 'large';
                          }
                          
                          return new (window as any).L.DivIcon({ 
                            html: `<div><span>${count}</span></div>`, 
                            className: `marker-cluster ${className}`, 
                            iconSize: new (window as any).L.Point(40, 40) 
                          });
                        }}
                      >
                        {(mapMode === 'temporal' ? temporalFilteredReports : filteredMapReports).map((report) => (
                          <Marker
                            key={report.id}
                            position={[report.location!.latitude!, report.location!.longitude!]}
                            icon={getMarkerIcon(report.status)}
                          >
                            <Popup maxWidth={320} className="custom-popup">
                              <div className="popup-content">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                  <Badge bg={getMapStatusVariant(report.status)} className="text-capitalize">
                                    {report.status}
                                  </Badge>
                                  <small className="text-muted">
                                    {formatDate(report.timestamp)}
                                  </small>
                                </div>
                                
                                <h6 className="fw-semibold text-ccrs-primary mb-2">
                                  {report.category}
                                </h6>
                                
                                <p className="text-ccrs-secondary small mb-2 text-truncate" style={{ maxWidth: '280px' }}>
                                  {report.description}
                                </p>
                                
                                {report.location?.address?.formattedAddress && (
                                  <div className="text-muted small mb-3">
                                    📍 {report.location.address.formattedAddress}
                                  </div>
                                )}
                                
                                <div className="d-flex gap-2">
                                  <BootstrapButton
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleViewReport(report)}
                                    className="d-flex align-items-center gap-1"
                                  >
                                    <Eye size={14} weight="regular" />
                                    View Details
                                  </BootstrapButton>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                      </MarkerClusterGroup>
                      )}
                    </MapContainer>
                    
                    {((mapMode === 'temporal' ? temporalFilteredReports : filteredMapReports).length === 0 || (mapMode === 'heatmap' && heatmapData.length === 0)) && !loading && (
                      <div className="position-absolute top-50 start-50 translate-middle text-center w-100">
                        {mapMode === 'heatmap' ? (
                          <Fire size={48} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                        ) : mapMode === 'temporal' ? (
                          <ChartLine size={48} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                        ) : (
                          <MapTrifold size={48} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                        )}
                        <div className="h6 text-muted">
                          {mapMode === 'temporal' && temporalFilteredReports.length === 0
                            ? 'No reports for selected date'
                            : mapMode === 'heatmap' && heatmapData.length === 0
                            ? 'No heatmap data available'
                            : filterReportsWithLocation(reports).length === 0 
                            ? 'No reports with location data'
                            : 'No reports match current filters'
                          }
                        </div>
                        <p className="text-muted small mb-0">
                          {mapMode === 'temporal'
                            ? 'Try selecting a different date or adjusting filters'
                            : mapMode === 'heatmap'
                            ? 'Heatmap requires multiple reports in the same area'
                            : filterReportsWithLocation(reports).length === 0 
                            ? 'Reports with GPS coordinates will appear here'
                            : 'Try adjusting your filters to see more results'
                          }
                        </p>
                      </div>
                    )}
                  </Card.Body>
                )}
              </Card>
            </Col>
          </Row>

          {/* Reports Table */}
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light border-bottom">
                  <h3 className="h6 mb-0 text-ccrs-primary d-flex align-items-center gap-2">
                    <FileText size={18} weight="regular" />
                    All Reports ({stats.total})
                  </h3>
                </Card.Header>
                <Card.Body className="p-0" style={{ overflow: 'visible' }}>
                  {/* SLA quick filters toolbar */}
                  <div className="d-flex justify-content-between align-items-center px-3 pt-3">
                    <div className="d-flex gap-2">
                      <BootstrapButton
                        size="sm"
                        variant={slaFilter === 'unaccepted15' ? 'warning' : 'outline-warning'}
                        onClick={() => setSlaFilter(slaFilter === 'unaccepted15' ? 'none' : 'unaccepted15')}
                      >
                        Unaccepted &gt; 15m
                        <Badge bg="light" text="dark" className="ms-2">{unacceptedOver15.length}</Badge>
                      </BootstrapButton>
                      <BootstrapButton
                        size="sm"
                        variant={slaFilter === 'noresp30' ? 'danger' : 'outline-danger'}
                        onClick={() => setSlaFilter(slaFilter === 'noresp30' ? 'none' : 'noresp30')}
                      >
                        No response &gt; 30m
                        <Badge bg="light" text="dark" className="ms-2">{noResponseOver30.length}</Badge>
                      </BootstrapButton>
                    </div>
                    {slaFilter !== 'none' && (
                      <BootstrapButton size="sm" variant="outline-secondary" onClick={() => setSlaFilter('none')}>
                        Clear SLA Filter
                      </BootstrapButton>
                    )}
                  </div>

                  <ReportsTable
                    reports={reportsForTable}
                    onUpdateStatus={handleStatusUpdate}
                    onDeleteReport={handleDeleteReport}
                    onViewReport={handleViewReport}
                    onAssignReport={handleOpenAssign}
                    onAutoAssign={handleAutoAssign}
                    onChangePriority={handleChangePriority}
                    onNotifyOfficer={handleOpenNotify}
                    usersById={usersById}
                    showActions={true}
                    className="mb-0"
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>

      {/* Report Detail Modal */}
      <Modal
        show={showModal}
        onHide={handleCloseModal}
        size="xl"
        centered
      >
        <ModalHeader closeButton>
          <h4 className="fw-semibold text-ccrs-primary mb-0">
            Report Details - {selectedReport?.mainCategory?.toUpperCase()}
          </h4>
        </ModalHeader>

        <ModalBody>
          {selectedReport && (
            <Row className="g-0 h-100">
              {/* Media Viewer Section - Left Column */}
              <Col md={5} sm={12} className="border-end border-md-end border-sm-bottom">
                <div className="h-100 d-flex flex-column">
                  <div className="p-3 border-bottom">
                    <h5 className="fw-semibold text-ccrs-primary mb-0" id="media-section">
                      Media {selectedReport.media_urls && selectedReport.media_urls.length > 0 && `(${selectedReport.media_urls.length})`}
                    </h5>
                  </div>
                  <div className="flex-grow-1 p-3">
                    {selectedReport.media_urls && selectedReport.media_urls.length > 0 ? (
                      <MediaViewer
                        media={selectedReport.media_urls}
                        height="60vh"
                        className="w-100"
                        showExternalLink={true}
                      />
                    ) : (
                      <div 
                        className="d-flex flex-column align-items-center justify-content-center bg-light rounded text-muted h-100"
                        style={{ minHeight: '400px' }}
                        role="img"
                        aria-labelledby="no-media-text"
                      >
                        <FileImage size={64} className="mb-3" style={{ opacity: 0.4 }} aria-hidden="true" />
                        <div className="fw-medium mb-2" id="no-media-text">No media available</div>
                        <small>No images or videos attached to this report</small>
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              {/* Report Details Section - Right Column */}
              <Col md={7} sm={12}>
                <div className="h-100 d-flex flex-column">
                  <div className="flex-grow-1 overflow-auto" style={{ maxHeight: '70vh' }} role="main" aria-label="Report details">
                    
                    {/* Report Information */}
                    <section className="p-4 border-bottom" aria-labelledby="report-info-heading">
                      <h6 className="fw-semibold text-ccrs-primary mb-3" id="report-info-heading">Report Information</h6>
                      <div className="d-flex flex-column gap-2">
                        <div><strong>Category:</strong> {selectedReport.category}</div>
                        <div className="d-flex align-items-center">
                          <strong className="me-2">Status:</strong>
                          <Badge bg={getStatusVariant(selectedReport.status)} className="text-capitalize">
                            {selectedReport.status}
                          </Badge>
                        </div>
                        <div><strong>Submitted:</strong> {formatDate(selectedReport.timestamp)}</div>
                        <div><strong>Type:</strong> {selectedReport.submission_type || 'Unknown'}</div>
                      </div>
                    </section>

                    {/* Description */}
                    <section className="p-4 border-bottom" aria-labelledby="description-heading">
                      <h6 className="fw-semibold text-ccrs-primary mb-3" id="description-heading">Description</h6>
                      <div className="bg-light p-3 rounded-3 text-ccrs-primary">
                        {selectedReport.description}
                      </div>
                    </section>

                    {/* Location */}
                    {selectedReport.location && (
                      <section className="p-4 border-bottom" aria-labelledby="location-heading">
                        <h6 className="fw-semibold text-ccrs-primary mb-3" id="location-heading">Location</h6>
                        <div className="text-ccrs-secondary">
                          {selectedReport.location.address?.formattedAddress || 
                           `${selectedReport.location.latitude}, ${selectedReport.location.longitude}`}
                        </div>
                      </section>
                    )}

                    {/* History & Audit Trail */}
                    <section className="p-4 border-bottom" aria-labelledby="audit-trail-heading">
                      <h6 className="fw-semibold text-ccrs-primary mb-3" id="audit-trail-heading">History & Audit Trail</h6>
                      <div className="d-flex flex-column gap-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {auditLoading ? (
                          <div className="d-flex justify-content-center py-3"><LoadingSpinner size="sm" /></div>
                        ) : auditLogs.length === 0 ? (
                          <p className="text-muted small fst-italic mb-0">No audit entries found for this report</p>
                        ) : (
                          auditLogs.map((log: AuditLog) => {
                            const ts = (log as any)?.timestamp?.toLocaleString?.() || ((log as any)?.timestamp?.toDate?.() ? (log as any).timestamp.toDate().toLocaleString() : new Date((log as any)?.timestamp).toLocaleString());
                            const actor = formatActorDisplay(log);
                            const actionLine = formatActionLine(log);
                            const pairs = safeDetailPairs(log);
                            return (
                              <Card key={log.id || `${log.action}-${ts}`} className="border-0 bg-light">
                                <Card.Body className="p-3">
                                  <div className="d-flex justify-content-between align-items-start mb-1">
                                    <div className="d-flex flex-column">
                                      <span className="fw-semibold small text-ccrs-primary">{actionLine}</span>
                                      <small className="text-muted">by {actor}</small>
                                    </div>
                                    <small className="text-muted">{ts}</small>
                                  </div>
                                  {pairs.length > 0 && (
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                      {pairs.map((p) => (
                                        <span key={`${log.id}-${p.key}`} className="badge rounded-pill text-bg-light border">
                                          <span className="text-muted">{p.key}:</span> {p.value}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </Card.Body>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </section>

                    {/* Comments & Notes */}
                    <section className="p-4" aria-labelledby="comments-heading">
                      <h6 className="fw-semibold text-ccrs-primary mb-3" id="comments-heading">Comments & Notes</h6>
                      
                      {/* Existing Comments */}
                      <div className="d-flex flex-column gap-3 mb-4" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {selectedReport.comments && selectedReport.comments.length > 0 ? (
                          selectedReport.comments.map((comment) => (
                            <Card key={comment.id} className="border-0 bg-light">
                              <Card.Body className="p-3">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h6 className="fw-semibold mb-0 text-ccrs-primary small">{comment.author}</h6>
                                  <small className="text-muted">
                                    {formatDate(comment.timestamp)}
                                  </small>
                                </div>
                                <p className="text-ccrs-secondary small mb-0">{comment.text}</p>
                              </Card.Body>
                            </Card>
                          ))
                        ) : (
                          <p className="text-muted small fst-italic">No comments yet</p>
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="border-top pt-3">
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment or note..."
                          className="mb-3"
                        />
                        <Button
                          variant="primary"
                          onClick={handleAddComment}
                          disabled={addingComment || !newComment.trim()}
                        >
                          {addingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </div>
                    </section>
                  </div>
                </div>
              </Col>
            </Row>
          )}
        </ModalBody>
      </Modal>

      {/* Assign Report Modal */}
      <AssignReportModal
        show={showAssignModal}
        onHide={handleCloseAssign}
        report={reportToAssign}
        onConfirm={handleConfirmAssign}
      />

      {/* Notify Officer Modal */}
      <NotifyOfficerModal
        show={showNotifyModal}
        onHide={handleCloseNotify}
        report={reportToNotify}
        onConfirm={handleConfirmNotify}
      />
      
      {/* Fullscreen Map Modal */}
      {isFullscreen && (
        <div className="fullscreen-map-overlay position-fixed top-0 start-0 w-100 h-100 bg-dark" style={{ zIndex: 9999 }}>
          {/* Fullscreen Header */}
          <div className="d-flex align-items-center justify-content-between p-3 bg-dark text-white border-bottom border-secondary">
            <div className="d-flex align-items-center gap-3">
              <h5 className="mb-0 d-flex align-items-center gap-2">
                <MapTrifold size={20} weight="duotone" className="text-primary" />
                GIS Map - Fullscreen View
              </h5>
              
              {/* Mode Selector in Fullscreen */}
              <div className="btn-group" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="fullscreenMapMode"
                  id="fullscreen-markers-mode"
                  checked={mapMode === 'markers'}
                  onChange={() => setMapMode('markers')}
                />
                <label className="btn btn-outline-light btn-sm" htmlFor="fullscreen-markers-mode">
                  <MapTrifold size={12} /> Markers
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="fullscreenMapMode"
                  id="fullscreen-heatmap-mode"
                  checked={mapMode === 'heatmap'}
                  onChange={() => setMapMode('heatmap')}
                />
                <label className="btn btn-outline-light btn-sm" htmlFor="fullscreen-heatmap-mode">
                  <Fire size={12} /> Heatmap
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="fullscreenMapMode"
                  id="fullscreen-temporal-mode"
                  checked={mapMode === 'temporal'}
                  onChange={() => {
                    setMapMode('temporal');
                    setShowTimeSlider(true);
                  }}
                />
                <label className="btn btn-outline-light btn-sm" htmlFor="fullscreen-temporal-mode">
                  <ChartLine size={12} /> Temporal
                </label>
              </div>
            </div>
            
            <div className="d-flex align-items-center gap-2">
              <span className="small text-light opacity-75">
                {mapMode === 'temporal' ? temporalFilteredReports.length : filteredMapReports.length} reports | Press ESC to exit
              </span>
              <BootstrapButton
                variant="outline-light"
                size="sm"
                onClick={toggleFullscreen}
                className="d-flex align-items-center gap-1"
              >
                <ArrowsIn size={14} weight="regular" />
                Exit Fullscreen
              </BootstrapButton>
            </div>
          </div>
          
          {/* Time Slider in Fullscreen */}
          {mapMode === 'temporal' && (
            <div className="p-3 bg-dark border-bottom border-secondary">
              <TimeSlider
                timeRange={timeRange}
                onTimeChange={handleTimeChange}
                onRangeChange={handleRangeChange}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                playbackSpeed={playbackSpeed}
                onSpeedChange={handleSpeedChange}
                reportCounts={dailyReportCounts}
              />
            </div>
          )}
          
          {/* Fullscreen Map */}
          <div className="position-relative" style={{ height: mapMode === 'temporal' ? 'calc(100vh - 180px)' : 'calc(100vh - 80px)' }}>
            <MapContainer
              center={MAP_CENTER}
              zoom={DEFAULT_ZOOM}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              maxBounds={PANGASINAN_BOUNDS}
              maxBoundsViscosity={1.0}
              worldCopyJump={false}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                bounds={PANGASINAN_BOUNDS}
                maxNativeZoom={18}
              />

              <ResetViewButton />

              {mapMode === 'heatmap' && heatmapData.length > 0 && (
                <HeatmapLayer 
                  points={heatmapData}
                  options={{
                    radius: 30,
                    blur: 20,
                    maxZoom: 17,
                    max: 1.0,
                    minOpacity: 0.3
                  }}
                />
              )}

              {(mapMode === 'markers' || mapMode === 'temporal') && (
              <MarkerClusterGroup 
                chunkedLoading
                maxClusterRadius={80}
                spiderfyOnMaxZoom={true}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
                removeOutsideVisibleBounds={true}
                animate={true}
                iconCreateFunction={(cluster: any) => {
                  const count = cluster.getChildCount();
                  let className = 'marker-cluster-';
                  
                  if (count < 10) {
                    className += 'small';
                  } else if (count < 100) {
                    className += 'medium';
                  } else {
                    className += 'large';
                  }
                  
                  return new (window as any).L.DivIcon({ 
                    html: `<div><span>${count}</span></div>`, 
                    className: `marker-cluster ${className}`, 
                    iconSize: new (window as any).L.Point(50, 50)
                  });
                }}
              >
                {(mapMode === 'temporal' ? temporalFilteredReports : filteredMapReports).map((report) => (
                  <Marker
                    key={report.id}
                    position={[report.location!.latitude!, report.location!.longitude!]}
                    icon={getMarkerIcon(report.status)}
                  >
                    <Popup maxWidth={400} className="custom-popup">
                      <div className="popup-content">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <Badge bg={getMapStatusVariant(report.status)} className="text-capitalize">
                            {report.status}
                          </Badge>
                          <small className="text-muted">
                            {formatDate(report.timestamp)}
                          </small>
                        </div>
                        
                        <h6 className="fw-semibold text-ccrs-primary mb-2">
                          {report.category}
                        </h6>
                        
                        <p className="text-ccrs-secondary small mb-2">
                          {report.description}
                        </p>
                        
                        {report.location?.address?.formattedAddress && (
                          <div className="text-muted small mb-3">
                            📍 {report.location.address.formattedAddress}
                          </div>
                        )}
                        
                        <div className="d-flex gap-2">
                          <BootstrapButton
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setIsFullscreen(false);
                              handleViewReport(report);
                            }}
                            className="d-flex align-items-center gap-1"
                          >
                            <Eye size={14} weight="regular" />
                            View Details
                          </BootstrapButton>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MarkerClusterGroup>
              )}
            </MapContainer>
            
            {((mapMode === 'temporal' ? temporalFilteredReports : filteredMapReports).length === 0 || (mapMode === 'heatmap' && heatmapData.length === 0)) && !loading && (
              <div className="position-absolute top-50 start-50 translate-middle text-center text-white">
                {mapMode === 'heatmap' ? (
                  <Fire size={64} className="text-muted mb-3" style={{ opacity: 0.3 }} />
                ) : mapMode === 'temporal' ? (
                  <ChartLine size={64} className="text-muted mb-3" style={{ opacity: 0.3 }} />
                ) : (
                  <MapTrifold size={64} className="text-muted mb-3" style={{ opacity: 0.3 }} />
                )}
                <div className="h4 text-white-50 mb-2">
                  {mapMode === 'temporal' && temporalFilteredReports.length === 0
                    ? 'No reports for selected date'
                    : mapMode === 'heatmap' && heatmapData.length === 0
                    ? 'No heatmap data available'
                    : filterReportsWithLocation(reports).length === 0 
                    ? 'No reports with location data'
                    : 'No reports match current filters'
                  }
                </div>
                <p className="text-white-50">
                  {mapMode === 'temporal'
                    ? 'Try selecting a different date or adjusting filters'
                    : mapMode === 'heatmap'
                    ? 'Heatmap requires multiple reports in the same area'
                    : filterReportsWithLocation(reports).length === 0 
                    ? 'Reports with GPS coordinates will appear here'
                    : 'Try adjusting your filters to see more results'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </Container>
    </div>
  );
}

export default Reports;
