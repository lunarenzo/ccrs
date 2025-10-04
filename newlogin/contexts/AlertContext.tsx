import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GlobalAlert, AlertConfig, AlertType, AlertButton } from '../components/ui/GlobalAlert';

interface AlertContextType {
  showAlert: (config: AlertConfig) => void;
  showSuccess: (title: string, message?: string, buttons?: AlertButton[]) => void;
  showError: (title: string, message?: string, buttons?: AlertButton[]) => void;
  showWarning: (title: string, message?: string, buttons?: AlertButton[]) => void;
  showInfo: (title: string, message?: string, buttons?: AlertButton[]) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const showAlert = (config: AlertConfig) => {
    setAlertConfig(config);
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
    // Clear config after animation completes
    setTimeout(() => {
      setAlertConfig(null);
    }, 300);
  };

  const showSuccess = (title: string, message?: string, buttons?: AlertButton[]) => {
    showAlert({
      type: 'success',
      title,
      message,
      buttons,
      autoClose: !buttons, // Auto close if no custom buttons
      duration: 3000,
    });
  };

  const showError = (title: string, message?: string, buttons?: AlertButton[]) => {
    showAlert({
      type: 'error',
      title,
      message,
      buttons,
    });
  };

  const showWarning = (title: string, message?: string, buttons?: AlertButton[]) => {
    showAlert({
      type: 'warning',
      title,
      message,
      buttons,
    });
  };

  const showInfo = (title: string, message?: string, buttons?: AlertButton[]) => {
    showAlert({
      type: 'info',
      title,
      message,
      buttons,
    });
  };

  const contextValue: AlertContextType = {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      <GlobalAlert
        visible={visible}
        config={alertConfig}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

// Convenience hook for common alert patterns
export function useAlertActions() {
  const { showSuccess, showError, showWarning, showInfo } = useAlert();

  return {
    // Success alerts
    showUploadSuccess: (mediaType: string) => 
      showSuccess('Upload Successful', `${mediaType} uploaded successfully`),
    
    showSubmissionSuccess: (reportId: string) => 
      showSuccess(
        'Report Submitted Successfully',
        `Your report has been submitted and will be reviewed by local authorities.\n\nReport ID: ${reportId.slice(-8)}`
      ),
    
    showLocationSuccess: () => 
      showSuccess('Location Captured', 'Location captured successfully!'),
    
    showVerificationSuccess: () => 
      showSuccess(
        'Success!',
        'Your phone number has been verified successfully.'
      ),

    // Error alerts
    showUploadError: (message?: string) => 
      showError('Upload Failed', message || 'Failed to upload media'),
    
    showLocationError: () => 
      showError('Location Error', 'Failed to get location'),
    
    showValidationError: (message: string) => 
      showError('Validation Error', message),
    
    showSubmissionError: (message: string) => 
      showError('Submission Failed', message),
    
    showAuthError: (message: string) => 
      showError('Authentication Failed', message),

    // Warning alerts
    showUploadLimitWarning: () => 
      showWarning(
        'Upload Limit Reached',
        'You can only upload a maximum of 5 files per report.'
      ),

    // Info alerts
    showCodeSentInfo: () => 
      showInfo('Code Sent', 'A new verification code has been sent to your phone.'),

    // Confirmation dialogs
    showRemoveMediaConfirm: (onConfirm: () => void) => 
      showWarning(
        'Remove Media',
        'Are you sure you want to remove this media?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: onConfirm },
        ]
      ),
  };
}
