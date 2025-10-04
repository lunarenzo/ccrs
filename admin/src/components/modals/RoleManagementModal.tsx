import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { Shield, Users, UserCircle, Warning } from 'phosphor-react';
import { useToast } from '../../contexts/ToastContext';
import { rbacService, type UserRole, type UserStatus, type Jurisdiction } from '../../services/rbacService';

interface User {
  id: string;
  email?: string;
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  jurisdictionId?: string;
}

interface RoleManagementModalProps {
  show: boolean;
  onHide: () => void;
  user: User | null;
  onUserUpdated: (userId: string, updates: Partial<User>) => void;
}

export default function RoleManagementModal({ 
  show, 
  onHide, 
  user, 
  onUserUpdated 
}: RoleManagementModalProps) {
  const [role, setRole] = useState<UserRole>('citizen');
  const [status, setStatus] = useState<UserStatus>('active');
  const [jurisdictionId, setJurisdictionId] = useState<string>('');
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingJurisdictions, setLoadingJurisdictions] = useState(false);
  const [error, setError] = useState<string>('');
  
  const { showToast } = useToast();

  // Load jurisdictions when modal opens
  useEffect(() => {
    if (show) {
      loadJurisdictions();
    }
  }, [show]);

  // Set initial values when user changes
  useEffect(() => {
    if (user) {
      setRole(user.role || 'citizen');
      setStatus(user.status || 'active');
      setJurisdictionId(user.jurisdictionId || '');
    }
  }, [user]);

  const loadJurisdictions = async () => {
    setLoadingJurisdictions(true);
    try {
      const data = await rbacService.getJurisdictions();
      setJurisdictions(data);
    } catch (err) {
      console.error('Failed to load jurisdictions:', err);
      setJurisdictions([
        { id: 'default-jurisdiction', name: 'Default Jurisdiction', type: 'city' }
      ]);
    } finally {
      setLoadingJurisdictions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const updates: any = { role, status };
      
      // Only set jurisdiction for officers and supervisors
      if (role === 'officer' || role === 'supervisor') {
        if (!jurisdictionId) {
          setError('Jurisdiction is required for officers and supervisors');
          setLoading(false);
          return;
        }
        updates.jurisdictionId = jurisdictionId;
      }

      await rbacService.setUserRole({
        userId: user.id,
        ...updates
      });

      // Update local state
      onUserUpdated(user.id, updates);

      showToast({
        type: 'success',
        title: 'Role Updated',
        message: `Successfully updated ${user.fullName || user.email}'s role to ${role}.`
      });

      onHide();
    } catch (err: any) {
      console.error('Role update failed:', err);
      setError(err.message || 'Failed to update user role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onHide();
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield size={16} weight="fill" />;
      case 'supervisor': return <UserCircle size={16} weight="fill" />;
      case 'officer': return <Shield size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Full system access - can manage all users, reports, and system settings';
      case 'supervisor':
        return 'Manage officers and reports within jurisdiction - limited admin access';
      case 'officer':
        return 'Handle assigned reports and evidence collection - police app access';
      case 'citizen':
        return 'Submit reports and manage personal profile - citizen app access';
      default:
        return '';
    }
  };

  const getStatusVariant = (status: UserStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  const needsJurisdiction = role === 'officer' || role === 'supervisor';

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <Shield size={24} />
          Manage User Role & Permissions
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="d-flex align-items-center gap-2">
              <Warning size={20} />
              {error}
            </Alert>
          )}

          {user && (
            <>
              {/* User Info */}
              <div className="bg-light p-3 rounded mb-4">
                <h6 className="fw-bold mb-2">User Information</h6>
                <div className="small">
                  <div><strong>Name:</strong> {user.fullName || 'Not provided'}</div>
                  <div><strong>Email:</strong> {user.email || 'Not provided'}</div>
                  <div><strong>Current Role:</strong> {user.role || 'citizen'}</div>
                  <div><strong>Current Status:</strong> 
                    <span className={`ms-1 badge bg-${getStatusVariant(user.status || 'active')}`}>
                      {user.status || 'active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="mb-4">
                <Form.Label className="fw-bold">User Role</Form.Label>
                <div className="row">
                  {(['citizen', 'officer', 'supervisor', 'admin'] as UserRole[]).map((roleOption) => (
                    <div key={roleOption} className="col-md-6 mb-3">
                      <Form.Check
                        type="radio"
                        name="role"
                        id={`role-${roleOption}`}
                        label={
                          <div className="d-flex align-items-start gap-2">
                            <div className="mt-1">{getRoleIcon(roleOption)}</div>
                            <div>
                              <div className="fw-semibold text-capitalize">{roleOption}</div>
                              <small className="text-muted">{getRoleDescription(roleOption)}</small>
                            </div>
                          </div>
                        }
                        checked={role === roleOption}
                        onChange={() => setRole(roleOption)}
                      />
                    </div>
                  ))}\n                </div>
              </div>

              {/* Status Selection */}
              <div className="mb-4">
                <Form.Label className="fw-bold">Account Status</Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                >
                  <option value="active">Active - Full access to permitted features</option>
                  <option value="inactive">Inactive - Account disabled, no access</option>
                  <option value="suspended">Suspended - Temporary restriction due to violations</option>
                </Form.Select>
              </div>

              {/* Jurisdiction Selection (for officers and supervisors) */}
              {needsJurisdiction && (
                <div className="mb-4">
                  <Form.Label className="fw-bold">
                    Jurisdiction Assignment 
                    <span className="text-danger">*</span>
                  </Form.Label>
                  
                  {loadingJurisdictions ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                      <span className="ms-2">Loading jurisdictions...</span>
                    </div>
                  ) : (
                    <Form.Select
                      value={jurisdictionId}
                      onChange={(e) => setJurisdictionId(e.target.value)}
                      required={needsJurisdiction}
                    >
                      <option value="">Select a jurisdiction...</option>
                      {jurisdictions.map((jurisdiction) => (
                        <option key={jurisdiction.id} value={jurisdiction.id}>
                          {jurisdiction.name} {jurisdiction.type && `(${jurisdiction.type})`}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                  
                  <Form.Text className="text-muted">
                    {role === 'officer' 
                      ? 'Officers can only access reports within their assigned jurisdiction'
                      : 'Supervisors can manage officers and reports within their jurisdiction'
                    }
                  </Form.Text>
                </div>
              )}

              {/* Warning for sensitive role changes */}
              {(role === 'admin' && user.role !== 'admin') && (
                <Alert variant="warning" className="d-flex align-items-center gap-2">
                  <Warning size={20} />
                  <div>
                    <strong>Admin Role Change:</strong> This will grant full system administrative privileges.
                  </div>
                </Alert>
              )}
              {(user.role === 'admin' && role !== 'admin') && (
                <Alert variant="warning" className="d-flex align-items-center gap-2">
                  <Warning size={20} />
                  <div>
                    <strong>Admin Role Change:</strong> This will remove full system administrative privileges. The user will lose access to the admin dashboard.
                  </div>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            disabled={loading || (needsJurisdiction && !jurisdictionId)}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Update Role & Permissions'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
