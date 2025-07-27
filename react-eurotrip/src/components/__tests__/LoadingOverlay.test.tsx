import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from '../LoadingOverlay';

describe('LoadingOverlay', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<LoadingOverlay isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loading overlay when visible', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LoadingOverlay isVisible={true} message="Custom loading message" />);
    
    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingOverlay isVisible={true} size="small" />);
    expect(screen.getByRole('status')).toHaveClass('w-4', 'h-4');
    
    rerender(<LoadingOverlay isVisible={true} size="medium" />);
    expect(screen.getByRole('status')).toHaveClass('w-8', 'h-8');
    
    rerender(<LoadingOverlay isVisible={true} size="large" />);
    expect(screen.getByRole('status')).toHaveClass('w-12', 'h-12');
  });

  it('renders as overlay by default', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByRole('dialog');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black/20');
  });

  it('renders inline when overlay is false', () => {
    render(<LoadingOverlay isVisible={true} overlay={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByRole('dialog');
    expect(overlay).toHaveAttribute('aria-modal', 'true');
    expect(overlay).toHaveAttribute('aria-labelledby', 'loading-message');
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});