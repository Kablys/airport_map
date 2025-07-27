import { renderHook, act } from '@testing-library/react';
import { useMap } from '../useMap';
import { AppProvider } from '../../contexts/AppContext';
import { Airport, Routes } from '../../types';

// Mock data
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
  {
    code: 'CDG',
    name: 'Charles de Gaulle',
    city: 'Paris',
    country: 'France',
    lat: 49.0097,
    lng: 2.5479,
  },
];

const mockRoutes: Routes = {
  DUB: ['LHR', 'CDG'],
  LHR: ['DUB'],
  CDG: ['DUB'],
};

// Mock the AppContext
jest.mock('../useAppContext', () => ({
  useAppContext: () => ({
    state: {
      airports: mockAirports,
      routes: mockRoutes,
      selectedAirport: null,
      isLoading: false,
      errors: [],
    },
    selectAirport: jest.fn(),
    setLoading: jest.fn(),
    addError: jest.fn(),
  }),
}));

describe('useMap Airport Selection', () => {
  it('should initialize with empty connected airports', () => {
    const { result } = renderHook(() => useMap());
    
    expect(result.current.connectedAirports.size).toBe(0);
    expect(result.current.routeLines).toHaveLength(0);
    expect(result.current.priceRange).toBeNull();
  });

  it('should handle airport click and show routes', async () => {
    const { result } = renderHook(() => useMap());
    
    await act(async () => {
      await result.current.handleAirportClick(mockAirports[0]); // DUB
    });

    // Connected airports should be updated
    expect(result.current.connectedAirports.size).toBeGreaterThan(0);
  });

  it('should clear routes when clearRoutes is called', () => {
    const { result } = renderHook(() => useMap());
    
    act(() => {
      result.current.clearRoutes();
    });

    expect(result.current.connectedAirports.size).toBe(0);
    expect(result.current.routeLines).toHaveLength(0);
    expect(result.current.priceRange).toBeNull();
  });

  it('should calculate distance between airports', () => {
    const { result } = renderHook(() => useMap());
    
    const distance = result.current.calculateDistance(
      53.4213, -6.2701, // Dublin
      51.4700, -0.4543  // London
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(1000); // Should be reasonable distance
  });
});