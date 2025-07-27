import { getFlightPrice, clearAllCache } from '../apiService';
import { Airport } from '../../types';

// Integration test to verify API service works with real-like data
describe('API Service Integration', () => {
  beforeEach(() => {
    clearAllCache();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle a complete flight pricing workflow', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        fares: [{
          outbound: {
            price: { value: 89.99, currencyCode: 'EUR' },
            flightNumber: 'FR1234',
            departureDate: '2024-01-15T10:30:00Z',
            arrivalDate: '2024-01-15T13:45:00Z'
          }
        }]
      })
    });

    const dublinAirport: Airport = {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701
    };

    const londonAirport: Airport = {
      code: 'STN',
      name: 'London Stansted Airport',
      city: 'London',
      country: 'United Kingdom',
      lat: 51.8860,
      lng: 0.2388
    };

    // Test the complete workflow
    const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

    // Verify the result structure matches what components expect
    expect(result).toMatchObject({
      price: 90, // Rounded
      currency: 'EUR',
      estimated: false,
      flightNumber: 'FR1234',
      departureTime: '2024-01-15T10:30:00Z',
      arrivalTime: '2024-01-15T13:45:00Z',
      note: 'Live price from Ryanair API'
    });

    expect(result?.lastUpdated).toBeGreaterThan(Date.now() - 1000);
    expect(typeof result?.price).toBe('number');
    expect(typeof result?.currency).toBe('string');
    expect(typeof result?.estimated).toBe('boolean');
  });

  it('should work with multiple airports like a real route selection', async () => {
    // Mock API to fail so we test fallback estimation
    (global.fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

    const airports: Airport[] = [
      {
        code: 'DUB',
        name: 'Dublin Airport',
        city: 'Dublin',
        country: 'Ireland',
        lat: 53.4213,
        lng: -6.2701
      },
      {
        code: 'STN',
        name: 'London Stansted Airport',
        city: 'London',
        country: 'United Kingdom',
        lat: 51.8860,
        lng: 0.2388
      },
      {
        code: 'BCN',
        name: 'Barcelona Airport',
        city: 'Barcelona',
        country: 'Spain',
        lat: 41.2974,
        lng: 2.0833
      }
    ];

    // Simulate getting prices for all routes from Dublin
    const routes = airports.slice(1).map(dest => ({
      from: airports[0],
      to: dest
    }));

    const pricePromises = routes.map(route => 
      getFlightPrice(route.from.code, route.to.code, route.from, route.to)
    );

    const prices = await Promise.all(pricePromises);

    // All should have estimated prices
    prices.forEach((price, index) => {
      expect(price).toBeTruthy();
      expect(price?.estimated).toBe(true);
      expect(price?.price).toBeGreaterThan(0);
      expect(price?.currency).toBe('EUR');
      expect(price?.flightNumber).toMatch(/^FR\d{4}$/);
      
      console.log(`Route ${routes[index].from.code} -> ${routes[index].to.code}: €${price?.price}`);
    });

    // Prices should be different for different distances
    expect(prices[0]?.price).not.toBe(prices[1]?.price);
  });

  it('should handle cache behavior in a realistic scenario', async () => {
    let apiCallCount = 0;
    
    (global.fetch as jest.Mock).mockImplementation(() => {
      apiCallCount++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' },
              flightNumber: 'FR5678'
            }
          }]
        })
      });
    });

    const dublinAirport: Airport = {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701
    };

    const londonAirport: Airport = {
      code: 'STN',
      name: 'London Stansted Airport',
      city: 'London',
      country: 'United Kingdom',
      lat: 51.8860,
      lng: 0.2388
    };

    // First call should hit API
    const result1 = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
    expect(apiCallCount).toBe(1);
    expect(result1?.price).toBe(46);

    // Second call should use cache
    const result2 = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
    expect(apiCallCount).toBe(1); // No additional API call
    expect(result2?.price).toBe(46);

    // Results should be identical
    expect(result1).toEqual(result2);
  });
});