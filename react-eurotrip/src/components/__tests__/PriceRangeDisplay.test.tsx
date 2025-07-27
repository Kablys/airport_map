import React from 'react';
import { render, screen } from '@testing-library/react';
import PriceRangeDisplay from '../PriceRangeDisplay';
import { RouteLine } from '../../types';

describe('PriceRangeDisplay', () => {
  const mockRouteLines: RouteLine[] = [
    {
      id: 'DUB-LHR',
      source: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4213, lng: -6.2701 },
      destination: { code: 'LHR', name: 'London Heathrow', city: 'London', country: 'United Kingdom', lat: 51.4700, lng: -0.4543 },
      price: { price: 50, currency: 'EUR', lastUpdated: Date.now(), estimated: false },
      distance: 463,
      color: '#00cc44',
    },
    {
      id: 'DUB-CDG',
      source: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4213, lng: -6.2701 },
      destination: { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
      price: { price: 150, currency: 'EUR', lastUpdated: Date.now(), estimated: false },
      distance: 781,
      color: '#ff8800',
    },
    {
      id: 'DUB-BCN',
      source: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4213, lng: -6.2701 },
      destination: { code: 'BCN', name: 'Barcelona Airport', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833 },
      price: { price: 250, currency: 'EUR', lastUpdated: Date.now(), estimated: false },
      distance: 1463,
      color: '#ff0066',
    },
  ];

  it('renders nothing when no price range and no route lines', () => {
    const { container } = render(<PriceRangeDisplay priceRange={null} routeLines={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays route pricing header when routes exist', () => {
    render(<PriceRangeDisplay priceRange={{ min: 20, max: 200 }} routeLines={mockRouteLines} />);
    expect(screen.getByText('Route Pricing')).toBeInTheDocument();
  });

  it('shows price statistics when routes have prices', () => {
    render(<PriceRangeDisplay priceRange={{ min: 20, max: 200 }} routeLines={mockRouteLines} />);
    
    expect(screen.getByText('€50')).toBeInTheDocument(); // Cheapest
    expect(screen.getByText('€150')).toBeInTheDocument(); // Average
    expect(screen.getByText('€250')).toBeInTheDocument(); // Most expensive
    expect(screen.getByText('Cheapest')).toBeInTheDocument();
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText('Most Expensive')).toBeInTheDocument();
  });

  it('displays price category legend with route counts', () => {
    render(<PriceRangeDisplay priceRange={{ min: 20, max: 200 }} routeLines={mockRouteLines} />);
    
    expect(screen.getByText('Price Categories:')).toBeInTheDocument();
    expect(screen.getByText('Budget (≤€100)')).toBeInTheDocument();
    expect(screen.getByText('Medium (€101-200)')).toBeInTheDocument();
    expect(screen.getByText('Premium (>€200)')).toBeInTheDocument();
    
    // Check for route counts - there should be 3 instances of "1 routes"
    const routeCounts = screen.getAllByText('1 routes');
    expect(routeCounts).toHaveLength(3); // Budget, Medium, and Premium routes
  });

  it('shows loading indicator for routes without prices', () => {
    const routesWithoutPrices: RouteLine[] = [
      ...mockRouteLines,
      {
        id: 'DUB-MAD',
        source: { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'Ireland', lat: 53.4213, lng: -6.2701 },
        destination: { code: 'MAD', name: 'Madrid Airport', city: 'Madrid', country: 'Spain', lat: 40.4719, lng: -3.5626 },
        price: null,
        distance: 1463,
        color: '#666666',
      },
    ];

    render(<PriceRangeDisplay priceRange={{ min: 20, max: 200 }} routeLines={routesWithoutPrices} />);
    expect(screen.getByText(/Loading prices for 1 routes/)).toBeInTheDocument();
  });

  it('shows select airport message when no routes', () => {
    render(<PriceRangeDisplay priceRange={null} routeLines={[]} />);
    // This should render nothing, so let's test with empty routes but price range
    render(<PriceRangeDisplay priceRange={{ min: 20, max: 200 }} routeLines={[]} />);
    expect(screen.getByText('Select an airport to view route pricing')).toBeInTheDocument();
  });
});