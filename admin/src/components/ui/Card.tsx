import React from 'react';
import { Card as BootstrapCard } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <BootstrapCard className={classNames('shadow-ccrs', className)}>
      {children}
    </BootstrapCard>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <BootstrapCard.Header className={classNames('bg-ccrs-light border-ccrs', className)}>
      {children}
    </BootstrapCard.Header>
  );
}

export function CardContent({ children, className = '', style }: CardContentProps) {
  return (
    <BootstrapCard.Body className={className} style={style}>
      {children}
    </BootstrapCard.Body>
  );
}

export function CardTitle({ children, className = '', as = 'h3' }: CardTitleProps) {
  const Component = as;
  return (
    <Component className={classNames('h5 mb-0 text-ccrs-primary fw-semibold', className)}>
      {children}
    </Component>
  );
}
