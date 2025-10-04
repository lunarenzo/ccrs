import { useState, useEffect } from 'react';
import { Container, Row, Col, Badge } from 'react-bootstrap';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle,
  Activity
} from 'phosphor-react';
import { firebaseService, type DashboardStats, type Report } from '../services/firebaseService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ReportStatusChart } from '../components/charts/ReportStatusChart';
import { CategoryStatsChart } from '../components/charts/CategoryStatsChart';
import { ReportsTable } from '../components/reports/ReportsTable';
import { formatDate } from '../lib/utils';

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalReports: 0,
    pendingReports: 0,
    validatedReports: 0,
    respondingReports: 0,
    resolvedReports: 0,
    rejectedReports: 0,
    anonymousReports: 0,
    authenticatedReports: 0,
    categoryStats: {},
  });
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<Report[]>([]);

  useEffect(() => {
    let mounted = true;
    
    // Subscribe to real-time dashboard stats
    const unsubscribeStats = firebaseService.subscribeToDashboardStats((newStats) => {
      if (mounted) {
        setStats(newStats);
        setLoading(false);
      }
    });

    // Subscribe to recent reports for activity feed
    const unsubscribeReports = firebaseService.subscribeToReports((allReports) => {
      if (mounted) {
        setRecentReports(allReports.slice(0, 5)); // Get 5 most recent reports
      }
    });

    // Set a fallback timeout to stop loading even if Firebase fails
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Dashboard loading timeout - proceeding with empty data');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribeStats();
      unsubscribeReports();
    };
  }, [loading]);

  // KPI layout: responsive left strip; capped on large screens to avoid excess width
  const iconStripWidth = 'min(26%, 110px)';

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <LoadingSpinner size="sm" />
      </Container>
    );
  }

  return (
    <div className="dashboard-container">
      <Container fluid className="p-0">
        <div className="d-flex flex-column gap-4">
          {/* Dashboard Header */}
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
              <h1 className="h3 fw-bold text-ccrs-primary mb-1">Dashboard</h1>
            </div>
            <Badge bg="secondary" className="px-3 py-2">
              Last updated: {formatDate(new Date())}
            </Badge>
          </div>

          {/* KPI Cards */}
          <Row xs={1} sm={2} lg={4} className="g-3 mb-4">
            {/* KPI 1 - Total Users */}
            <Col>
              <div 
                className="h-100 position-relative overflow-hidden d-flex align-items-center justify-content-between p-4 text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
                  minHeight: '120px',
                  boxShadow: '0 4px 15px rgba(13, 110, 253, 0.2)'
                }}
              >
                <div className="d-flex flex-column">
                  <div className="h2 fw-bold mb-1" style={{ fontSize: '2.5rem' }}>
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <div className="fw-medium" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    TOTAL USERS
                  </div>
                </div>
                <div className="position-absolute" style={{ right: '20px', top: '20px', opacity: 0.3 }}>
                  <Users size={48} weight="fill" />
                </div>
              </div>
            </Col>

            {/* KPI 2 - Total Reports */}
            <Col>
              <div 
                className="h-100 position-relative overflow-hidden d-flex align-items-center justify-content-between p-4 text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #198754 0%, #146c43 100%)',
                  minHeight: '120px',
                  boxShadow: '0 4px 15px rgba(25, 135, 84, 0.2)'
                }}
              >
                <div className="d-flex flex-column">
                  <div className="h2 fw-bold mb-1" style={{ fontSize: '2.5rem' }}>
                    {stats.totalReports.toLocaleString()}
                  </div>
                  <div className="fw-medium" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    TOTAL REPORTS
                  </div>
                </div>
                <div className="position-absolute" style={{ right: '20px', top: '20px', opacity: 0.3 }}>
                  <FileText size={48} weight="fill" />
                </div>
              </div>
            </Col>

            {/* KPI 3 - Pending Reports */}
            <Col>
              <div 
                className="h-100 position-relative overflow-hidden d-flex align-items-center justify-content-between p-4 text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)',
                  minHeight: '120px',
                  boxShadow: '0 4px 15px rgba(255, 193, 7, 0.2)'
                }}
              >
                <div className="d-flex flex-column">
                  <div className="h2 fw-bold mb-1" style={{ fontSize: '2.5rem' }}>
                    {stats.pendingReports.toLocaleString()}
                  </div>
                  <div className="fw-medium" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    PENDING REPORTS
                  </div>
                </div>
                <div className="position-absolute" style={{ right: '20px', top: '20px', opacity: 0.3 }}>
                  <Clock size={48} weight="fill" />
                </div>
              </div>
            </Col>

            {/* KPI 4 - Resolved Reports */}
            <Col>
              <div 
                className="h-100 position-relative overflow-hidden d-flex align-items-center justify-content-between p-4 text-white"
                style={{ 
                  background: 'linear-gradient(135deg, #0dcaf0 0%, #31d2f2 100%)',
                  minHeight: '120px',
                  boxShadow: '0 4px 15px rgba(13, 202, 240, 0.2)'
                }}
              >
                <div className="d-flex flex-column">
                  <div className="h2 fw-bold mb-1" style={{ fontSize: '2.5rem' }}>
                    {stats.resolvedReports.toLocaleString()}
                  </div>
                  <div className="fw-medium" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    RESOLVED REPORTS
                  </div>
                </div>
                <div className="position-absolute" style={{ right: '20px', top: '20px', opacity: 0.3 }}>
                  <CheckCircle size={48} weight="fill" />
                </div>
              </div>
            </Col>
          </Row>

          {/* Charts Row */}
          <Row xs={1} lg={2} className="g-4 mb-4">
            {/* Chart 1 - Report Status Overview */}
            <Col>
              <ReportStatusChart data={stats} />
            </Col>

            {/* Chart 2 - Category Statistics */}
            <Col>
              <CategoryStatsChart data={stats.categoryStats} />
            </Col>
          </Row>

          {/* Recent Activities Section */}
          <Row>
            <Col>
              <Card className="border-0 shadow-sm">
                <CardHeader className="bg-light border-bottom">
                  <CardTitle className="h6 mb-0 text-ccrs-primary d-flex align-items-center gap-2">
                    <Activity size={18} weight="regular" />
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ReportsTable
                    reports={recentReports}
                    showActions={false} // No actions in recent activities view
                    showSearch={false} // No search in dashboard view
                    enableFilters={false} // No filters in dashboard view
                    showDescription={false} // No description column in dashboard view
                    compact={true} // More compact layout for dashboard
                    limit={5} // Show only 5 most recent reports
                    className="mb-0"
                  />
                </CardContent>
                {recentReports.length === 0 && (
                  <CardContent className="p-4 text-center text-muted">
                    <Activity size={48} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                    <div>No recent activities</div>
                    <small>Reports will appear here as they are submitted</small>
                  </CardContent>
                )}
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
}

export default Dashboard;
