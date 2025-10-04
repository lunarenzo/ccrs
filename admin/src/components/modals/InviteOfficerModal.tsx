import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { Shield, Warning } from 'phosphor-react';
import { useAuth } from '../../contexts/AuthContext';
import { rbacService, type Jurisdiction } from '../../services/rbacService';
import { inviteService } from '../../services/inviteService';

interface InviteOfficerModalProps {
  show: boolean;
  onHide: () => void;
}

export default function InviteOfficerModal({ show, onHide }: InviteOfficerModalProps) {
  const { user: admin } = useAuth();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number>(14);
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingJurisdictions, setLoadingJurisdictions] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<{ code: string; email: string } | null>(null);

  useEffect(() => {
    if (!show) return;
    setSuccess(null);
    setError('');
    setEmail('');
    setFullName('');
    setJurisdictionId('');
    setExpiresInDays(14);
    loadJurisdictions();
  }, [show]);

  async function loadJurisdictions() {
    setLoadingJurisdictions(true);
    try {
      const data = await rbacService.getJurisdictions();
      setJurisdictions(data);
    } catch (e) {
      setJurisdictions([{ id: 'default-jurisdiction', name: 'Default Jurisdiction', type: 'city' }]);
    } finally {
      setLoadingJurisdictions(false);
    }
  }

  const canSubmit = useMemo(() => {
    return !!email && /.+@.+/.test(email) && !!jurisdictionId && !loading;
  }, [email, jurisdictionId, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!admin) return;
    setLoading(true);
    setError('');
    try {
      const res = await inviteService.createOfficerInvite(
        {
          email: email.trim(),
          fullName: fullName.trim() || undefined,
          jurisdictionId,
          expiresInDays,
        },
        { uid: admin.id, email: admin.email }
      );
      setSuccess({ code: res.inviteCode, email: email.trim() });
    } catch (e: any) {
      setError(e?.message || 'Failed to create invite.');
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    setError('');
    setSuccess(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          Invite Police Officer
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

          {!success ? (
            <>
              <p className="text-muted">
                Create an invite for a police officer. They will sign up in the police app and provide this invite code during onboarding. After registration, you can confirm their account and manage roles.
              </p>

              <Form.Group className="mb-3" controlId="inviteEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="officer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="inviteFullName">
                <Form.Label>Full Name (optional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="inviteJurisdiction">
                <Form.Label>Jurisdiction</Form.Label>
                {loadingJurisdictions ? (
                  <div className="d-flex align-items-center gap-2 text-muted">
                    <Spinner animation="border" size="sm" /> Loading jurisdictions...
                  </div>
                ) : (
                  <Form.Select
                    value={jurisdictionId}
                    onChange={(e) => setJurisdictionId(e.target.value)}
                    required
                  >
                    <option value="">Select a jurisdiction...</option>
                    {jurisdictions.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.name} {j.type ? `(${j.type})` : ''}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-2" controlId="inviteExpiry">
                <Form.Label>Invite Expiry</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min={1}
                    max={60}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value || '14', 10))}
                  />
                  <InputGroup.Text>days</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted">Default is 14 days.</Form.Text>
              </Form.Group>
            </>
          ) : (
            <Alert variant="success">
              <div className="fw-semibold mb-1">Invite created for {success.email}</div>
              <div className="mb-2">Share this invite code with the officer:</div>
              <div className="p-2 bg-light rounded d-inline-flex align-items-center gap-2">
                <code>{success.code}</code>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => navigator.clipboard.writeText(success.code)}
                >
                  Copy
                </Button>
              </div>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Close
          </Button>
          {!success && (
            <Button type="submit" variant="primary" disabled={!canSubmit}>
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Creating...
                </>
              ) : (
                'Create Invite'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
