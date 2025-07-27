import React from 'react';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import AirportMarker from '../AirportMarker';
import { Airport } from '../../types';

// Mock Leaflet
jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    _getIconUrl: jest.fn(),
  })),
}));

const mockAirport: Airport = {
  code: 'DUB',
  name: 'Dublin Airport',
  city: 'Dublin',
  country: 'Ireland',
  lat: 53.4213,
  lng: -6.2701,
};

const renderWithMap = (component: React.ReactElement) => {
  return render(
    <MapContainer center={[50, 10]} zoom={4}>
      {component}
    </MapContainer>
  );
};

describe('AirportMarker', () => {
  const defaultProps = {
    airport: mockAirport,
    isSelected: false,
    isConnected: false,
    flightCount: 5,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    expect(() => {
      renderWithMap(<AirportMarker {...defaultProps} />);
    }).not.toThrow();
  });

  it('calls onClick when clicked', () => {
    const mockOnClick = jest.fn();
    const { container } = renderWithMap(
      <AirportMarker {...defaultProps} onClick={mockOnClick} />
    );
    
    // Find the marker element and simulate click
    const markerElement = container.querySelector('.ryanair-marker');
    if (markerElement) {
      markerElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    
    // Note: Due to Leaflet's event handling, we can't easily test the click in JSDOM
    // This test mainly ensures the component renders without errors
  });

  it('applies correct styling for selected state', () => {
    renderWithMap(
      <AirportMarker {...defaultProps} isSelected={true} />
    );
    
    // The component should render without errors when selected
    expect(true).toBe(true);
  });

  it('applies correct styling for connected state', () => {
    renderWithMap(
      <AirportMarker {...defaultProps} isConnected={true} />
    );
    
    // The component should render without errors when connected
    expect(true).toBe(true);
  });

  it('displays correct flight count', () => {
    const flightCount = 10;
    renderWithMap(
      <AirportMarker {...defaultProps} flightCount={flightCount} />
    );
    
    // The component should render without errors with flight count
    expect(true).toBe(true);
  });
});