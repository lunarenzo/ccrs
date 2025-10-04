import { Spinner } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  className?: string;
  animation?: 'border' | 'grow';
}

export function LoadingSpinner({ 
  size, 
  variant = 'primary',
  className = '',
  animation = 'border'
}: LoadingSpinnerProps) {
  return (
    <Spinner
      animation={animation}
      variant={variant}
      size={size}
      className={classNames('text-ccrs-primary', className)}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </Spinner>
  );
}
