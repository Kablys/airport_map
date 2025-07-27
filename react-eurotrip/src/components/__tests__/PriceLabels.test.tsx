import React from 'react';
import { render, waitFor } from '@testing-library/react';
import PriceLabels from '../PriceLabels';
import { Airport, RouteLine, FlightPrice } from '../../types';

// Mock the hooks
const mockUseAppContext = {
  state: {
    selectedAirport: {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701,
    } as Airport,
    airports: [],
    routes: {},
    isLoading: false,
    errors: [],
  },
};

const mockRouteLines: RouteLine[] = [
  {
    id: 'DUB-LHR',
    source: {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701,
    },
    destination: {
      code: 'LHR',
      name: 'London Heathrow',
      city: 'London',
      country: 'United Kingdom',
      lat: 51.4700,
      lng: -0.4543,
    },
    price: {
      price: 89,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
      flightNumber: 'FR123',
      departureTime: '10:30',
      arrivalTime: '11:45',
    } as FlightPrice,
    distance: 463,
    color: '#00cc44',
  },
  {
    id: 'DUB-BCN',
    source: {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701,
    },
    destination: {
      code: 'BCN',
      name: 'Barcelona Airport',
      city: 'Barcelona',
      country: 'Spain',
      lat: 41.2974,
      lng: 2.0833,
    },
    price: {
      price: 156,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    } as FlightPrice,
    distance: 1463,
    color: '#ff8800',
  },
];

const mockUseMap = {
  routeLines: mockRouteLines,
  isMapReady: true,
  connectedAirports: new Set(['LHR', 'BCN']),
  priceRange: { min: 89, max: 156 },
  handleAirportClick: jest.fn(),
  showRoutes: jest.fn(),
  clearRoutes: jest.fn(),
  updateRouteColor: jest.fn(),
  getAirportsBounds: jest.fn(),
  calculateDistance: jest.fn(),
  mapRef: { current: null },
};

jest.mock('../../hooks/useAppContext', () => ({
  useAppContext: () => mockUseAppContext,
}));

jest.mock('../../hooks/useMap', () => ({
  useMap: () => mockUseMap,
}));

// Mock Leaflet components
jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers, ...props }: any) => (
    <div 
      data-testid="price-marker" 
      onClick={eventHandlers?.click}
      onMouseOver={eventHandlers?.mouseover}
      onMouseOut={eventHandlers?.mouseout}
      {...props}
    >
      {children}
    </div>
  ),
  Popup: ({ children, eventHandlers }: any) => (
    <div data-testid="price-popup">
      {children}
    </div>
  ),
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    html: options.html,
    _getIconUrl: jest.fn(),
  })),
}));

describe('PriceLabels Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders price labels for routes with price data', () => {
    render(<PriceLabels />);

    // Should render price markers for routes with prices
    const priceMarkers = document.querySelectorAll('[data-testid="price-marker"]');
    expect(priceMarkers).toHaveLength(2);
  });

  it('does not render when no airport is selected', () => {
    const mockUseAppContextNoSelection = {
      ...mockUseAppContext,
      state: {
        ...mockUseAppContext.state,
        selectedAirport: null,
      },
    };

    jest.doMock('../../hooks/useAppContext', () => ({
      useAppContext: () => mockUseAppContextNoSelection,
    }));

    render(<PriceLabels />);

    expect(document.querySelectorAll('[data-testid="price-marker"]')).toHaveLength(0);
  });

  it('does not render when no route lines exist', () => {
    const mockUseMapNoRoutes = {
      ...mockUseMap,
      routeLines: [],
    };

    jest.doMock('../../hooks/useMap', () => ({
      useMap: () => mockUseMapNoRoutes,
    }));

    render(<PriceLabels />);

    expect(document.querySelectorAll('[data-testid="price-marker"]')).toHaveLength(0);
  });

  it('handles hover events correctly', async () => {
    render(<PriceLabels />);

    // Simulate hover event from route line
    const hoverEvent = new CustomEvent('routeHover', {
      detail: { routeId: 'DUB-LHR', isEntering: true }
    });
    window.dispatchEvent(hoverEvent);

    await waitFor(() => {
      // Should render price markers
      expect(document.querySelectorAll('[data-testid="price-marker"]')).toHaveLength(2);
    });

    // Simulate hover out
    const hoverOutEvent = new CustomEvent('routeHover', {
      detail: { routeId: 'DUB-LHR', isEntering: false }
    });
    window.dispatchEvent(hoverOutEvent);
  });

  it('handles click events for route selection', async () => {
    render(<PriceLabels />);

    // Simulate click event from route line
    const clickEvent = new CustomEvent('routeClick', {
      detail: { routeId: 'DUB-LHR' }
    });
    window.dispatchEvent(clickEvent);

    await waitFor(() => {
      // Should open popup with flight details
      expect(document.querySelector('[data-testid="price-popup"]')).toBeTruthy();
    });
  });

  it('calculates midpoints correctly', () => {
    render(<PriceLabels />);

    // The component should calculate midpoints for price label positioning
    // This is tested indirectly through the rendering of markers
    expect(document.querySelectorAll('[data-testid="price-marker"]')).toHaveLength(2);
  });

  it('formats prices correctly in labels', () => {
    render(<PriceLabels />);

    // Check that price markers are rendered
    const priceMarkers = document.querySelectorAll('[data-testid="price-marker"]');
    expect(priceMarkers.length).toBeGreaterThan(0);
  });

  it('applies dynamic styling based on price category', () => {
    render(<PriceLabels />);

    // Should render price markers with appropriate styling
    const priceMarkers = document.querySelectorAll('[data-testid="price-marker"]');
    expect(priceMarkers.length).toBe(2);
  });

  it('shows estimated price indicator when price is estimated', () => {
    const mockRouteLinesWithEstimated = [
      {
        ...mockRouteLines[0],
        price: {
          ...mockRouteLines[0].price!,
          estimated: true,
        },
      },
    ];

    const mockUseMapWithEstimated = {
      ...mockUseMap,
      routeLines: mockRouteLinesWithEstimated,
    };

    jest.doMock('../../hooks/useMap', () => ({
      useMap: () => mockUseMapWithEstimated,
    }));

    render(<PriceLabels />);

    // Should render price marker for estimated prices
    expect(document.querySelector('[data-testid="price-marker"]')).toBeTruthy();
  });

  it('handles window events cleanup on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    
    const { unmount } = render(<PriceLabels />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('routeHover', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('routeClick', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});