import React from 'react';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import AirportMarkers from '../AirportMarkers';
import { AppProvider } from '../../contexts/AppContext';
import { Airport, Routes } from '../../types';

// Mock the useMap hook
jest.mock('../../hooks/useMap', () => ({
  useMap: () => ({
    connectedAirports: new Set(['DUB', 'LHR']),
    handleAirportClick: jest.fn(),
  }),
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    _getIconUrl: jest.fn(),
  })),
}));

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
    code: 'LHR',
    name: 'London Heathrow',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.4700,
    lng: -0.4543,
  },
];

const mockRoutes: Routes = {
  DUB: ['LHR', 'CDG'],
  LHR: ['DUB', 'MAD'],
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AppProvider>
      <MapContainer center={[50, 10]} zoom={4}>
        {component}
      </MapContainer>
    </AppProvider>
  );
};

describe('AirportMarkers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when no airports are loaded', () => {
    expect(() => {
      renderWithProviders(<AirportMarkers />);
    }).not.toThrow();
  });

  it('renders airport markers when airports are available', () => {
    // Mock the context to return airports
    jest.doMock('../../hooks/useAppContext', () => ({
      useAppContext: () => ({
        state: {
          airports: mockAirports,
          routes: mockRoutes,
          selectedAirport: null,
          isLoading: false,
          errors: [],
        },
      }),
    }));

    expect(() => {
      renderWithProviders(<AirportMarkers />);
    }).not.toThrow();
  });

  it('handles selected airport correctly', () => {
    // Mock the context with selected airport
    jest.doMock('../../hooks/useAppContext', () => ({
      useAppContext: () => ({
        state: {
          airports: mockAirports,
          routes: mockRoutes,
          selectedAirport: mockAirports[0], // DUB selected
          isLoading: false,
          errors: [],
        },
      }),
    }));

    expect(() => {
      renderWithProviders(<AirportMarkers />);
    }).not.toThrow();
  });
});