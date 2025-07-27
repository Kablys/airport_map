import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  overlay?: boolean;
}

/**
 * LoadingOverlay component for displaying loading states during async operations
 * Can be used as a full-screen overlay or inline loading indicator
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  size = 'medium',
  overlay = true,
}) => {
  if (!isVisible) return null;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Spinning loader */}
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-ryanair-blue rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      
      {/* Loading message */}
      <p className={`${textSizeClasses[size]} text-gray-600 font-medium`}>
        {message}
      </p>
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loading-message"
      >
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm mx-4">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinnerContent}
    </div>
  );
};

export default LoadingOverlay;