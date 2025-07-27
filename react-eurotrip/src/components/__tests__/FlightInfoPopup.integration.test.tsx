import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlightInfoPopup from '../FlightInfoPopup';
import { RouteLine, FlightPrice } from '../../types';

// Mock window.open and clipboard
const mockOpen = jest.fn();
const mockWriteText = jest.fn();

Object.assign(window, { open: mockOpen });
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('FlightInfoPopup Integration', () => {
  const mockFlightPrice: FlightPrice = {
    price: 129.99,
    currency: 'EUR',
    lastUpdated: Date.now(),
    estimated: false,
    flightNumber: 'FR5678',
    departureTime: '2024-01-20T14:15:00Z',
    arrivalTime: '2024-01-20T16:30:00Z',
    note: 'Live price from Ryanair API',
  };

  const mockRoute: RouteLine = {
    id: 'MAD-FCO',
    source: {
      code: 'MAD',
      name: 'Madrid-Barajas Airport',
      city: 'Madrid',
      country: 'Spain',
      lat: 40.4719,
      lng: -3.5626,
    },
    destination: {
      code: 'FCO',
      name: 'Leonardo da Vinci International Airport',
      city: 'Rome',
      country: 'Italy',
      lat: 41.8003,
      lng: 12.2389,
    },
    price: mockFlightPrice,
    distance: 1365,
    color: '#ff8800',
    };

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('integrates properly with PriceLabels and RouteLines components', () => {
    render(<FlightInfoPopup route={mockRoute} />);

    // Verify comprehensive flight information is displayed
    expect(screen.getByText('Madrid → Rome')).toBeInTheDocument();
    expect(screen.getByText(/Madrid-Barajas Airport \(MAD\) to Leonardo da Vinci International Airport \(FCO\)/)).toBeInTheDocument();
    
    // Verify price information
    expect(screen.getByText('€129.99')).toBeInTheDocument();
    expect(screen.getByText('Flight Price')).toBeInTheDocument();
    
    // Verify flight details
    expect(screen.getByText('1365 km')).toBeInTheDocument();
    expect(screen.getByText('2h 15m')).toBeInTheDocument();
    expect(screen.getByText('Boeing 737 MAX 8')).toBeInTheDocument();
    expect(screen.getByText('FR5678')).toBeInTheDocument();
    
    // Verify schedule information
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('14:15')).toBeInTheDocument();
    expect(screen.getByText('16:30')).toBeInTheDocument();
    
    // Verify action buttons
    expect(screen.getByText('Book on Ryanair')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('handles booking functionality correctly', () => {
    render(<FlightInfoPopup route={mockRoute} />);

    const bookButton = screen.getByText('Book on Ryanair');
    fireEvent.click(bookButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://www.ryanair.com/gb/en/trip/flights/select'),
      '_blank',
      'noopener,noreferrer'
    );
    
    const calledUrl = mockOpen.mock.calls[0][0];
    expect(calledUrl).toContain('originIata=MAD');
    expect(calledUrl).toContain('destinationIata=FCO');
    expect(calledUrl).toContain('adults=1');
  });

  it('handles copy functionality with comprehensive flight details', async () => {
    render(<FlightInfoPopup route={mockRoute} />);

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('🛫 Flight Details')
    );
    
    const copiedText = mockWriteText.mock.calls[0][0];
    expect(copiedText).toContain('Madrid (MAD) → Rome (FCO)');
    expect(copiedText).toContain('€129.99');
    expect(copiedText).toContain('1365 km');
    expect(copiedText).toContain('2h 15m');
    expect(copiedText).toContain('Boeing 737 MAX 8');
    expect(copiedText).toContain('FR5678');
    expect(copiedText).toContain('14:15');
    expect(copiedText).toContain('16:30');
    expect(copiedText).toContain('Live price from Ryanair API');
    expect(copiedText).toContain('https://www.ryanair.com');
  });

  it('displays estimated price information correctly', () => {
    const estimatedRoute = {
      ...mockRoute,
      price: {
        ...mockFlightPrice,
        estimated: true,
        note: 'Estimated price based on route distance',
      },
    };

    render(<FlightInfoPopup route={estimatedRoute} />);

    expect(screen.getByText('estimated')).toBeInTheDocument();
    expect(screen.getByText('Estimated price based on route distance')).toBeInTheDocument();
  });

  it('handles routes without schedule information', () => {
    const routeWithoutSchedule = {
      ...mockRoute,
      price: {
        ...mockFlightPrice,
        departureTime: undefined,
        arrivalTime: undefined,
      },
    };

    render(<FlightInfoPopup route={routeWithoutSchedule} />);

    // Should not show schedule section
    expect(screen.queryByText('Schedule')).not.toBeInTheDocument();
    
    // Should show estimated duration
    expect(screen.getByText(/~\d+\.?\d*h/)).toBeInTheDocument();
  });

  it('shows appropriate aircraft type based on distance', () => {
    // Test short distance
    const shortRoute = { ...mockRoute, distance: 600 };
    const { rerender } = render(<FlightInfoPopup route={shortRoute} />);
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();

    // Test medium distance
    const mediumRoute = { ...mockRoute, distance: 1200 };
    rerender(<FlightInfoPopup route={mediumRoute} />);
    expect(screen.getByText('Boeing 737 MAX 8')).toBeInTheDocument();

    // Test long distance
    const longRoute = { ...mockRoute, distance: 2500 };
    rerender(<FlightInfoPopup route={longRoute} />);
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();
  });

  it('renders responsive design elements', () => {
    render(<FlightInfoPopup route={mockRoute} />);

    // Check for responsive grid layout
    const gridElement = screen.getByText('Distance').closest('.grid');
    expect(gridElement).toHaveClass('grid-cols-2');

    // Check for responsive button layout - find the parent container
    const buttonContainer = screen.getByText('Book on Ryanair').closest('.bg-gray-50');
    expect(buttonContainer).toHaveClass('flex', 'gap-3');
  });

  it('includes proper accessibility features', () => {
    const onClose = jest.fn();
    render(<FlightInfoPopup route={mockRoute} onClose={onClose} />);

    // Check for close button accessibility
    const closeButton = screen.getByLabelText('Close popup');
    expect(closeButton).toBeInTheDocument();
    
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});