import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorFallback from '../ErrorFallback';
import { AppError } from '../../types';

const mockError: AppError = {
  id: 'test-error-1',
  type: 'api',
  message: 'Test error message',
  timestamp: Date.now(),
  retryable: true,
};

describe('ErrorFallback', () => {
  it('renders with default error information', () => {
    render(<ErrorFallback error={mockError} />);
    
    expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
    expect(screen.getByText('The service is temporarily unavailable. Please try again in a few moments.')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText(`Error ID: ${mockError.id}`)).toBeInTheDocument();
  });

  it('renders custom title and description', () => {
    render(
      <ErrorFallback 
        error={mockError} 
        title="Custom Title" 
        description="Custom description" 
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom description')).toBeInTheDocument();
  });

  it('shows retry button when error is retryable and onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorFallback error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when error is not retryable', () => {
    const nonRetryableError = { ...mockError, retryable: false };
    const onRetry = jest.fn();
    render(<ErrorFallback error={nonRetryableError} onRetry={onRetry} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('shows reset button when onReset is provided', () => {
    const onReset = jest.fn();
    render(<ErrorFallback error={mockError} onReset={onReset} />);
    
    const resetButton = screen.getByText('Reset Application');
    expect(resetButton).toBeInTheDocument();
    
    fireEvent.click(resetButton);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('always shows reload page button', () => {
    render(<ErrorFallback error={mockError} />);
    
    expect(screen.getByText('Reload Page')).toBeInTheDocument();
  });

  it('renders different error types with appropriate illustrations and titles', () => {
    const errorTypes: Array<{ type: AppError['type']; title: string }> = [
      { type: 'network', title: 'Connection Problem' },
      { type: 'api', title: 'Service Unavailable' },
      { type: 'data', title: 'Data Loading Failed' },
      { type: 'map', title: 'Map Loading Failed' },
    ];

    errorTypes.forEach(({ type, title }) => {
      const error = { ...mockError, type };
      const { rerender } = render(<ErrorFallback error={error} />);
      
      expect(screen.getByText(title)).toBeInTheDocument();
      rerender(<div />); // Clear for next iteration
    });
  });

  it('shows technical details in development mode when showDetails is true', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    render(<ErrorFallback error={mockError} showDetails={true} />);
    
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    
    // Click to expand details
    fireEvent.click(screen.getByText('Technical Details'));
    
    expect(screen.getByText('Type:')).toBeInTheDocument();
    expect(screen.getByText('Timestamp:')).toBeInTheDocument();
    expect(screen.getByText('Retryable:')).toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('does not show technical details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    render(<ErrorFallback error={mockError} showDetails={true} />);
    
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    
    process.env.NODE_ENV = originalEnv;
  });

  it('has proper minimum height for layout', () => {
    const { container } = render(<ErrorFallback error={mockError} />);
    
    expect(container.firstChild).toHaveClass('min-h-[400px]');
  });
});