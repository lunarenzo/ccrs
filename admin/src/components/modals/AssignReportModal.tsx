import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Spinner, Alert, ListGroup, InputGroup } from 'react-bootstrap';
import { firebaseService, type Report, type User } from '../../services/firebaseService';
import { useToast } from '../../contexts/ToastContext';
import { Shield, Warning } from 'phosphor-react';

interface AssignReportModalProps {
  show: boolean;
  onHide: () => void;
  report: Report | null;
  onConfirm: (officerId: string) => Promise<void> | void;
}

export default function AssignReportModal({ show, onHide, report, onConfirm }: AssignReportModalProps) {
  const { showToast } = useToast();
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!show) return;
      setLoading(true);
      setError('');
      try {
        const list = await firebaseService.getActiveOfficers();
        if (mounted) setOfficers(list);
      } catch (e: any) {
        console.error('Failed to load officers', e);
        setError('Failed to load active officers. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [show]);

  useEffect(() => {
    if (!show) {
      setSelectedOfficerId('');
      setSearchTerm('');
      setError('');
    }
  }, [show]);

  const filteredOfficers = officers.filter(o => {
    const key = `${o.name || ''} ${o.email || ''}`.toLowerCase();
    return key.includes(searchTerm.toLowerCase());
  });

  const handleConfirm = async () => {
    if (!selectedOfficerId) {
      setError('Please select an officer to assign.');
      return;
    }
    try {
      await onConfirm(selectedOfficerId);
      showToast({ type: 'success', title: 'Assignment Scheduled', message: 'Report assignment initiated.', duration: 3000 });
      onHide();
    } catch (e: any) {
      console.error('Assignment failed', e);
      setError(e?.message || 'Failed to assign report.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <Shield size={20} />
          Assign Report to Officer
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            <Warning size={18} />
            {error}
          </Alert>
        )}
        {!report && (
          <Alert variant="warning" className="d-flex align-items-center gap-2">
            <Warning size={18} />
            No report selected
          </Alert>
        )}
        <div className="mb-3">
          <Form.Label className="fw-semibold">Search Officers</Form.Label>
          <InputGroup>
            <Form.Control
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        {loading ? (
          <div className="d-flex align-items-center gap-2 text-muted">
            <Spinner animation="border" size="sm" /> Loading officers...
          </div>
        ) : (
          <ListGroup style={{ maxHeight: 360, overflowY: 'auto' }}>
            {filteredOfficers.map((officer) => (
              <ListGroup.Item key={officer.id} action onClick={() => setSelectedOfficerId(officer.id)} active={selectedOfficerId === officer.id}>
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-semibold">{officer.name || officer.email || 'Officer'}</div>
                    <div className="text-muted small">{officer.email || 'No email'}</div>
                  </div>
                  <Form.Check
                    type="radio"
                    name="selectedOfficer"
                    checked={selectedOfficerId === officer.id}
                    onChange={() => setSelectedOfficerId(officer.id)}
                    aria-label={`Select ${officer.name || officer.email}`}
                  />
                </div>
              </ListGroup.Item>
            ))}
            {!loading && filteredOfficers.length === 0 && (
              <ListGroup.Item className="text-muted">No active officers found</ListGroup.Item>
            )}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!selectedOfficerId || !report}>
          Assign
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
