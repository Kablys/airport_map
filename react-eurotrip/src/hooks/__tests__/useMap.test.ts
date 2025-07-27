import { renderHook, act } from '@testing-library/react';
import { useMap } from '../useMap';
import { AppProvider } from '../../contexts/AppContext';
import { Airport } from '../../types';

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
];

const mockRoutes = {
  DUB: ['LHR'],
  LHR: ['DUB'],
};

// Mock the AppContext
const mockAppContext = {
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
};

jest.mock('../useAppContext', () => ({
  useAppContext: () => mockAppContext,
}));

describe('useMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    expect(result.current.isMapReady).toBe(false);
    expect(result.current.connectedAirports).toEqual(new Set());
    expect(result.current.routeLines).toEqual([]);
    expect(result.current.priceRange).toBeNull();
  });

  it('sets map ready after timeout', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    expect(result.current.isMapReady).toBe(false);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.isMapReady).toBe(true);
    
    jest.useRealTimers();
  });

  it('calculates distance correctly', () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    // Distance between Dublin and London (approximately 463 km)
    const distance = result.current.calculateDistance(53.4213, -6.2701, 51.4700, -0.4543);
    
    // Allow for some variance in the calculation
    expect(distance).toBeGreaterThan(440);
    expect(distance).toBeLessThan(480);
  });

  it('handles airport click correctly', async () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    await act(async () => {
      await result.current.handleAirportClick(mockAirports[0]);
    });

    expect(mockAppContext.selectAirport).toHaveBeenCalledWith(mockAirports[0]);
    expect(mockAppContext.setLoading).toHaveBeenCalledWith(true);
    expect(mockAppContext.setLoading).toHaveBeenCalledWith(false);
  });

  it('deselects airport when clicking the same airport', async () => {
    // Mock selected airport
    (mockAppContext.state as any).selectedAirport = mockAirports[0];
    
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    await act(async () => {
      await result.current.handleAirportClick(mockAirports[0]);
    });

    expect(mockAppContext.selectAirport).toHaveBeenCalledWith(null);
  });

  it('shows routes correctly', async () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    await act(async () => {
      await result.current.showRoutes('DUB');
    });

    expect(result.current.connectedAirports).toEqual(new Set(['LHR']));
    expect(result.current.routeLines).toHaveLength(1);
    expect(result.current.routeLines[0].id).toBe('DUB-LHR');
    expect(result.current.priceRange).toEqual({ min: 20, max: 200 });
  });

  it('clears routes correctly', () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    act(() => {
      result.current.clearRoutes();
    });

    expect(result.current.connectedAirports).toEqual(new Set());
    expect(result.current.routeLines).toEqual([]);
    expect(result.current.priceRange).toBeNull();
  });

  it('updates route color correctly', () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    // First set up some route lines
    act(() => {
      result.current.showRoutes('DUB');
    });

    // Then update the color
    act(() => {
      result.current.updateRouteColor('DUB-LHR', 50);
    });

    const updatedRoute = result.current.routeLines.find(line => line.id === 'DUB-LHR');
    expect(updatedRoute?.color).toBe('#00cc44'); // green for cheap price
    expect(updatedRoute?.price?.price).toBe(50);
  });

  it('gets airports bounds correctly', () => {
    const { result } = renderHook(() => useMap(), {
      wrapper: AppProvider,
    });

    const bounds = result.current.getAirportsBounds();
    
    expect(bounds).toEqual({
      north: 53.4213,
      south: 51.4700,
      east: -0.4543,
      west: -6.2701,
    });
  });
});