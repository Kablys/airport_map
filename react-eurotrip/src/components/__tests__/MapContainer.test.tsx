import { render, screen } from '@testing-library/react';
import MapContainer from '../MapContainer';
import { AppProvider } from '../../contexts/AppContext';
import { useMap } from '../../hooks/useMap';

const mockUseMap = useMap as jest.MockedFunction<typeof useMap>;

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="leaflet-map" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
}));

// Mock leaflet CSS import
jest.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock the useMap hook
jest.mock('../../hooks/useMap');

describe('MapContainer', () => {
  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <AppProvider>
        {component}
      </AppProvider>
    );
  };

  beforeEach(() => {
    mockUseMap.mockReturnValue({
      mapRef: { current: null },
      isMapReady: true,
      connectedAirports: new Set(),
      routeLines: [],
      priceRange: null,
      handleAirportClick: jest.fn(),
      showRoutes: jest.fn(),
      clearRoutes: jest.fn(),
      updateRouteColor: jest.fn(),
      getAirportsBounds: jest.fn(),
      calculateDistance: jest.fn(),
    });
  });

  it('renders the map container', () => {
    renderWithProvider(<MapContainer />);
    
    expect(screen.getByTestId('leaflet-map')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('shows loading state when map is not ready', () => {
    // Mock useMap to return isMapReady: false for this test
    mockUseMap.mockReturnValueOnce({
      mapRef: { current: null },
      isMapReady: false,
      connectedAirports: new Set(),
      routeLines: [],
      priceRange: null,
      handleAirportClick: jest.fn(),
      showRoutes: jest.fn(),
      clearRoutes: jest.fn(),
      updateRouteColor: jest.fn(),
      getAirportsBounds: jest.fn(),
      calculateDistance: jest.fn(),
    });
    
    renderWithProvider(<MapContainer />);
    
    expect(screen.getByText('Loading map...')).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    renderWithProvider(<MapContainer />);
    
    const mapContainer = screen.getByTestId('leaflet-map');
    expect(mapContainer).toHaveClass('h-full', 'w-full', 'z-map');
  });
});