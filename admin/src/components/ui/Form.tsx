import type { FormHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { Input } from './Input';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  className?: string;
}

interface FormFieldProps {
  children: ReactNode;
  className?: string;
}

interface FormGroupProps {
  children: ReactNode;
  className?: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Form({ children, className = '', ...props }: FormProps) {
  return (
    <form className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  );
}

export function FormField({ children, className = '' }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {children}
    </div>
  );
}

export function FormGroup({ children, className = '' }: FormGroupProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  );
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 border border-border dark:border-dark-border rounded-md
          bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-error' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}

export function Textarea({ label, error, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text">
          {label}
        </label>
      )}
      <textarea
        className={`
          w-full px-3 py-2 border border-border dark:border-dark-border rounded-md
          bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed resize-vertical
          ${error ? 'border-error' : ''}
          ${className}
        `}
        rows={4}
        {...props}
      />
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}

export function Checkbox({ label, error, className = '', ...props }: CheckboxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          className={`
            h-4 w-4 text-primary border-border dark:border-dark-border rounded
            focus:ring-2 focus:ring-primary focus:ring-offset-0
            ${error ? 'border-error' : ''}
            ${className}
          `}
          {...props}
        />
        <label className="text-sm font-medium text-gray-700 dark:text-dark-text">
          {label}
        </label>
      </div>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  );
}

// Export Input component for convenience
export { Input };
