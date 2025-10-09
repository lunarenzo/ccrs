/**
 * IRF Generation Modal Component
 * Sprint 2: Investigation & Approval Workflows
 * 
 * React component for generating PNP-compliant IRF documents
 * from validated reports in the Desk Officer portal
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner, Card } from 'react-bootstrap';
import { 
  IRFGenerationService, 
  IRFGenerationOptions 
} from './IRFGenerationService';
import { 
  IRFData, 
  EnhancedCCRSReport,
  IRFGenerationResponse 
} from '../../shared-types/sprint2-interfaces';
import './IRFGenerationModal.css';

interface IRFGenerationModalProps {
  show: boolean;
  onHide: () => void;
  report: EnhancedCCRSReport;
  currentOfficer: {
    id: string;
    name: string;
    rank?: string;
  };
  onIRFGenerated?: (irfData: IRFData, pdfUrl?: string) => void;
}

interface FormData {
  policeStationName: string;
  policeStationTelephone: string;
  investigatorMobile: string;
  chiefMobile: string;
  administeringOfficer: string;
  investigatorName: string;
  deskOfficerName: string;
  reportingPersonName: string;
  reportingPersonDetails: {
    familyName: string;
    firstName: string;
    middleName: string;
    sexGender: string;
    citizenship: string;
    civilStatus: string;
  };
  generatePDF: boolean;
  saveToPDF: boolean;
}

export const IRFGenerationModal: React.FC<IRFGenerationModalProps> = ({
  show,
  onHide,
  report,
  currentOfficer,
  onIRFGenerated
}) => {
  const [formData, setFormData] = useState<FormData>({
    policeStationName: 'Local Police Station',
    policeStationTelephone: '',
    investigatorMobile: '',
    chiefMobile: '',
    administeringOfficer: currentOfficer.name,
    investigatorName: `${currentOfficer.rank || 'Officer'} ${currentOfficer.name}`,
    deskOfficerName: `${currentOfficer.rank || 'Officer'} ${currentOfficer.name}`,
    reportingPersonName: '',
    reportingPersonDetails: {
      familyName: '',
      firstName: '',
      middleName: '',
      sexGender: '',
      citizenship: 'Filipino',
      civilStatus: ''
    },
    generatePDF: true,
    saveToPDF: true
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedIRF, setGeneratedIRF] = useState<IRFData | null>(null);
  const [step, setStep] = useState<'form' | 'preview' | 'generated'>('form');

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setStep('form');
      setError(null);
      setSuccess(null);
      setGeneratedIRF(null);
    }
  }, [show]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('reportingPersonDetails.')) {
      const subField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        reportingPersonDetails: {
          ...prev.reportingPersonDetails,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleGenerateIRF = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Prepare generation options
      const options: IRFGenerationOptions = {
        reportId: report.id,
        officerId: currentOfficer.id,
        officerName: currentOfficer.name,
        customFields: {
          ...formData,
          reportingPersonFullName: `${formData.reportingPersonDetails.firstName} ${formData.reportingPersonDetails.middleName} ${formData.reportingPersonDetails.familyName}`.trim()
        },
        generatePDF: formData.generatePDF,
        saveToPDF: formData.saveToPDF
      };

      // Generate IRF
      const response: IRFGenerationResponse = await IRFGenerationService.generateIRFData(options);

      if (response.success && response.irfData) {
        // Save IRF to report
        if (formData.saveToPDF) {
          await IRFGenerationService.saveIRFToReport(report.id, response.irfData);
        }

        setGeneratedIRF(response.irfData);
        setStep('generated');
        setSuccess('IRF generated successfully!');

        // Callback to parent component
        if (onIRFGenerated) {
          onIRFGenerated(response.irfData, response.pdfUrl);
        }
      } else {
        const errorMessages = response.errors?.map(e => e.message).join(', ') || 'Unknown error';
        setError(`Failed to generate IRF: ${errorMessages}`);
      }
    } catch (err) {
      console.error('IRF generation error:', err);
      setError(`Error generating IRF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (generatedIRF?.pdfUrl) {
      window.open(generatedIRF.pdfUrl, '_blank');
    }
  };

  const handleClose = () => {
    setStep('form');
    setError(null);
    setSuccess(null);
    setGeneratedIRF(null);
    onHide();
  };

  const renderFormStep = () => (
    <>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-file-alt me-2"></i>
          Generate IRF - {report.blotterNumber || report.id}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        <Card className="mb-4">
          <Card.Header>
            <h6 className="mb-0">
              <i className="fas fa-info-circle me-2"></i>
              Report Information
            </h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <strong>Blotter Number:</strong> {report.blotterNumber || 'Pending'}
              </Col>
              <Col md={6}>
                <strong>Type of Incident:</strong> {report.category}
              </Col>
              <Col md={6}>
                <strong>Date Reported:</strong> {report.timestamp.toDate().toLocaleDateString()}
              </Col>
              <Col md={6}>
                <strong>Location:</strong> {report.location?.address?.formattedAddress || 'Not specified'}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Form>
          {/* Police Station Information */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Police Station Information</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Police Station Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.policeStationName}
                      onChange={(e) => handleInputChange('policeStationName', e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Station Telephone</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.policeStationTelephone}
                      onChange={(e) => handleInputChange('policeStationTelephone', e.target.value)}
                      placeholder="Station contact number"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Officer Information */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Officer Information</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Administering Officer *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.administeringOfficer}
                      onChange={(e) => handleInputChange('administeringOfficer', e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Investigator Name *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.investigatorName}
                      onChange={(e) => handleInputChange('investigatorName', e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Desk Officer *</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.deskOfficerName}
                      onChange={(e) => handleInputChange('deskOfficerName', e.target.value)}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Investigator Mobile</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.investigatorMobile}
                      onChange={(e) => handleInputChange('investigatorMobile', e.target.value)}
                      placeholder="Investigator contact number"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Chief/Head Mobile</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.chiefMobile}
                      onChange={(e) => handleInputChange('chiefMobile', e.target.value)}
                      placeholder="Chief contact number"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Reporting Person Information */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Reporting Person Details</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Family Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.reportingPersonDetails.familyName}
                      onChange={(e) => handleInputChange('reportingPersonDetails.familyName', e.target.value)}
                      placeholder="Last name"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.reportingPersonDetails.firstName}
                      onChange={(e) => handleInputChange('reportingPersonDetails.firstName', e.target.value)}
                      placeholder="First name"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Middle Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.reportingPersonDetails.middleName}
                      onChange={(e) => handleInputChange('reportingPersonDetails.middleName', e.target.value)}
                      placeholder="Middle name"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sex/Gender</Form.Label>
                    <Form.Select
                      value={formData.reportingPersonDetails.sexGender}
                      onChange={(e) => handleInputChange('reportingPersonDetails.sexGender', e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Citizenship</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.reportingPersonDetails.citizenship}
                      onChange={(e) => handleInputChange('reportingPersonDetails.citizenship', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Civil Status</Form.Label>
                    <Form.Select
                      value={formData.reportingPersonDetails.civilStatus}
                      onChange={(e) => handleInputChange('reportingPersonDetails.civilStatus', e.target.value)}
                    >
                      <option value="">Select Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Generation Options */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">Generation Options</h6>
            </Card.Header>
            <Card.Body>
              <Form.Check
                type="checkbox"
                id="generatePDF"
                label="Generate PDF Document"
                checked={formData.generatePDF}
                onChange={(e) => handleInputChange('generatePDF', e.target.checked)}
                className="mb-2"
              />
              <Form.Check
                type="checkbox"
                id="saveToPDF"
                label="Save PDF to Firebase Storage"
                checked={formData.saveToPDF}
                disabled={!formData.generatePDF}
                onChange={(e) => handleInputChange('saveToPDF', e.target.checked)}
              />
              <Form.Text className="text-muted">
                PDF generation creates an official PNP-compliant IRF document that can be downloaded and printed.
              </Form.Text>
            </Card.Body>
          </Card>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleGenerateIRF}
          disabled={loading || !formData.policeStationName || !formData.administeringOfficer}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Generating IRF...
            </>
          ) : (
            <>
              <i className="fas fa-file-pdf me-2"></i>
              Generate IRF
            </>
          )}
        </Button>
      </Modal.Footer>
    </>
  );

  const renderGeneratedStep = () => (
    <>
      <Modal.Header closeButton>
        <Modal.Title className="text-success">
          <i className="fas fa-check-circle me-2"></i>
          IRF Generated Successfully
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {success && (
          <Alert variant="success" className="mb-3">
            <i className="fas fa-check me-2"></i>
            {success}
          </Alert>
        )}

        {generatedIRF && (
          <Card>
            <Card.Header>
              <h6 className="mb-0">IRF Details</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <strong>IRF Entry Number:</strong> {generatedIRF.populatedFields.irfEntryNumber}
                </Col>
                <Col md={6}>
                  <strong>Template Version:</strong> {generatedIRF.templateVersion}
                </Col>
                <Col md={6}>
                  <strong>Generated By:</strong> {currentOfficer.name}
                </Col>
                <Col md={6}>
                  <strong>Generated At:</strong> {generatedIRF.generatedAt.toDate().toLocaleString()}
                </Col>
              </Row>

              {generatedIRF.pdfUrl && (
                <div className="mt-3">
                  <hr />
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <strong>PDF Document:</strong> Ready for download
                      <br />
                      <small className="text-muted">
                        {generatedIRF.pdfFilename || 'IRF Document.pdf'}
                      </small>
                    </div>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={handleDownloadPDF}
                    >
                      <i className="fas fa-download me-2"></i>
                      Download PDF
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        {generatedIRF?.pdfUrl && (
          <Button variant="primary" onClick={handleDownloadPDF}>
            <i className="fas fa-download me-2"></i>
            Download PDF
          </Button>
        )}
      </Modal.Footer>
    </>
  );

  return (
    <Modal 
      show={show} 
      onHide={handleClose} 
      size="xl"
      backdrop="static"
      keyboard={false}
      className="irf-generation-modal"
    >
      {step === 'form' && renderFormStep()}
      {step === 'generated' && renderGeneratedStep()}
    </Modal>
  );
};

export default IRFGenerationModal;