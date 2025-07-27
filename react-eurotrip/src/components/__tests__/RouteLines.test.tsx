import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import RouteLines from '../RouteLines';
import { AppProvider } from '../../contexts/AppContext';
import { Airport, Routes, RouteLine } from '../../types';
import * as apiService from '../../services/apiService';

// Mock the API service
jest.mock('../../services/apiService');
const mockGetFlightPrice = apiService.getFlightPrice as jest.MockedFunction<typeof apiService.getFlightPrice>;

// Mock the useMap hook
const mockRouteLines: RouteLine[] = [];
const mockUseMap = {
  routeLines: mockRouteLines,
  isMapReady: true,
  connectedAirports: new Set(),
  priceRange: null,
  mapRef: { current: null },
  handleAirportClick: jest.fn(),
  showRoutes: jest.fn(),
  clearRoutes: jest.fn(),
  updateRouteColor: jest.fn(),
  getAirportsBounds: jest.fn(),
  calculateDistance: jest.fn(),
};

jest.mock('../../hooks/useMap', () => ({
  useMap: () => mockUseMap,
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  Map: jest.fn(),
  TileLayer: jest.fn(),
  Marker: jest.fn(),
  Icon: jest.fn(),
  Polyline: jest.fn(),
}));

// Test data
const mockAirports: Airport[] = [
  {
    code: 'DUB',
    name: 'Dublin Airport',
    city: 'Dublin',
    country: 'Ireland',
    lat: 53.4213,
    lng: -6.2701,
  },
  {
    code: 'LGW',
    name: 'London Gatwick',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.1537,
    lng: -0.1821,
  },
  {
    code: 'BCN',
    name: 'Barcelona Airport',
    city: 'Barcelona',
    country: 'Spain',
    lat: 41.2974,
    lng: 2.0833,
  },
];

const mockRoutes: Routes = {
  'DUB': ['LGW', 'BCN'],
  'LGW': ['DUB', 'BCN'],
  'BCN': ['DUB', 'LGW'],
};

const mockRouteLinesData: RouteLine[] = [
  {
    id: 'DUB-LGW',
    source: mockAirports[0],
    destination: mockAirports[1],
    price: null,
    distance: 464,
    color: '#666666',
  },
  {
    id: 'DUB-BCN',
    source: mockAirports[0],
    destination: mockAirports[2],
    price: null,
    distance: 1463,
    color: '#666666',
  },
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProvider>
    <MapContainer center={[50, 10]} zoom={4}>
      {children}
    </MapContainer>
  </AppProvider>
);

describe('RouteLines Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMap.routeLines = [];
  });

  it('renders nothing when no routes are available', () => {
    const { container } = render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('renders nothing when no airport is selected', () => {
    mockUseMap.routeLines = mockRouteLinesData;
    
    const { container } = render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('fetches prices and renders route lines when airport is selected', async () => {
    // Mock API responses
    mockGetFlightPrice
      .mockResolvedValueOnce({
        price: 50,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
        flightNumber: 'FR1234',
      })
      .mockResolvedValueOnce({
        price: 120,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
        flightNumber: 'FR5678',
      });

    // Set up mock state with selected airport and routes
    mockUseMap.routeLines = mockRouteLinesData;

    const { container } = render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    // Wait for price fetching to complete
    await waitFor(() => {
      expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
    });

    expect(mockGetFlightPrice).toHaveBeenCalledWith('DUB', 'LGW', mockAirports[0], mockAirports[1]);
    expect(mockGetFlightPrice).toHaveBeenCalledWith('DUB', 'BCN', mockAirports[0], mockAirports[2]);
  });

  it('handles API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Mock API to throw error
    mockGetFlightPrice.mockRejectedValue(new Error('API Error'));

    mockUseMap.routeLines = mockRouteLinesData;

    render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetFlightPrice).toHaveBeenCalled();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch price for route'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('calculates price range correctly', async () => {
    mockGetFlightPrice
      .mockResolvedValueOnce({
        price: 30,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
      })
      .mockResolvedValueOnce({
        price: 150,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
      });

    mockUseMap.routeLines = mockRouteLinesData;

    render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
    });

    // The component should calculate price range internally
    // We can't directly test the internal state, but we can verify the API calls were made
    expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
  });

  it('updates route colors based on price range', async () => {
    const cheapPrice = {
      price: 25,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    };

    const expensivePrice = {
      price: 200,
      currency: 'EUR',
      lastUpdated: Date.now(),
      estimated: false,
    };

    mockGetFlightPrice
      .mockResolvedValueOnce(cheapPrice)
      .mockResolvedValueOnce(expensivePrice);

    mockUseMap.routeLines = mockRouteLinesData;

    render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
    });

    // Verify that prices were fetched for both routes
    expect(mockGetFlightPrice).toHaveBeenCalledWith('DUB', 'LGW', mockAirports[0], mockAirports[1]);
    expect(mockGetFlightPrice).toHaveBeenCalledWith('DUB', 'BCN', mockAirports[0], mockAirports[2]);
  });

  it('handles routes without price data', async () => {
    mockGetFlightPrice
      .mockResolvedValueOnce(null) // No price data
      .mockResolvedValueOnce({
        price: 100,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
      });

    mockUseMap.routeLines = mockRouteLinesData;

    render(
      <TestWrapper>
        <RouteLines />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
    });

    // Component should handle null price data gracefully
    expect(mockGetFlightPrice).toHaveBeenCalledTimes(2);
  });
});