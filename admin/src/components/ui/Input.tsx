import React from 'react';
import { Form } from 'react-bootstrap';
import { classNames } from '../../lib/utils';

interface InputProps {
  label?: string;
  error?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
}

export function Input({ 
  label, 
  error, 
  className = '', 
  ...props 
}: InputProps) {
  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label className="text-ccrs-primary fw-medium">
          {label}
        </Form.Label>
      )}
      <Form.Control
        className={classNames(
          error ? 'is-invalid' : '',
          className
        )}
        {...props}
      />
      {error && (
        <Form.Control.Feedback type="invalid">
          {error}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
}
