import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../Header';

describe('Header', () => {
  it('renders the title with airplane emoji', () => {
    render(<Header />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('🛫Ryanair European Airports');
  });

  it('renders the description text', () => {
    render(<Header />);
    
    expect(screen.getByText('Interactive map of airports served by Ryanair across Europe')).toBeInTheDocument();
  });

  it('includes the SearchBar component', () => {
    render(<Header />);
    
    expect(screen.getByPlaceholderText('Search airports...')).toBeInTheDocument();
  });

  it('has proper styling classes for positioning and appearance', () => {
    const { container } = render(<Header />);
    const headerDiv = container.firstChild as HTMLElement;
    
    expect(headerDiv).toHaveClass('absolute', 'top-2.5', 'left-2.5', 'z-controls');
    expect(headerDiv).toHaveClass('bg-white/90', 'backdrop-blur-sm', 'p-4', 'rounded-lg', 'shadow-lg');
  });

  it('has responsive max-width styling', () => {
    const { container } = render(<Header />);
    const headerDiv = container.firstChild as HTMLElement;
    
    expect(headerDiv).toHaveClass('max-w-sm');
  });
});