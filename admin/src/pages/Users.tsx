import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Badge, ListGroup, InputGroup, Button } from 'react-bootstrap';
import { firebaseService } from '../services/firebaseService';
import { auditService } from '../services/auditService';
import { rateLimitService } from '../services/rateLimitService';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getStatusVariant, formatDate } from '../lib/utils';
import { type UserRole, type UserStatus } from '../services/rbacService';
import { inviteService, type OfficerInvite } from '../services/inviteService';
import RoleManagementModal from '../components/modals/RoleManagementModal';
import InviteOfficerModal from '../components/modals/InviteOfficerModal';
import { Shield, UserCircle, Users as UsersIcon } from 'phosphor-react';

interface User {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  isVerified?: boolean;
  role?: UserRole;
  status: UserStatus;
  jurisdictionId?: string;
  createdAt: string;
  reportsCount: number;
}

function Users() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invites, setInvites] = useState<OfficerInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [reportCounts, setReportCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initial load
    loadUsers();
    loadInvites();

    // Real-time: users subscription
    const unsubUsers = firebaseService.subscribeToUsers((rawUsers) => {
      const mapped = rawUsers.map((user: any) => ({
        id: user.id,
        email: user.email || `${user.phoneNumber}@phone.local` || 'No email',
        fullName: user.name || user.fullName || 'Unknown User',
        phoneNumber: user.phoneNumber || user.phone || '',
        isVerified: user.isPhoneVerified || user.isVerified || user.verified || false,
        role: user.role || 'citizen',
        status: (user.status as 'active' | 'inactive' | 'suspended') || 'active',
        createdAt: user.createdAt,
        reportsCount: 0,
      }));
      // Merge report counts if we have them
      setUsers(mapped.map(u => ({ ...u, reportsCount: reportCounts[u.id] || 0 })));
      setLoading(false);
    });

    // Real-time: reports subscription for counts
    const unsubReports = firebaseService.subscribeToReports((reports) => {
      const counts = reports.reduce((acc: Record<string, number>, r: any) => {
        const uid = r.user_id || r.userId;
        if (uid) acc[uid] = (acc[uid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      setReportCounts(counts);
      // Apply counts to current users list
      setUsers(prev => prev.map(u => ({ ...u, reportsCount: counts[u.id] || 0 })));
    });

    return () => {
      try { unsubUsers && unsubUsers(); } catch {}
      try { unsubReports && unsubReports(); } catch {}
    };
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const [usersData, reportsData] = await Promise.all([
        firebaseService.getUsers(),
        firebaseService.getReports()
      ]);

      // Calculate report counts for each user
      const userReportCounts = reportsData.reduce((acc: Record<string, number>, report: any) => {
        if (report.userId || report.user_id) {
          const userId = report.userId || report.user_id;
          acc[userId] = (acc[userId] || 0) + 1;
        }
        return acc;
      }, {});

      const usersWithReportCounts = usersData.map((user: any) => ({
        id: user.id,
        email: user.email || `${user.phoneNumber}@phone.local` || 'No email',
        fullName: user.name || user.fullName || 'Unknown User',
        phoneNumber: user.phoneNumber || user.phone || '',
        isVerified: user.isPhoneVerified || user.isVerified || user.verified || false,
        role: user.role || 'citizen',
        status: (user.status as 'active' | 'inactive' | 'suspended') || 'active',
        createdAt: user.createdAt,
        reportsCount: userReportCounts[user.id] || 0,
      }));

      setUsers(usersWithReportCounts);
    } catch (error) {
      console.error('Error loading users:', error);
      // Set empty array if no users exist yet
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      setLoadingInvites(true);
      const list = await inviteService.listInvites({ limit: 50 });
      setInvites(list);
    } catch (e) {
      console.error('Error loading invites:', e);
      setInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  // Refresh invites after closing the invite modal
  useEffect(() => {
    if (!showInviteModal) loadInvites();
  }, [showInviteModal]);

  const handleRevokeInvite = async (inviteId?: string) => {
    if (!inviteId) return;
    try {
      await inviteService.revokeInvite(inviteId);
      setInvites(prev => prev.map(i => i.id === inviteId ? { ...i, status: 'revoked' } as any : i));
    } catch (e) {
      console.error('Failed to revoke invite:', e);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleManageRole = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const handleUserUpdated = (userId: string, updates: Partial<User>) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'admin': return <Shield size={16} weight="fill" />;
      case 'supervisor': return <UserCircle size={16} weight="fill" />;
      case 'officer': return <Shield size={16} />;
      default: return <UsersIcon size={16} />;
    }
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'supervisor': return 'warning';
      case 'officer': return 'info';
      default: return 'secondary';
    }
  };

  // Using imported formatDate function from utils

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '300px' }}>
        <LoadingSpinner size="sm" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="align-items-center mb-4">
        <Col md={6}>
          <h1 className="h2 fw-bold text-ccrs-primary mb-2">Users</h1>
          <p className="text-ccrs-secondary mb-0">Manage registered users</p>
        </Col>
        <Col md={6} className="text-md-end">
          <InputGroup className="w-auto d-inline-flex" style={{ maxWidth: '300px' }}>
            <InputGroup.Text className="bg-white border-end-0">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-start-0"
            />
          </InputGroup>
        </Col>
      </Row>

      {/* Users Table */}
      <Card className="shadow-ccrs border-0">
        <Card.Header className="bg-ccrs-light border-ccrs d-flex justify-content-between align-items-center">
          <div>
            <h3 className="h5 mb-0 text-ccrs-primary fw-semibold">
              All Users ({filteredUsers.length})
            </h3>
          </div>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-auto"
            >
              <option value="all">All Roles</option>
              <option value="citizen">Citizens</option>
              <option value="officer">Officers</option>
              <option value="supervisor">Supervisors</option>
              <option value="admin">Admins</option>
            </Form.Select>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-auto"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Form.Select>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setShowInviteModal(true)}
            >
              Invite Officer
            </Button>
          </div>
        </Card.Header>
        <ListGroup variant="flush">
          {filteredUsers.map((user) => (
            <ListGroup.Item key={user.id} className="border-0 py-4">
              <Row className="align-items-center">
                <Col xs="auto">
                  <div 
                    className="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-ccrs-primary fw-semibold"
                    style={{ width: '48px', height: '48px' }}
                  >
                    {(user.fullName || 'U').split(' ').map(n => n[0]).join('')}
                  </div>
                </Col>
                <Col>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <h6 className="fw-bold text-ccrs-primary mb-0">{user.fullName}</h6>
                    <Badge bg={user.isVerified ? 'success' : 'warning'} className="text-capitalize">
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                    <Badge bg={getRoleBadgeVariant(user.role)} className="d-flex align-items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role || 'citizen'}
                    </Badge>
                    <Badge bg={getStatusVariant(user.status)} className="text-capitalize">
                      {user.status}
                    </Badge>
                  </div>
                  <div className="text-ccrs-secondary small">
                    <div className="mb-1">📧 {user.email}</div>
                    <div className="mb-1">📱 {user.phoneNumber || 'No phone'}</div>
                    <div>📊 {user.reportsCount} reports</div>
                  </div>
                </Col>
                <Col xs="auto" className="text-end">
                  <div className="text-ccrs-secondary small mb-2">
                    Joined {formatDate(user.createdAt)}
                  </div>
                  <div className="d-flex flex-column gap-1">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() => handleManageRole(user)}
                      className="d-flex align-items-center gap-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      <Shield size={12} />
                      Manage Role
                    </Button>
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          ))}
        </ListGroup>
        
        {filteredUsers.length === 0 && !loading && (
          <Card.Body className="text-center py-5">
            <div className="mx-auto bg-light rounded-circle d-flex align-items-center justify-content-center mb-3" style={{ width: '64px', height: '64px' }}>
              <svg className="text-muted" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h5 className="fw-semibold text-ccrs-primary mb-2">No Users Found</h5>
            <p className="text-ccrs-secondary mb-0">
              {searchTerm || statusFilter !== 'all' ? 'No users match your filters' : 'No users registered yet'}
            </p>
          </Card.Body>
        )}
      </Card>

      {/* Officer Invites */}
      <Card className="shadow-ccrs border-0 mt-4">
        <Card.Header className="bg-ccrs-light border-ccrs d-flex justify-content-between align-items-center">
          <h3 className="h6 mb-0 text-ccrs-primary fw-semibold">Officer Invites</h3>
          <div className="text-muted small">Latest {Math.min(invites.length, 50)} invites</div>
        </Card.Header>
        <ListGroup variant="flush">
          {loadingInvites && (
            <ListGroup.Item className="py-4">
              <div className="d-flex align-items-center gap-2 text-muted">
                <span className="spinner-border spinner-border-sm" /> Loading invites...
              </div>
            </ListGroup.Item>
          )}
          {!loadingInvites && invites.length === 0 && (
            <ListGroup.Item className="py-4 text-muted">No invites yet.</ListGroup.Item>
          )}
          {!loadingInvites && invites.map((inv) => (
            <ListGroup.Item key={inv.id} className="py-3">
              <Row className="align-items-center">
                <Col md>
                  <div className="fw-semibold text-ccrs-primary">{inv.email}</div>
                  <div className="text-ccrs-secondary small">
                    Code: <code>{(inv as any).inviteCode}</code> · Jurisdiction: {(inv as any).jurisdictionId}
                  </div>
                </Col>
                <Col md="auto" className="text-end">
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={
                      (inv as any).status === 'pending' ? 'info' :
                      (inv as any).status === 'revoked' ? 'secondary' :
                      (inv as any).status === 'expired' ? 'warning' : 'success'
                    } className="text-capitalize">
                      {(inv as any).status || 'pending'}
                    </Badge>
                    {(inv as any).status === 'pending' && (
                      <Button size="sm" variant="outline-danger" onClick={() => handleRevokeInvite(inv.id)}>
                        Revoke
                      </Button>
                    )}
                  </div>
                </Col>
              </Row>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
      
      {/* Role Management Modal */}
      <RoleManagementModal
        show={showRoleModal}
        onHide={() => {
          setShowRoleModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />

      {/* Invite Officer Modal */}
      <InviteOfficerModal
        show={showInviteModal}
        onHide={() => setShowInviteModal(false)}
      />
    </Container>
  );
}

export default Users;
