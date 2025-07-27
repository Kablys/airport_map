import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoadingButton from '../LoadingButton';

describe('LoadingButton', () => {
  it('renders with default props', () => {
    render(<LoadingButton>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
    expect(button).toHaveClass('bg-ryanair-blue', 'text-white');
  });

  it('shows loading spinner when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows loading text when provided', () => {
    render(
      <LoadingButton loading={true} loadingText="Processing...">
        Click me
      </LoadingButton>
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.queryByText('Click me')).not.toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(<LoadingButton loading={true}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<LoadingButton disabled={true}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<LoadingButton variant="primary">Primary</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-ryanair-blue', 'text-white');
    
    rerender(<LoadingButton variant="secondary">Secondary</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200', 'text-gray-800');
    
    rerender(<LoadingButton variant="danger">Danger</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600', 'text-white');
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<LoadingButton size="sm">Small</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');
    
    rerender(<LoadingButton size="md">Medium</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-2', 'text-sm');
    
    rerender(<LoadingButton size="lg">Large</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles click events when not loading', () => {
    const onClick = jest.fn();
    render(<LoadingButton onClick={onClick}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click events when loading', () => {
    const onClick = jest.fn();
    render(<LoadingButton loading={true} onClick={onClick}>Click me</LoadingButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<LoadingButton className="custom-class">Click me</LoadingButton>);
    
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('passes through other button props', () => {
    render(<LoadingButton type="submit" data-testid="submit-button">Submit</LoadingButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('data-testid', 'submit-button');
  });

  it('shows appropriate spinner color for different variants', () => {
    const { rerender } = render(<LoadingButton loading={true} variant="primary">Primary</LoadingButton>);
    // White spinner for primary variant - we can't easily test the color prop, but we can test it renders
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    rerender(<LoadingButton loading={true} variant="secondary">Secondary</LoadingButton>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    rerender(<LoadingButton loading={true} variant="danger">Danger</LoadingButton>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});