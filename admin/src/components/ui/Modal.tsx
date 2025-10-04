import { Modal as BootstrapModal } from 'react-bootstrap';
import type { ReactNode } from 'react';
import { classNames } from '../../lib/utils';

interface ModalProps {
  show: boolean;
  onHide: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
  centered?: boolean;
  className?: string;
}

interface ModalHeaderProps {
  children: ReactNode;
  className?: string;
  closeButton?: boolean;
}

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface ModalFooterProps {
  children: ReactNode;
  className?: string;
}

export function Modal({
  show,
  onHide,
  title,
  children,
  size,
  centered = true,
  className = ''
}: ModalProps) {
  return (
    <BootstrapModal
      show={show}
      onHide={onHide}
      size={size}
      centered={centered}
      className={className}
    >
      {title && (
        <BootstrapModal.Header closeButton className="bg-ccrs-light border-ccrs">
          <BootstrapModal.Title className="text-ccrs-primary fw-semibold">
            {title}
          </BootstrapModal.Title>
        </BootstrapModal.Header>
      )}
      {children}
    </BootstrapModal>
  );
}

export function ModalHeader({ children, className = '', closeButton = true }: ModalHeaderProps) {
  return (
    <BootstrapModal.Header 
      closeButton={closeButton} 
      className={classNames('bg-ccrs-light border-ccrs', className)}
    >
      {children}
    </BootstrapModal.Header>
  );
}

export function ModalBody({ children, className = '' }: ModalBodyProps) {
  return (
    <BootstrapModal.Body className={className}>
      {children}
    </BootstrapModal.Body>
  );
}

export function ModalFooter({ children, className = '' }: ModalFooterProps) {
  return (
    <BootstrapModal.Footer className={classNames('bg-ccrs-gray border-ccrs', className)}>
      {children}
    </BootstrapModal.Footer>
  );
}
