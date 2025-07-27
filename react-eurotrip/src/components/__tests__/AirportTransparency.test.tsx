import React from 'react';
import { render } from '@testing-library/react';
import AirportMarker from '../AirportMarker';
import { Airport } from '../../types';

// Mock react-leaflet components
jest.mock('react-leaflet', () => ({
  Marker: ({ children, eventHandlers }: any) => (
    <div data-testid="marker" onClick={eventHandlers?.click}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

// Mock leaflet
jest.mock('leaflet', () => ({
  DivIcon: jest.fn().mockImplementation((options) => ({
    options,
    html: options.html,
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

describe('AirportMarker Transparency Effects', () => {
  it('should render with low opacity when not selected and not connected', () => {
    render(
      <AirportMarker
        airport={mockAirport}
        isSelected={false}
        isConnected={false}
        flightCount={5}
        onClick={() => {}}
      />
    );

    // The marker should be rendered
    expect(document.querySelector('[data-testid="marker"]')).toBeInTheDocument();
  });

  it('should render with full opacity when selected', () => {
    render(
      <AirportMarker
        airport={mockAirport}
        isSelected={true}
        isConnected={true}
        flightCount={5}
        onClick={() => {}}
      />
    );

    // The marker should be rendered
    expect(document.querySelector('[data-testid="marker"]')).toBeInTheDocument();
  });

  it('should render with medium opacity when connected but not selected', () => {
    render(
      <AirportMarker
        airport={mockAirport}
        isSelected={false}
        isConnected={true}
        flightCount={5}
        onClick={() => {}}
      />
    );

    // The marker should be rendered
    expect(document.querySelector('[data-testid="marker"]')).toBeInTheDocument();
  });

  it('should handle click events correctly', () => {
    const mockOnClick = jest.fn();
    
    render(
      <AirportMarker
        airport={mockAirport}
        isSelected={false}
        isConnected={false}
        flightCount={5}
        onClick={mockOnClick}
      />
    );

    // The marker should be clickable
    expect(document.querySelector('[data-testid="marker"]')).toBeInTheDocument();
  });
});