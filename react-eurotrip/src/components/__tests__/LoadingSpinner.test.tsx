import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveClass('w-6', 'h-6', 'border-2', 'border-gray-200', 'border-t-ryanair-blue');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingSpinner size="xs" />);
    expect(screen.getByRole('status')).toHaveClass('w-3', 'h-3', 'border-2');
    
    rerender(<LoadingSpinner size="sm" />);
    expect(screen.getByRole('status')).toHaveClass('w-4', 'h-4', 'border-2');
    
    rerender(<LoadingSpinner size="md" />);
    expect(screen.getByRole('status')).toHaveClass('w-6', 'h-6', 'border-2');
    
    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByRole('status')).toHaveClass('w-8', 'h-8', 'border-3');
    
    rerender(<LoadingSpinner size="xl" />);
    expect(screen.getByRole('status')).toHaveClass('w-10', 'h-10', 'border-4');
  });

  it('renders different colors correctly', () => {
    const { rerender } = render(<LoadingSpinner color="blue" />);
    expect(screen.getByRole('status')).toHaveClass('border-gray-200', 'border-t-ryanair-blue');
    
    rerender(<LoadingSpinner color="gray" />);
    expect(screen.getByRole('status')).toHaveClass('border-gray-300', 'border-t-gray-600');
    
    rerender(<LoadingSpinner color="white" />);
    expect(screen.getByRole('status')).toHaveClass('border-white/30', 'border-t-white');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('has spinning animation', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByRole('status')).toHaveClass('animate-spin');
  });
});