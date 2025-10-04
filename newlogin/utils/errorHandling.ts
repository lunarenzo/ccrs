import { ZodError } from 'zod';

/**
 * Formats Zod validation errors into user-friendly messages
 */
export function formatZodError(error: ZodError): string {
  const firstError = error.issues[0];
  
  if (!firstError) {
    return 'Please check your input and try again.';
  }

  // Get the field name from the path
  const fieldName = firstError.path[0] as string;
  
  // Handle common validation patterns with user-friendly messages
  if (firstError.message.includes('email')) {
    return 'Please enter a valid email address';
  }
  
  if (firstError.message.includes('Password') || fieldName === 'password') {
    if (firstError.message.includes('at least')) {
      return 'Password must be at least 6 characters';
    }
    return 'Please enter your password';
  }
  
  if (fieldName === 'email') {
    return 'Please enter your email address';
  }
  
  if (fieldName === 'name') {
    return 'Please enter your name';
  }
  
  // Return the original message or a generic fallback
  return firstError.message || 'Please check your input and try again.';
}

/**
 * Formats any error into a user-friendly message
 */
export function formatError(error: unknown): string {
  if (error instanceof ZodError) {
    return formatZodError(error);
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error is a validation error (Zod error)
 */
export function isValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
