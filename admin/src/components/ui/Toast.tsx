import React from 'react';
import { Toast as BootstrapToast, ToastContainer } from 'react-bootstrap';
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  Info, 
  X 
} from 'phosphor-react';
import { useToast, type ToastMessage } from '../../contexts/ToastContext';

const getToastIcon = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={20} weight="fill" className="text-success" />;
    case 'error':
      return <XCircle size={20} weight="fill" className="text-danger" />;
    case 'warning':
      return <Warning size={20} weight="fill" className="text-warning" />;
    case 'info':
      return <Info size={20} weight="fill" className="text-info" />;
    default:
      return <Info size={20} weight="fill" className="text-primary" />;
  }
};

const getToastVariant = (type: ToastMessage['type']) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'primary';
  }
};

interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onHide }) => {
  return (
    <BootstrapToast
      onClose={() => onHide(toast.id)}
      show={true}
      className="mb-2 position-relative"
      style={{
        minWidth: '300px',
        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
        border: `1px solid var(--bs-${getToastVariant(toast.type)})`,
      }}
    >
      {/* Custom close button in top-right */}
      <button
        type="button"
        className="btn-close position-absolute"
        style={{
          top: '8px',
          right: '8px',
          zIndex: 10,
          fontSize: '0.75rem'
        }}
        onClick={() => onHide(toast.id)}
        aria-label="Close"
      ></button>
      
      <BootstrapToast.Header 
        className={`bg-${getToastVariant(toast.type)} bg-opacity-10`}
        closeButton={false}
      >
        <div className="d-flex align-items-center">
          <div className="me-2">
            {getToastIcon(toast.type)}
          </div>
          <strong className="me-auto">{toast.title}</strong>
        </div>
      </BootstrapToast.Header>
      {toast.message && (
        <BootstrapToast.Body className="py-3">
          {toast.message}
        </BootstrapToast.Body>
      )}
    </BootstrapToast>
  );
};

export const ToastNotifications: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <ToastContainer 
      position="top-end" 
      className="p-3"
      style={{ 
        position: 'fixed', 
        zIndex: 1060,
        top: '20px',
        right: '20px'
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onHide={hideToast}
        />
      ))}
    </ToastContainer>
  );
};

export default ToastNotifications;
