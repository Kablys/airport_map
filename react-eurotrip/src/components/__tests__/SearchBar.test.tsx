import React from 'react';
import { render, screen } from '@testing-library/react';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  it('renders search input with placeholder', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Search airports...');
    expect(input).toBeInTheDocument();
    expect(input).toBeDisabled();
  });

  it('displays search icon', () => {
    render(<SearchBar />);
    
    const searchIcon = document.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('shows coming soon message', () => {
    render(<SearchBar />);
    
    expect(screen.getByText('Search functionality coming soon')).toBeInTheDocument();
  });

  it('has proper styling for focus states', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Search airports...');
    expect(input).toHaveClass('focus:ring-2', 'focus:ring-ryanair-blue', 'focus:border-transparent');
  });

  it('has proper input styling', () => {
    render(<SearchBar />);
    
    const input = screen.getByPlaceholderText('Search airports...');
    expect(input).toHaveClass('w-full', 'px-3', 'py-2', 'pl-9', 'text-sm', 'border', 'border-gray-300', 'rounded-md');
  });
});