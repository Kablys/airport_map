import React from 'react';
import { render, screen } from '@testing-library/react';
import AirportInfo from '../AirportInfo';
import { Airport } from '../../types';

describe('AirportInfo', () => {
  const mockAirport: Airport = {
    code: 'DUB',
    name: 'Dublin Airport',
    city: 'Dublin',
    country: 'Ireland',
    lat: 53.4213,
    lng: -6.2701,
  };

  it('renders nothing when no airport is selected', () => {
    const { container } = render(<AirportInfo selectedAirport={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays airport details header when airport is selected', () => {
    render(<AirportInfo selectedAirport={mockAirport} />);
    expect(screen.getByText('✈️ Airport Details')).toBeInTheDocument();
  });

  it('shows airport name and code', () => {
    render(<AirportInfo selectedAirport={mockAirport} />);
    
    expect(screen.getByText('Dublin Airport')).toBeInTheDocument();
    expect(screen.getByText('Code:')).toBeInTheDocument();
    expect(screen.getByText('DUB')).toBeInTheDocument();
  });

  it('displays location information', () => {
    render(<AirportInfo selectedAirport={mockAirport} />);
    
    expect(screen.getByText('🏙️ City:')).toBeInTheDocument();
    expect(screen.getByText('Dublin')).toBeInTheDocument();
    expect(screen.getByText('🌍 Country:')).toBeInTheDocument();
    expect(screen.getByText('Ireland')).toBeInTheDocument();
  });

  it('shows coordinates with proper formatting', () => {
    render(<AirportInfo selectedAirport={mockAirport} />);
    
    expect(screen.getByText('Coordinates:')).toBeInTheDocument();
    expect(screen.getByText('53.4213°, -6.2701°')).toBeInTheDocument();
  });

  it('includes deselection hint', () => {
    render(<AirportInfo selectedAirport={mockAirport} />);
    expect(screen.getByText('Click the airport again to deselect')).toBeInTheDocument();
  });

  it('applies proper styling classes', () => {
    const { container } = render(<AirportInfo selectedAirport={mockAirport} />);
    const airportInfo = container.firstChild as HTMLElement;
    
    expect(airportInfo).toHaveClass('bg-ryanair-blue/5', 'rounded-lg', 'p-3');
    expect(airportInfo).toHaveClass('border', 'border-ryanair-blue/20');
  });

  it('formats coordinates to 4 decimal places', () => {
    const airportWithLongCoords: Airport = {
      ...mockAirport,
      lat: 53.421234567,
      lng: -6.270123456,
    };

    render(<AirportInfo selectedAirport={airportWithLongCoords} />);
    expect(screen.getByText('53.4212°, -6.2701°')).toBeInTheDocument();
  });
});