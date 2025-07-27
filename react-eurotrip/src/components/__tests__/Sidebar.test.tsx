import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppProvider } from '../../contexts/AppContext';
import Sidebar from '../Sidebar';

// Mock the hooks
jest.mock('../../hooks/useAppContext');
jest.mock('../../hooks/useMap');

const mockUseAppContext = require('../../hooks/useAppContext').useAppContext as jest.Mock;
const mockUseMap = require('../../hooks/useMap').useMap as jest.Mock;

describe('Sidebar', () => {
  const mockAirports = [
    { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4213, lng: -6.2701 },
    { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'United Kingdom', lat: 51.4700, lng: -0.4543 },
    { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
  ];

  const mockRoutes = {
    'DUB': ['LHR', 'CDG'],
    'LHR': ['DUB'],
    'CDG': ['DUB'],
  };

  beforeEach(() => {
    mockUseAppContext.mockReturnValue({
      state: {
        airports: mockAirports,
        routes: mockRoutes,
        selectedAirport: null,
        isLoading: false,
        errors: [],
      },
    });

    mockUseMap.mockReturnValue({
      priceRange: null,
      routeLines: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders flight statistics header', () => {
    render(<Sidebar />);
    expect(screen.getByText('📊 Flight Statistics')).toBeInTheDocument();
  });

  it('displays network overview statistics', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('Network Overview')).toBeInTheDocument();
    expect(screen.getByText('Airports')).toBeInTheDocument();
    expect(screen.getByText('Countries')).toBeInTheDocument();
    expect(screen.getByText('Total Routes')).toBeInTheDocument();
    
    // Check for specific numbers
    const airportNumbers = screen.getAllByText('3');
    expect(airportNumbers).toHaveLength(2); // Airports and Countries both show 3
    expect(screen.getByText('4')).toBeInTheDocument(); // Total routes
  });

  it('shows tip when no airport is selected', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Click on any airport marker to view direct routes/)).toBeInTheDocument();
  });

  it('displays selected airport routes when airport is selected', () => {
    mockUseAppContext.mockReturnValue({
      state: {
        airports: mockAirports,
        routes: mockRoutes,
        selectedAirport: mockAirports[0], // DUB selected
        isLoading: false,
        errors: [],
      },
    });

    render(<Sidebar />);
    
    expect(screen.getByText('Selected Airport')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // DUB has 2 routes
    expect(screen.getByText('Direct Routes')).toBeInTheDocument();
  });

  it('applies responsive design classes', () => {
    const { container } = render(<Sidebar />);
    const sidebar = container.firstChild as HTMLElement;
    
    expect(sidebar).toHaveClass('absolute', 'top-4', 'right-4', 'z-controls');
    expect(sidebar).toHaveClass('bg-white/95', 'backdrop-blur-sm', 'rounded-lg', 'shadow-lg');
    expect(sidebar).toHaveClass('w-80', 'max-h-[calc(100vh-2rem)]', 'overflow-y-auto');
  });
});