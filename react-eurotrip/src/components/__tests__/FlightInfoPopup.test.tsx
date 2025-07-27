import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlightInfoPopup from '../FlightInfoPopup';
import { RouteLine, FlightPrice } from '../../types';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open
const mockOpen = jest.fn();
Object.assign(window, { open: mockOpen });

describe('FlightInfoPopup', () => {
  const mockAirport1 = {
    code: 'DUB',
    name: 'Dublin Airport',
    city: 'Dublin',
    country: 'Ireland',
    lat: 53.4213,
    lng: -6.2701,
  };

  const mockAirport2 = {
    code: 'BCN',
    name: 'Barcelona-El Prat Airport',
    city: 'Barcelona',
    country: 'Spain',
    lat: 41.2974,
    lng: 2.0833,
  };

  const mockFlightPrice: FlightPrice = {
    price: 89.99,
    currency: 'EUR',
    lastUpdated: Date.now(),
    estimated: false,
    flightNumber: 'FR1234',
    departureTime: '2024-01-15T08:30:00Z',
    arrivalTime: '2024-01-15T11:45:00Z',
    note: 'Live price from Ryanair API',
  };

  const mockRoute: RouteLine = {
    id: 'DUB-BCN',
    source: mockAirport1,
    destination: mockAirport2,
    price: mockFlightPrice,
    distance: 1463,
    color: '#00cc44',
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('renders flight information correctly', () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    // Check header information
    expect(screen.getByText('Dublin → Barcelona')).toBeInTheDocument();
    expect(screen.getByText(/Dublin Airport \(DUB\) to Barcelona-El Prat Airport \(BCN\)/)).toBeInTheDocument();

    // Check price display
    expect(screen.getByText('€89.99')).toBeInTheDocument();

    // Check flight details
    expect(screen.getByText('1463 km')).toBeInTheDocument();
    expect(screen.getByText('FR1234')).toBeInTheDocument();
    expect(screen.getByText('Boeing 737 MAX 8')).toBeInTheDocument();

    // Check schedule information
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getByText('11:45')).toBeInTheDocument();

    // Check buttons
    expect(screen.getByText('Book on Ryanair')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('renders estimated price correctly', () => {
    const estimatedRoute = {
      ...mockRoute,
      price: {
        ...mockFlightPrice,
        estimated: true,
        note: 'Estimated price based on route distance',
      },
    };

    render(<FlightInfoPopup route={estimatedRoute} onClose={mockOnClose} />);

    expect(screen.getByText('estimated')).toBeInTheDocument();
    expect(screen.getByText('Estimated price based on route distance')).toBeInTheDocument();
  });

  it('handles booking button click', () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    const bookButton = screen.getByText('Book on Ryanair');
    fireEvent.click(bookButton);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://www.ryanair.com/gb/en/trip/flights/select'),
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('originIata=DUB'),
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('destinationIata=BCN'),
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('handles copy button click successfully', async () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Dublin (DUB) → Barcelona (BCN)')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
    });

    // Check that success message disappears
    await waitFor(
      () => {
        expect(screen.queryByText('Copied to clipboard!')).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('handles copy button click failure', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard error'));

    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copy failed')).toBeInTheDocument();
    });
  });

  it('handles close button click', () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText('Close popup');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calculates duration correctly from departure and arrival times', () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    // Duration should be calculated as 3h 15m (11:45 - 08:30)
    expect(screen.getByText('3h 15m')).toBeInTheDocument();
  });

  it('shows estimated duration when times are not available', () => {
    const routeWithoutTimes = {
      ...mockRoute,
      price: {
        ...mockFlightPrice,
        departureTime: undefined,
        arrivalTime: undefined,
      },
    };

    render(<FlightInfoPopup route={routeWithoutTimes} onClose={mockOnClose} />);

    // Should show estimated duration based on distance
    expect(screen.getByText(/~\d+\.?\d*h/)).toBeInTheDocument();
  });

  it('shows correct aircraft type based on distance', () => {
    // Short distance route
    const shortRoute = { ...mockRoute, distance: 500 };
    const { rerender } = render(<FlightInfoPopup route={shortRoute} onClose={mockOnClose} />);
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();

    // Medium distance route
    const mediumRoute = { ...mockRoute, distance: 1200 };
    rerender(<FlightInfoPopup route={mediumRoute} onClose={mockOnClose} />);
    expect(screen.getByText('Boeing 737 MAX 8')).toBeInTheDocument();

    // Long distance route
    const longRoute = { ...mockRoute, distance: 2000 };
    rerender(<FlightInfoPopup route={longRoute} onClose={mockOnClose} />);
    expect(screen.getByText('Boeing 737-800')).toBeInTheDocument();
  });

  it('does not render when route has no price', () => {
    const routeWithoutPrice = { ...mockRoute, price: null };
    const { container } = render(<FlightInfoPopup route={routeWithoutPrice} onClose={mockOnClose} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders without close button when onClose is not provided', () => {
    render(<FlightInfoPopup route={mockRoute} />);

    expect(screen.queryByLabelText('Close popup')).not.toBeInTheDocument();
    expect(screen.getByText('Dublin → Barcelona')).toBeInTheDocument();
  });

  it('formats times correctly in different timezones', () => {
    const routeWithSpecificTimes = {
      ...mockRoute,
      price: {
        ...mockFlightPrice,
        departureTime: '2024-01-15T14:30:00Z',
        arrivalTime: '2024-01-15T17:45:00Z',
      },
    };

    render(<FlightInfoPopup route={routeWithSpecificTimes} onClose={mockOnClose} />);

    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('17:45')).toBeInTheDocument();
  });

  it('includes all expected information in copied text', async () => {
    render(<FlightInfoPopup route={mockRoute} onClose={mockOnClose} />);

    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringMatching(/🛫 Flight Details/)
      );
    });

    const copiedText = mockWriteText.mock.calls[0][0];
    expect(copiedText).toContain('Dublin (DUB) → Barcelona (BCN)');
    expect(copiedText).toContain('€89.99');
    expect(copiedText).toContain('1463 km');
    expect(copiedText).toContain('3h 15m');
    expect(copiedText).toContain('Boeing 737 MAX 8');
    expect(copiedText).toContain('FR1234');
    expect(copiedText).toContain('Live price from Ryanair API');
    expect(copiedText).toContain('https://www.ryanair.com');
  });
});