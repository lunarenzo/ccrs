import type { ReactNode } from 'react';
import { Badge as BootstrapBadge } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'light' | 'dark';
  pill?: boolean;
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'secondary', 
  pill = true,
  className = '' 
}: BadgeProps) {
  return (
    <BootstrapBadge 
      bg={variant} 
      pill={pill}
      className={classNames('fw-medium', className)}
    >
      {children}
    </BootstrapBadge>
  );
}
