import React, { useEffect, useState } from 'react';
import { Modal, Button, Form, Alert, InputGroup } from 'react-bootstrap';
import type { Report } from '../../services/firebaseService';
import { Warning } from 'phosphor-react';

interface NotifyOfficerModalProps {
  show: boolean;
  onHide: () => void;
  report: Report | null;
  onConfirm: (payload: { title: string; body: string }) => Promise<void> | void;
}

export default function NotifyOfficerModal({ show, onHide, report, onConfirm }: NotifyOfficerModalProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string>('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!show) return;
    const fallbackTitle = 'New Case Update';
    const fallbackBody = report
      ? `Report ${report.id} (${report.priority || 'medium'}) — please review in the Police app.`
      : 'Please review your assigned case in the Police app.';
    setTitle(fallbackTitle);
    setBody(fallbackBody);
    setError('');
  }, [show, report?.id]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and message are required.');
      return;
    }
    setSending(true);
    try {
      await onConfirm({ title: title.trim(), body: body.trim() });
      onHide();
    } catch (e: any) {
      setError(e?.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Notify Assigned Officer</Modal.Title>
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
        {report && (
          <div className="mb-3 small text-muted">
            Target officer UID: {(report as any).assignedTo || 'unassigned'}
          </div>
        )}
        <div className="mb-3">
          <Form.Label className="fw-semibold">Title</Form.Label>
          <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
        </div>
        <div className="mb-3">
          <Form.Label className="fw-semibold">Message</Form.Label>
          <InputGroup>
            <Form.Control
              as="textarea"
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a short message"
            />
          </InputGroup>
          <div className="form-text">Do not include sensitive information. Officers will open the app for details.</div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={sending}>Cancel</Button>
        <Button variant="primary" onClick={handleSend} disabled={!report || sending}>
          {sending ? 'Sending…' : 'Send Notification'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
