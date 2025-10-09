/**
 * IRF Preview and Edit Interface
 * PNP Citizen Crime Reporting System (CCRS)
 * Sprint 2: IRF Auto-generation
 * 
 * React component for officers to preview generated IRF data, 
 * edit fields before finalizing PDF, and validate required fields.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Badge,
  Spinner,
  Modal,
  Tab,
  Tabs,
  InputGroup,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  Warning, 
  PencilSimple, 
  FloppyDisk,
  X,
  Info
} from 'phosphor-react';
import type { 
  IRFTemplate, 
  IRFData, 
  IRFGenerationRequest,
  IRFTemplateField,
  IRFTemplateSection,
  ValidationError,
  EnhancedCCRSReport
} from '../../../../shared-types/sprint2-interfaces';
import type { CCRSReport, CCRSUser } from '../../../../shared-types/rbac';
import { 
  generateIRFData,
  updateIRFData,
  validateIRFData,
  isIRFReadyForPDF,
  formatFieldValueForDisplay 
} from '../../../../shared-utils/irfMapper';
import {
  generateTemplatePDF,
  downloadTemplatePDF,
  previewTemplatePDF,
  createPDFFilename
} from '../../utils/templatePdfGenerator';
import { getPhilippineTime, formatPhilippineDate } from '../../lib/utils';

interface IRFPreviewEditorProps {
  report: CCRSReport | EnhancedCCRSReport;
  template: IRFTemplate;
  reporterUser?: CCRSUser;
  officerData?: {
    deskOfficer?: CCRSUser;
    investigator?: CCRSUser;
    policeStation?: {
      name: string;
      telephone?: string;
      chiefMobile?: string;
    };
  };
  generatedBy: string;
  onIRFGenerated?: (irfData: IRFData, pdfBlob: Blob) => void;
  onCancel?: () => void;
  className?: string;
  
  // Form persistence props
  initialEditedFields?: Record<string, any>;
  initialIsEditing?: boolean;
  initialActiveTab?: string;
  onFormStateChange?: (newState: {
    editedFields?: Record<string, any>;
    isEditing?: boolean;
    activeTab?: string;
  }) => void;
}

const IRFPreviewEditor: React.FC<IRFPreviewEditorProps> = ({
  report,
  template,
  reporterUser,
  officerData,
  generatedBy,
  onIRFGenerated,
  onCancel,
  className,
  initialEditedFields = {},
  initialIsEditing = false,
  initialActiveTab = 'preview',
  onFormStateChange
}) => {
  const [irfData, setIrfData] = useState<IRFData | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>(initialEditedFields);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [error, setError] = useState<string | null>(null);

  // Generate initial IRF data
  useEffect(() => {
    try {
      console.log('=== IRF DATA GENERATION (IRFPreviewEditor) ===');
      console.log('Report:', { id: report.id, type: (report as any).incidentType || 'unknown', timestamp: report.timestamp });
      console.log('Template:', { id: template.id, name: template.name, version: template.version });
      console.log('Reporter User:', reporterUser ? { id: (reporterUser as any).uid || reporterUser.id, name: reporterUser.fullName } : 'None');
      console.log('Officer Data:', officerData ? Object.keys(officerData) : 'None');
      
      const request: IRFGenerationRequest = {
        reportId: report.id,
        templateId: template.id,
        generatedBy,
        autoFinalize: false
      };

      const generatedIRF = generateIRFData(
        request,
        report,
        template,
        reporterUser,
        officerData
      );

      console.log('Generated IRF populated fields:', Object.keys(generatedIRF.populatedFields));
      console.log('Sample populated values:');
      Object.entries(generatedIRF.populatedFields).slice(0, 10).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
      });

      setIrfData(generatedIRF);
      setValidationErrors(generatedIRF.validationErrors || []);
    } catch (err) {
      console.error('Error generating IRF data:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate IRF data');
    }
  }, [report, template, reporterUser, officerData, generatedBy]);
  
  // Sync form state changes to parent (for persistence) - with debouncing
  const debouncedSyncState = useCallback(() => {
    if (onFormStateChange) {
      onFormStateChange({
        editedFields,
        isEditing,
        activeTab
      });
    }
  }, [editedFields, isEditing, activeTab, onFormStateChange]);
  
  useEffect(() => {
    const timeoutId = setTimeout(debouncedSyncState, 100); // Debounce for 100ms
    return () => clearTimeout(timeoutId);
  }, [debouncedSyncState]);

  // Memoized field validation status
  const fieldValidationStatus = useMemo(() => {
    if (!irfData || !template) return {};
    
    const status: Record<string, { isValid: boolean; isRequired: boolean; error?: string }> = {};
    
    template.requiredFields.forEach(fieldName => {
      const value = irfData.populatedFields[fieldName] || editedFields[fieldName];
      const hasValue = value !== null && value !== undefined && value !== '';
      
      status[fieldName] = {
        isValid: hasValue,
        isRequired: true,
        error: hasValue ? undefined : 'This field is required'
      };
    });

    // Add optional fields
    Object.values(template.sections).forEach(section => {
      section.fields.forEach(field => {
        if (!status[field.name]) {
          const value = irfData.populatedFields[field.name] || editedFields[field.name];
          status[field.name] = {
            isValid: true,
            isRequired: false
          };
        }
      });
    });

    return status;
  }, [irfData, template, editedFields]);

  // Handle field updates
  const handleFieldChange = (fieldName: string, value: any) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Clear field-specific validation errors
    setValidationErrors(prev => 
      prev.filter(error => error.field !== fieldName)
    );
  };

  // Apply edited changes to IRF data
  const applyChanges = () => {
    if (!irfData || !template) return;

    try {
      console.log('=== APPLYING FORM CHANGES ===');
      console.log('Current IRF populated fields:', Object.keys(irfData.populatedFields));
      console.log('Edited fields to apply:', editedFields);
      
      const updatedIRF = updateIRFData(irfData, editedFields, template);
      
      console.log('Updated IRF populated fields:', Object.keys(updatedIRF.populatedFields));
      console.log('Sample updated values:');
      Object.entries(updatedIRF.populatedFields).slice(0, 10).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
      });
      
      setIrfData(updatedIRF);
      setValidationErrors(updatedIRF.validationErrors || []);
      
      // Clear local edited fields after successful application
      const newEditedFields = {};
      setEditedFields(newEditedFields);
      setIsEditing(false);
      setError(null);
      
      // Sync cleared state to parent for persistence
      if (onFormStateChange) {
        onFormStateChange({
          editedFields: newEditedFields,
          isEditing: false,
          activeTab
        });
      }
    } catch (err) {
      console.error('Error applying changes:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditedFields({});
    setIsEditing(false);
    setError(null);
  };

  // Generate and download PDF using official PNP template
  const handleDownloadPDF = async () => {
    if (!irfData || !template) {
      setError('IRF data or template not available for download');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      console.log('Starting PDF download with official PNP template...');
      
      // Use template-based PDF generation with official PNP forms
      downloadTemplatePDF(template, irfData);
      
      console.log('PDF download completed successfully');
      
    } catch (err) {
      console.error('Error downloading PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to download PDF';
      setError(`Download failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Preview PDF in new window using official PNP template
  const handlePreviewPDF = async () => {
    console.log('=== HANDLE PREVIEW PDF CALLED ===');
    console.log('IRF Data available:', !!irfData);
    console.log('Template available:', !!template);
    
    if (irfData) {
      console.log('IRF Data details:', {
        reportId: irfData.reportId,
        templateId: irfData.templateId,
        populatedFieldsCount: Object.keys(irfData.populatedFields || {}).length,
        customFieldsCount: Object.keys(irfData.customFields || {}).length
      });
      console.log('Sample populated fields:');
      Object.entries(irfData.populatedFields || {}).slice(0, 5).forEach(([key, value]) => {
        console.log(`  ${key}: "${value}"`);
      });
    }
    
    if (template) {
      console.log('Template details:', {
        id: template.id,
        name: template.name,
        version: template.version
      });
    }
    
    if (!irfData || !template) {
      console.log('❌ Missing required data - irfData:', !!irfData, 'template:', !!template);
      setError('IRF data or template not available for preview');
      return;
    }

    try {
      setError(null);
      console.log('✅ Starting PDF preview with official PNP template...');
      console.log('About to call previewTemplatePDF with:', {
        templateId: template.id,
        templateName: template.name,
        irfDataReportId: irfData.reportId
      });
      
      // Use template-based PDF generation with official PNP forms
      previewTemplatePDF(template, irfData);
      
      console.log('✅ PDF preview call completed successfully');
      
    } catch (err) {
      console.error('❌ Error previewing PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to preview PDF';
      setError(`Preview failed: ${errorMessage}`);
    }
  };

  // Finalize and generate IRF using official PNP template
  const handleFinalizeIRF = async () => {
    if (!irfData || !template) {
      setError('IRF data or template not available');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      console.log('Starting IRF finalization with official PNP template...');

      console.log('Generating PDF blob with official PNP template...');
      
      // Generate PDF blob with timeout and error handling
      const pdfBlob = await Promise.race([
        generateTemplatePDF(template, irfData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out after 45 seconds')), 45000)
        )
      ]) as Blob;
      
      console.log('PDF blob generated successfully, size:', pdfBlob.size);
      
      // Mark as finalized
      const finalizedIRF = {
        ...irfData,
        isFinalized: true,
        pdfFilename: createPDFFilename(irfData)
      };

      setIrfData(finalizedIRF);

      console.log('IRF finalization completed successfully');
      
      // Notify parent component
      if (onIRFGenerated) {
        onIRFGenerated(finalizedIRF, pdfBlob);
      }

    } catch (err) {
      console.error('Error finalizing IRF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to finalize IRF';
      setError(`Finalization failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Render field editor based on field type
  const renderFieldEditor = (field: IRFTemplateField, sectionKey: string) => {
    const currentValue = editedFields[field.name] ?? 
      (irfData?.populatedFields[field.name] || '');
    const validation = fieldValidationStatus[field.name];
    const hasError = !validation?.isValid && validation?.isRequired;

    const fieldId = `${sectionKey}-${field.name}`;

    switch (field.type) {
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={4}
            id={fieldId}
            value={currentValue}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={!isEditing}
            isInvalid={hasError}
            placeholder={field.note}
          />
        );

      case 'select':
        return (
          <Form.Select
            id={fieldId}
            value={currentValue}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={!isEditing}
            isInvalid={hasError}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </Form.Select>
        );

      case 'checkbox':
        return (
          <Form.Check
            id={fieldId}
            type="checkbox"
            checked={Boolean(currentValue)}
            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
            disabled={!isEditing}
            label={currentValue ? 'Yes' : 'No'}
          />
        );

      case 'signature':
        return (
          <div className="signature-field border rounded p-3 text-center text-muted">
            <em>Signature field - PDF will show signature line</em>
            {currentValue && <div><small>Value: {currentValue}</small></div>}
          </div>
        );

      default:
        // Format datetime value for datetime-local input
        let inputValue = currentValue;
        
        if (field.type === 'datetime' && currentValue) {
          try {
            let targetDate: Date | undefined;
            
            if (currentValue instanceof Date) {
              targetDate = currentValue;
            } else if (typeof currentValue === 'string') {
              // Handle various string formats
              if (currentValue.includes('T')) {
                // ISO string format
                targetDate = new Date(currentValue);
              } else if (currentValue.includes('/') || currentValue.includes(',')) {
                // Localized date format (e.g., "10/05/25, 11:32 PM")
                targetDate = new Date(currentValue);
              } else {
                // Already in the correct format
                inputValue = currentValue;
                targetDate = null as any;
              }
            }
            
            if (targetDate && !isNaN(targetDate.getTime())) {
              // Convert to datetime-local format (yyyy-MM-ddThh:mm)
              const year = targetDate.getFullYear();
              const month = String(targetDate.getMonth() + 1).padStart(2, '0');
              const day = String(targetDate.getDate()).padStart(2, '0');
              const hours = String(targetDate.getHours()).padStart(2, '0');
              const minutes = String(targetDate.getMinutes()).padStart(2, '0');
              
              inputValue = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
          } catch (error) {
            console.warn('Error formatting datetime value:', error);
            // If formatting fails, try to use the original value
            inputValue = currentValue;
          }
        }

        return (
          <Form.Control
            type={field.type === 'number' ? 'number' : 
                  field.type === 'email' ? 'email' :
                  field.type === 'date' ? 'date' :
                  field.type === 'datetime' ? 'datetime-local' : 'text'}
            id={fieldId}
            value={inputValue}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={!isEditing}
            isInvalid={hasError}
            placeholder={field.defaultValue}
          />
        );
    }
  };

  // Render section content
  const renderSection = (sectionKey: string, section: IRFTemplateSection) => (
    <Card key={sectionKey} className="mb-4">
      <Card.Header>
        <h5 className="mb-0">{section.title}</h5>
        {section.content && (
          <small className="text-muted">{section.content}</small>
        )}
      </Card.Header>
      <Card.Body>
        <Row>
          {section.fields.map((field) => {
            const validation = fieldValidationStatus[field.name];
            const hasError = !validation?.isValid && validation?.isRequired;
            
            return (
              <Col 
                key={field.name} 
                md={field.type === 'textarea' || field.name.includes('narrative') ? 12 : 6}
                className="mb-3"
              >
                <Form.Group>
                  <Form.Label className="d-flex align-items-center">
                    {field.label}
                    {validation?.isRequired && (
                      <Badge bg="danger" className="ms-2">Required</Badge>
                    )}
                    {field.autoGenerate && (
                      <Badge bg="info" className="ms-2">Auto-Generated</Badge>
                    )}
                    {hasError && (
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>{validation.error}</Tooltip>}
                      >
                        <Warning size={16} className="text-danger ms-2" />
                      </OverlayTrigger>
                    )}
                  </Form.Label>
                  {renderFieldEditor(field, sectionKey)}
                  {field.note && (
                    <Form.Text className="text-muted">
                      <Info size={12} className="me-1" />
                      {field.note}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            );
          })}
        </Row>
      </Card.Body>
    </Card>
  );

  if (!irfData || !template) {
    return (
      <Container className={className}>
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading IRF data...</p>
        </div>
      </Container>
    );
  }

  const isReadyForPDF = isIRFReadyForPDF(irfData);
  const hasUnsavedChanges = Object.keys(editedFields).length > 0;

  return (
    <Container fluid className={className}>
      <Row>
        <Col>
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="mb-1">
                <FileText size={24} className="me-2" />
                IRF Preview & Editor
                {hasUnsavedChanges && (
                  <Badge bg="warning" className="ms-2">
                    Unsaved Changes
                  </Badge>
                )}
              </h3>
              <p className="text-muted mb-0">
                IRF Entry: <code>{irfData.irfEntryNumber}</code> | 
                Template: {template.name} v{template.version}
                {hasUnsavedChanges && (
                  <small className="text-warning ms-2">
                    • Changes will be preserved if you close and reopen this form
                  </small>
                )}
              </p>
            </div>
            <div className="d-flex gap-2">
              <Badge bg={isReadyForPDF ? 'success' : 'warning'}>
                {isReadyForPDF ? 'Ready for PDF' : `${validationErrors.length} Issues`}
              </Badge>
              {irfData.isFinalized && (
                <Badge bg="info">
                  <CheckCircle size={14} className="me-1" />
                  Finalized
                </Badge>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="danger" onClose={() => setError(null)} dismissible>
              <Warning size={20} className="me-2" />
              {error}
            </Alert>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="warning" className="mb-4">
              <h6>Validation Issues:</h6>
              <ul className="mb-0">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </Alert>
          )}


          {/* Action Buttons */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex gap-2">
              {!isEditing && (
                <>
                  <Button 
                    variant="outline-primary"
                    onClick={() => setIsEditing(true)}
                    disabled={irfData.isFinalized}
                  >
                    <PencilSimple size={16} className="me-1" />
                    Edit Fields
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    onClick={handlePreviewPDF}
                    disabled={!isReadyForPDF}
                  >
                    <Eye size={16} className="me-1" />
                    Preview PDF
                  </Button>
                  <Button 
                    variant="outline-success"
                    onClick={handleDownloadPDF}
                    disabled={!isReadyForPDF || isGenerating}
                  >
                    <Download size={16} className="me-1" />
                    Download PDF
                  </Button>
                </>
              )}

              {isEditing && (
                <>
                  <Button 
                    variant="success"
                    onClick={applyChanges}
                    disabled={!hasUnsavedChanges}
                  >
                    <FloppyDisk size={16} className="me-1" />
                    Apply Changes
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    onClick={cancelEditing}
                  >
                    <X size={16} className="me-1" />
                    Cancel
                  </Button>
                </>
              )}
            </div>

            <div className="d-flex gap-2">
              {onCancel && (
                <Button variant="outline-secondary" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                variant="primary"
                onClick={handleFinalizeIRF}
                disabled={!isReadyForPDF || isGenerating || irfData.isFinalized}
              >
                {isGenerating ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} className="me-1" />
                    Finalize IRF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k || 'preview')}
            className="mb-4"
          >
            <Tab eventKey="preview" title="IRF Preview">
              {/* IRF Sections - Consistent Ordering */}
              {(() => {
                // Define consistent section order for IRF forms
                const sectionOrder = ['header', 'itemA', 'itemB', 'itemC', 'itemD', 'signatures', 'reminder'];
                
                // Render sections in defined order, then any remaining sections
                const renderedSections = [];
                const processedSections = new Set();
                
                // First, render sections in the defined order
                for (const sectionKey of sectionOrder) {
                  if (template.sections[sectionKey]) {
                    renderedSections.push(renderSection(sectionKey, template.sections[sectionKey]));
                    processedSections.add(sectionKey);
                  }
                }
                
                // Then render any remaining sections not in the defined order
                Object.entries(template.sections).forEach(([sectionKey, section]) => {
                  if (!processedSections.has(sectionKey)) {
                    renderedSections.push(renderSection(sectionKey, section));
                  }
                });
                
                return renderedSections;
              })()}
            </Tab>
            
            <Tab eventKey="metadata" title="Metadata">
              <Card>
                <Card.Header>
                  <h5>IRF Generation Metadata</h5>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Report ID:</strong> {irfData.reportId}</p>
                      <p><strong>Template ID:</strong> {irfData.templateId}</p>
                      <p><strong>Template Version:</strong> {irfData.templateVersion}</p>
                      <p><strong>Generated By:</strong> {irfData.generatedBy}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Generated At:</strong> {irfData.generatedAt.toDate().toLocaleString()}</p>
                      <p><strong>Is Finalized:</strong> {irfData.isFinalized ? 'Yes' : 'No'}</p>
                      <p><strong>PDF Filename:</strong> {irfData.pdfFilename || 'Not generated'}</p>
                      <p><strong>Fields Populated:</strong> {Object.keys(irfData.populatedFields).length}</p>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default IRFPreviewEditor;