// Centralized error handling utilities
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintain proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleSupabaseError = (error: any, context: string = '') => {
  console.error(`Supabase error in ${context}:`, error);
  
  // Common Supabase error mappings
  const errorMappings: Record<string, string> = {
    'PGRST116': 'No data found for this request',
    'PGRST301': 'Access denied - insufficient permissions',
    '23505': 'This record already exists',
    '23503': 'Referenced record does not exist',
    '42501': 'Permission denied - admin access required'
  };

  const errorCode = error?.code || error?.error_code;
  const userFriendlyMessage = errorMappings[errorCode] || error?.message || 'An unexpected error occurred';
  
  return new AppError(userFriendlyMessage, error?.status || 500);
};

export const logError = (error: any, context: string, userId?: string) => {
  const errorInfo = {
    context,
    message: error.message,
    stack: error.stack,
    userId,
    timestamp: new Date().toISOString()
  };
  
  // In production, this would be sent to a logging service
  console.error('Application Error:', errorInfo);
  
  // Could integrate with Supabase audit logs here
  return errorInfo;
};