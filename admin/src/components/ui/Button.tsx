import React from 'react';
import { Button as BootstrapButton } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
}

export function Button({ 
  variant = 'primary', 
  size, 
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  // Map custom variants to Bootstrap variants
  const getBootstrapVariant = (variant: string) => {
    switch (variant) {
      case 'outline':
        return 'outline-primary';
      case 'ghost':
        return 'link';
      case 'danger':
        return 'danger';
      default:
        return variant;
    }
  };

  const bootstrapVariant = getBootstrapVariant(variant);
  
  return (
    <BootstrapButton
      variant={bootstrapVariant}
      size={size}
      className={classNames(className, variant === 'ghost' ? 'text-decoration-none' : '')}
      {...props}
    >
      {children}
    </BootstrapButton>
  );
}
