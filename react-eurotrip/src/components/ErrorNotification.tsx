import React, { useEffect, useState } from 'react';
import { AppError } from '../types';

interface ErrorNotificationProps {
  errors: AppError[];
  onRetry?: (error: AppError) => void;
  onDismiss?: (errorId: string) => void;
  maxVisible?: number;
  autoHideDuration?: number;
}

/**
 * ErrorNotification component for displaying error notifications as toast messages
 * Supports auto-hide, retry functionality, and stacking multiple errors
 */
const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  errors,
  onRetry,
  onDismiss,
  maxVisible = 3,
  autoHideDuration = 5000,
}) => {
  const [visibleErrors, setVisibleErrors] = useState<AppError[]>([]);

  useEffect(() => {
    // Show only the most recent errors up to maxVisible
    const recentErrors = errors.slice(-maxVisible);
    setVisibleErrors(recentErrors);
  }, [errors, maxVisible]);

  useEffect(() => {
    // Auto-hide errors after specified duration
    if (autoHideDuration > 0) {
      visibleErrors.forEach((error) => {
        const timer = setTimeout(() => {
          if (onDismiss) {
            onDismiss(error.id);
          }
        }, autoHideDuration);

        return () => clearTimeout(timer);
      });
    }
  }, [visibleErrors, autoHideDuration, onDismiss]);

  if (visibleErrors.length === 0) {
    return null;
  }

  const getErrorIcon = (type: AppError['type']) => {
    const iconClass = "w-5 h-5";
    
    switch (type) {
      case 'network':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'api':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'data':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'map':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[1500] space-y-2 max-w-sm">
      {visibleErrors.map((error, index) => (
        <div
          key={error.id}
          className={`bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out ${
            index === 0 ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-90'
          }`}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="text-red-500">
                {getErrorIcon(error.type)}
              </div>
            </div>
            
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-red-800">
                {error.message}
              </p>
              
              <div className="mt-2 flex space-x-2">
                {error.retryable && onRetry && (
                  <button
                    onClick={() => onRetry(error)}
                    className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
            
            {onDismiss && (
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => onDismiss(error.id)}
                  className="text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                  aria-label="Dismiss notification"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Progress bar for auto-hide */}
          {autoHideDuration > 0 && (
            <div className="mt-2 w-full bg-red-200 rounded-full h-1">
              <div
                className="bg-red-500 h-1 rounded-full transition-all ease-linear"
                style={{
                  animation: `shrink ${autoHideDuration}ms linear`,
                  width: '100%',
                }}
              />
            </div>
          )}
        </div>
      ))}
      
      {errors.length > maxVisible && (
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-2 text-center">
          <p className="text-xs text-gray-600">
            +{errors.length - maxVisible} more error{errors.length - maxVisible !== 1 ? 's' : ''}
          </p>
        </div>
      )}
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ErrorNotification;