import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { Clock, FileText, CheckCircle, XCircle, Warning, User } from 'phosphor-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { BlotterService } from '../services/blotterService';

interface Report {
  id: string;
  user_id?: string;
  mainCategory: string;
  category: string;
  description: string;
  status: 'pending' | 'validated' | 'rejected';
  timestamp: any;
  location?: {
    latitude: number;
    longitude: number;
    address?: {
      formattedAddress?: string;
      city?: string;
      region?: string;
    };
  };
  media_urls?: string[];
  isEmergency?: boolean;
  triageLevel?: 'critical' | 'high' | 'medium' | 'low';
  triageNotes?: string;
  blotterNumber?: string;
}

type TriageLevel = 'critical' | 'high' | 'medium' | 'low';

const DeskOfficerPortal: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationAction, setValidationAction] = useState<'approve' | 'reject'>('approve');
  const [triageLevel, setTriageLevel] = useState<TriageLevel>('medium');
  const [triageNotes, setTriageNotes] = useState('');
  const [assignToOfficer, setAssignToOfficer] = useState('');
  const [processingBlotter, setProcessingBlotter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load pending reports
  useEffect(() => {
    const q = query(
      collection(db, 'reports'),
      where('status', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Report));
      
      setReports(reportsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading reports:', error);
      setError('Failed to load reports');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleValidateReport = (report: Report, action: 'approve' | 'reject') => {
    setSelectedReport(report);
    setValidationAction(action);
    setTriageLevel(report.isEmergency ? 'critical' : 'medium');
    setTriageNotes('');
    setAssignToOfficer('');
    setShowValidationModal(true);
  };

  const processValidation = async () => {
    if (!selectedReport || !user) return;

    try {
      setProcessingBlotter(true);
      setError(null);

      const reportRef = doc(db, 'reports', selectedReport.id);
      const now = Timestamp.now();
      
      if (validationAction === 'approve') {
        // Generate blotter number
        const blotterResult = await BlotterService.generateBlotterNumber();
        
        if (!blotterResult.success || !blotterResult.blotterNumber) {
          throw new Error(blotterResult.error || 'Failed to generate blotter number');
        }

        // Update report with validation, triage, and blotter information
        const updateData: any = {
          status: 'validated',
          triageLevel,
          triageNotes: triageNotes || null,
          triageBy: user.uid,
          triageAt: now,
          blotterNumber: blotterResult.blotterNumber,
          blotterCreatedAt: now,
          blotterCreatedBy: user.uid,
          updatedAt: now,
        };

        if (assignToOfficer) {
          updateData.assignedTo = assignToOfficer;
          updateData.status = 'assigned';
          updateData.assignmentStatus = 'pending';
        }

        await updateDoc(reportRef, updateData);
        
        setSuccess(`Report validated successfully with blotter number: ${blotterResult.blotterNumber}`);
      } else {
        // Reject the report
        await updateDoc(reportRef, {
          status: 'rejected',
          triageLevel,
          triageNotes: triageNotes || 'Report rejected during validation',
          triageBy: user.uid,
          triageAt: now,
          updatedAt: now,
        });

        setSuccess('Report rejected successfully');
      }

      setShowValidationModal(false);
      setSelectedReport(null);
    } catch (error) {
      console.error('Error processing validation:', error);
      setError(error instanceof Error ? error.message : 'Failed to process validation');
    } finally {
      setProcessingBlotter(false);
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getTriageBadgeVariant = (level: TriageLevel) => {
    switch (level) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('emergency') || category.includes('critical')) {
      return <Warning size={20} weight="fill" />;
    }
    return <FileText size={20} />;
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading pending reports...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Desk Officer Portal</h2>
              <p className="text-muted">Validate pending reports and assign blotter numbers</p>
            </div>
            <div className="text-end">
              <Badge bg="primary" className="me-2">
                <Clock size={16} className="me-1" />
                {reports.length} Pending Reports
              </Badge>
            </div>
          </div>

          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
              {success}
            </Alert>
          )}

          {reports.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-5">
                <CheckCircle size={48} className="text-success mb-3" />
                <h5>All Reports Processed</h5>
                <p className="text-muted">No pending reports require validation at this time.</p>
              </Card.Body>
            </Card>
          ) : (
            <Row>
              {reports.map((report) => (
                <Col lg={6} xl={4} key={report.id} className="mb-4">
                  <Card className={`h-100 ${report.isEmergency ? 'border-danger' : ''}`}>
                    <Card.Header className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center">
                        {getCategoryIcon(report.category)}
                        <div className="ms-2">
                          <h6 className="mb-0">{report.mainCategory}</h6>
                          <small className="text-muted">{report.category}</small>
                        </div>
                      </div>
                      {report.isEmergency && (
                        <Badge bg="danger">
                          <Warning size={14} className="me-1" />
                          Emergency
                        </Badge>
                      )}
                    </Card.Header>
                    
                    <Card.Body>
                      <p className="text-muted small mb-2">
                        <Clock size={14} className="me-1" />
                        {formatTimestamp(report.timestamp)}
                      </p>
                      
                      {report.location && (
                        <p className="text-muted small mb-2">
                          📍 {report.location.address?.city || 'Location provided'}
                        </p>
                      )}
                      
                      <p className="mb-3">{report.description.substring(0, 100)}...</p>
                      
                      {report.media_urls && report.media_urls.length > 0 && (
                        <p className="text-muted small mb-3">
                          📎 {report.media_urls.length} media file(s) attached
                        </p>
                      )}
                    </Card.Body>
                    
                    <Card.Footer className="d-flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleValidateReport(report, 'approve')}
                        className="flex-fill"
                      >
                        <CheckCircle size={16} className="me-1" />
                        Approve & Assign Blotter
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleValidateReport(report, 'reject')}
                      >
                        <XCircle size={16} className="me-1" />
                        Reject
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>

      {/* Validation Modal */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {validationAction === 'approve' ? 'Approve Report' : 'Reject Report'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          {selectedReport && (
            <>
              <div className="mb-3">
                <strong>Report Details:</strong>
                <p>{selectedReport.description}</p>
              </div>

              <Form>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Triage Level</Form.Label>
                      <Form.Select 
                        value={triageLevel}
                        onChange={(e) => setTriageLevel(e.target.value as TriageLevel)}
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                        <option value="critical">Critical Priority</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  {validationAction === 'approve' && (
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Assign to Officer (Optional)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Officer ID"
                          value={assignToOfficer}
                          onChange={(e) => setAssignToOfficer(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  )}
                </Row>

                <Form.Group className="mb-3">
                  <Form.Label>Triage Notes</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    placeholder={validationAction === 'approve' 
                      ? "Add any validation notes or instructions..." 
                      : "Reason for rejection..."
                    }
                    value={triageNotes}
                    onChange={(e) => setTriageNotes(e.target.value)}
                  />
                </Form.Group>

                {validationAction === 'approve' && (
                  <Alert variant="info">
                    <strong>Note:</strong> Approving this report will automatically generate a unique blotter number 
                    in the format YYYY-MM-NNNNNN and mark it as validated.
                  </Alert>
                )}
              </Form>
            </>
          )}
        </Modal.Body>
        
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Cancel
          </Button>
          <Button
            variant={validationAction === 'approve' ? 'success' : 'danger'}
            onClick={processValidation}
            disabled={processingBlotter}
          >
            {processingBlotter ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              <>
                {validationAction === 'approve' ? (
                  <>
                    <CheckCircle size={16} className="me-1" />
                    Approve & Generate Blotter
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="me-1" />
                    Reject Report
                  </>
                )}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DeskOfficerPortal;