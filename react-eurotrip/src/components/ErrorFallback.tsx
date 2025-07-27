import React from 'react';
import { AppError } from '../types';

interface ErrorFallbackProps {
  error: AppError;
  onRetry?: () => void;
  onReset?: () => void;
  title?: string;
  description?: string;
  showDetails?: boolean;
}

/**
 * ErrorFallback component for displaying comprehensive error fallback UI
 * Used when components fail to render or critical errors occur
 */
const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  onReset,
  title,
  description,
  showDetails = false,
}) => {
  const getErrorIllustration = (type: AppError['type']) => {
    switch (type) {
      case 'network':
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'api':
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        );
      case 'data':
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'map':
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getDefaultTitle = (type: AppError['type']) => {
    switch (type) {
      case 'network':
        return 'Connection Problem';
      case 'api':
        return 'Service Unavailable';
      case 'data':
        return 'Data Loading Failed';
      case 'map':
        return 'Map Loading Failed';
      default:
        return 'Something Went Wrong';
    }
  };

  const getDefaultDescription = (type: AppError['type']) => {
    switch (type) {
      case 'network':
        return 'Please check your internet connection and try again.';
      case 'api':
        return 'The service is temporarily unavailable. Please try again in a few moments.';
      case 'data':
        return 'Unable to load the required data. This might be a temporary issue.';
      case 'map':
        return 'The map failed to load properly. Please refresh the page or try again.';
      default:
        return 'An unexpected error occurred. Please try refreshing the page.';
    }
  };

  const errorTitle = title || getDefaultTitle(error.type);
  const errorDescription = description || getDefaultDescription(error.type);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Error illustration */}
        <div className="flex justify-center mb-6">
          {getErrorIllustration(error.type)}
        </div>

        {/* Error title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {errorTitle}
        </h2>

        {/* Error description */}
        <p className="text-gray-600 mb-6">
          {errorDescription}
        </p>

        {/* Error message */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 font-medium">
            {error.message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Error ID: {error.id}
          </p>
        </div>

        {/* Error details (development only) */}
        {showDetails && process.env.NODE_ENV === 'development' && (
          <details className="text-left mb-6">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 mb-2">
              Technical Details
            </summary>
            <div className="bg-gray-100 rounded p-3 text-xs font-mono text-gray-800">
              <div className="mb-2">
                <strong>Type:</strong> {error.type}
              </div>
              <div className="mb-2">
                <strong>Timestamp:</strong> {new Date(error.timestamp).toISOString()}
              </div>
              <div>
                <strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}
              </div>
            </div>
          </details>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-2 bg-ryanair-blue text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Try Again
            </button>
          )}
          
          {onReset && (
            <button
              onClick={onReset}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Reset Application
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;