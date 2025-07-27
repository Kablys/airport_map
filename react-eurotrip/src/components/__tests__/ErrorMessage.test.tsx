import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorMessage from '../ErrorMessage';
import { AppError } from '../../types';

const mockError: AppError = {
  id: 'test-error-1',
  type: 'api',
  message: 'Test error message',
  timestamp: Date.now(),
  retryable: true,
};

describe('ErrorMessage', () => {
  it('renders error message with default styling', () => {
    render(<ErrorMessage error={mockError} />);
    
    expect(screen.getByText('Service Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText(/Occurred at/)).toBeInTheDocument();
  });

  it('renders compact version', () => {
    render(<ErrorMessage error={mockError} compact={true} />);
    
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.queryByText('Service Error')).not.toBeInTheDocument();
    expect(screen.queryByText(/Occurred at/)).not.toBeInTheDocument();
  });

  it('shows retry button when error is retryable and onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorMessage error={mockError} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button when error is not retryable', () => {
    const nonRetryableError = { ...mockError, retryable: false };
    const onRetry = jest.fn();
    render(<ErrorMessage error={nonRetryableError} onRetry={onRetry} />);
    
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error={mockError} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows close button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error={mockError} onDismiss={onDismiss} />);
    
    const closeButton = screen.getByLabelText('Dismiss error');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders different error types with appropriate icons and titles', () => {
    const errorTypes: Array<{ type: AppError['type']; title: string }> = [
      { type: 'network', title: 'Connection Error' },
      { type: 'api', title: 'Service Error' },
      { type: 'data', title: 'Data Error' },
      { type: 'map', title: 'Map Error' },
    ];

    errorTypes.forEach(({ type, title }) => {
      const error = { ...mockError, type };
      const { rerender } = render(<ErrorMessage error={error} />);
      
      expect(screen.getByText(title)).toBeInTheDocument();
      rerender(<div />); // Clear for next iteration
    });
  });

  it('formats timestamp correctly', () => {
    const timestamp = new Date('2023-01-01T12:00:00Z').getTime();
    const errorWithTimestamp = { ...mockError, timestamp };
    
    render(<ErrorMessage error={errorWithTimestamp} />);
    
    expect(screen.getByText(/Occurred at/)).toBeInTheDocument();
  });

  it('renders compact version with retry and dismiss in same row', () => {
    const onRetry = jest.fn();
    const onDismiss = jest.fn();
    
    render(
      <ErrorMessage 
        error={mockError} 
        onRetry={onRetry} 
        onDismiss={onDismiss} 
        compact={true} 
      />
    );
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
    expect(screen.getByLabelText('Dismiss error')).toBeInTheDocument();
  });
});