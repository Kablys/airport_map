import { 
  getFlightPrice, 
  clearExpiredCache, 
  getCacheStats, 
  clearAllCache, 
  preloadPrices,
  getCachedPrice,
  hasCachedPrice,
  setCachedPrice,
  getCacheHitRate,
  ApiError,
  ApiErrorType
} from '../apiService';
import { Airport, FlightPrice } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to avoid noise in tests
const consoleSpy = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
  warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
  log: jest.spyOn(console, 'log').mockImplementation(() => {})
};

// Sample airport data for testing
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

const barcelonaAirport: Airport = {
  code: 'BCN',
  name: 'Barcelona Airport',
  city: 'Barcelona',
  country: 'Spain',
  lat: 41.2974,
  lng: 2.0833
};

describe('API Service', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearAllCache();
    
    // Reset all mocks
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Reset console spies
    Object.values(consoleSpy).forEach(spy => spy.mockClear());
  });

  afterAll(() => {
    // Restore console methods
    Object.values(consoleSpy).forEach(spy => spy.mockRestore());
  });

  describe('getFlightPrice', () => {
    it('should return cached price if available and not expired', async () => {
      // First call to populate cache
      const mockApiResponse = {
        fares: [{
          outbound: {
            price: { value: 45.99, currencyCode: 'EUR' },
            flightNumber: 'FR1234',
            departureDate: '2024-01-15',
            arrivalDate: '2024-01-15'
          }
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const firstResult = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      
      // Second call should use cache
      const secondResult = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(firstResult).toEqual(secondResult);
      expect(firstResult?.price).toBe(46); // Rounded
      expect(firstResult?.estimated).toBe(false);
    });

    it('should fetch real price from Ryanair API successfully', async () => {
      const mockApiResponse = {
        fares: [{
          outbound: {
            price: { value: 89.50, currencyCode: 'EUR' },
            flightNumber: 'FR5678',
            departureDate: '2024-01-15T10:30:00Z',
            arrivalDate: '2024-01-15T13:45:00Z'
          }
        }]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      });

      const result = await getFlightPrice('DUB', 'BCN', dublinAirport, barcelonaAirport);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        price: 90, // Rounded
        currency: 'EUR',
        estimated: false,
        flightNumber: 'FR5678',
        departureTime: '2024-01-15T10:30:00Z',
        arrivalTime: '2024-01-15T13:45:00Z',
        note: 'Live price from Ryanair API'
      });
      expect(result?.lastUpdated).toBeGreaterThan(Date.now() - 1000);
    });

    it('should retry API calls with exponential backoff on failure', async () => {
      // Mock first 2 calls to fail, third to succeed
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            fares: [{
              outbound: {
                price: { value: 55.00, currencyCode: 'EUR' },
                flightNumber: 'FR9999'
              }
            }]
          })
        });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result?.price).toBe(55);
      expect(result?.estimated).toBe(false);
    });

    it('should fallback to distance-based estimation when API fails completely', async () => {
      // Mock all API calls to fail
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(result?.estimated).toBe(true);
      expect(result?.price).toBeGreaterThan(0);
      expect(result?.currency).toBe('EUR');
      expect(result?.note).toBe('Estimated price based on route distance');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch real price for DUB -> STN'),
        expect.any(Error)
      );
    }, 10000);

    it('should return null when API fails and no airports provided for estimation', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const result = await getFlightPrice('DUB', 'STN');

      expect(result).toBeNull();
    }, 10000);

    it('should handle API response with no fares', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ fares: [] })
      });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true); // Should fallback to estimation
      expect(result?.price).toBeGreaterThan(0);
    }, 10000);

    it('should handle API response with invalid data structure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' })
      });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true); // Should fallback to estimation
    });

    it('should handle HTTP error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true); // Should fallback to estimation
      expect(fetch).toHaveBeenCalledTimes(4); // Should retry
    }, 10000);

    it('should generate consistent estimated prices for same route', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const result1 = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      clearAllCache(); // Clear cache to force regeneration
      const result2 = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result1?.price).toBe(result2?.price);
      expect(result1?.flightNumber).toBe(result2?.flightNumber);
    }, 20000);

    it('should generate different prices for different distances', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      // Short route
      const shortResult = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      
      // Long route  
      const longResult = await getFlightPrice('DUB', 'BCN', dublinAirport, barcelonaAirport);

      expect(shortResult?.price).not.toBe(longResult?.price);
      expect(shortResult?.estimated).toBe(true);
      expect(longResult?.estimated).toBe(true);
    }, 20000);
  });

  describe('Cache Management', () => {
    it('should expire cached prices after TTL', async () => {
      // Mock a successful API response
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' },
              flightNumber: 'FR1234'
            }
          }]
        })
      });

      // First call
      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Mock time passing (31 minutes)
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 31 * 60 * 1000);

      // Second call should fetch again due to expired cache
      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      expect(fetch).toHaveBeenCalledTimes(2);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should clear expired cache entries', async () => {
      // Add some cached entries
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      await getFlightPrice('STN', 'BCN', londonAirport, barcelonaAirport);

      let stats = getCacheStats();
      expect(stats.size).toBe(2);

      // Mock time passing
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 31 * 60 * 1000);

      clearExpiredCache();

      stats = getCacheStats();
      expect(stats.size).toBe(0);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should provide cache statistics', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      await getFlightPrice('STN', 'BCN', londonAirport, barcelonaAirport);

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toContain('DUB-STN');
      expect(stats.entries).toContain('STN-BCN');
    });

    it('should clear all cache entries', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      
      let stats = getCacheStats();
      expect(stats.size).toBe(1);

      clearAllCache();

      stats = getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('preloadPrices', () => {
    it('should preload prices for multiple routes in batches', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      const routes = [
        { fromCode: 'DUB', toCode: 'STN', fromAirport: dublinAirport, toAirport: londonAirport },
        { fromCode: 'STN', toCode: 'BCN', fromAirport: londonAirport, toAirport: barcelonaAirport },
        { fromCode: 'BCN', toCode: 'DUB', fromAirport: barcelonaAirport, toAirport: dublinAirport }
      ];

      const results = await preloadPrices(routes);

      expect(results.size).toBe(3);
      expect(results.get('DUB-STN')).toBeTruthy();
      expect(results.get('STN-BCN')).toBeTruthy();
      expect(results.get('BCN-DUB')).toBeTruthy();
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle errors during preloading gracefully', async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            fares: [{
              outbound: {
                price: { value: 45.99, currencyCode: 'EUR' }
              }
            }]
          })
        })
        .mockRejectedValue(new Error('API error'));

      const routes = [
        { fromCode: 'DUB', toCode: 'STN', fromAirport: dublinAirport, toAirport: londonAirport },
        { fromCode: 'STN', toCode: 'BCN', fromAirport: londonAirport, toAirport: barcelonaAirport }
      ];

      const results = await preloadPrices(routes);

      expect(results.size).toBe(2);
      expect(results.get('DUB-STN')).toBeTruthy();
      expect(results.get('STN-BCN')).toBeTruthy(); // Should fallback to estimation
      // The error is logged by fetchRealFlightPrice, not preloadPrices
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching real flight price:'),
        expect.any(Error)
      );
    });

    it('should process routes in batches with delays', async () => {
      const startTime = Date.now();
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      // Create 7 routes to test batching (batch size is 5)
      const routes = Array.from({ length: 7 }, (_, i) => ({
        fromCode: 'DUB',
        toCode: `ST${i}`,
        fromAirport: dublinAirport,
        toAirport: londonAirport
      }));

      await preloadPrices(routes);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have taken at least 50ms due to batch delay
      expect(duration).toBeGreaterThan(40);
      expect(fetch).toHaveBeenCalledTimes(7);
    });
  });

  describe('Distance-based Price Estimation', () => {
    beforeEach(() => {
      // Mock API to always fail so we test estimation
      (fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));
    });

    it('should generate appropriate price ranges based on distance', async () => {
      // Test short haul (< 500km) - should be €25-60
      const shortResult = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      expect(shortResult?.price).toBeGreaterThanOrEqual(25);
      expect(shortResult?.price).toBeLessThanOrEqual(60);

      // Test medium haul (500-1000km) - should be €40-85  
      const mediumAirport: Airport = {
        code: 'AMS',
        name: 'Amsterdam Airport',
        city: 'Amsterdam', 
        country: 'Netherlands',
        lat: 52.3105,
        lng: 4.7683
      };
      const mediumResult = await getFlightPrice('DUB', 'AMS', dublinAirport, mediumAirport);
      expect(mediumResult?.price).toBeGreaterThanOrEqual(40);
      expect(mediumResult?.price).toBeLessThanOrEqual(85);

      // Test long haul (1000-2000km) - should be €60-130
      const longResult = await getFlightPrice('DUB', 'BCN', dublinAirport, barcelonaAirport);
      expect(longResult?.price).toBeGreaterThanOrEqual(60);
      expect(longResult?.price).toBeLessThanOrEqual(130);
    }, 20000);

    it('should generate realistic flight details for estimated prices', async () => {
      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.flightNumber).toMatch(/^FR\d{4}$/);
      expect(result?.departureTime).toBeTruthy();
      expect(result?.arrivalTime).toBeTruthy();
      expect(result?.currency).toBe('EUR');
      expect(result?.estimated).toBe(true);
      expect(result?.note).toBe('Estimated price based on route distance');

      // Verify departure and arrival times are logical
      const departure = new Date(result!.departureTime!);
      const arrival = new Date(result!.arrivalTime!);
      expect(arrival.getTime()).toBeGreaterThan(departure.getTime());
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 50)
        )
      );

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true);
      expect(consoleSpy.warn).toHaveBeenCalled();
    }, 10000);

    it('should handle malformed JSON responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true);
    }, 10000);

    it('should handle missing price data in API response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              // Missing price field
              flightNumber: 'FR1234'
            }
          }]
        })
      });

      const result = await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);

      expect(result?.estimated).toBe(true);
    }, 10000);
  });

  describe('Utility Functions', () => {
    it('should get cached price without API call', async () => {
      // First populate cache
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          fares: [{
            outbound: {
              price: { value: 45.99, currencyCode: 'EUR' }
            }
          }]
        })
      });

      await getFlightPrice('DUB', 'STN', dublinAirport, londonAirport);
      
      // Now get from cache without API call
      const { getCachedPrice } = await import('../apiService');
      const cachedResult = getCachedPrice('DUB', 'STN');
      
      expect(cachedResult).toBeTruthy();
      expect(cachedResult?.price).toBe(46);
      expect(cachedResult?.estimated).toBe(false);
    });

    it('should check if route has cached price', async () => {
      const { hasCachedPrice, setCachedPrice } = await import('../apiService');
      
      expect(hasCachedPrice('DUB', 'STN')).toBe(false);
      
      setCachedPrice('DUB', 'STN', {
        price: 50,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false
      });
      
      expect(hasCachedPrice('DUB', 'STN')).toBe(true);
    });

    it('should manually set cache entry', async () => {
      const { setCachedPrice, getCachedPrice } = await import('../apiService');
      
      const testPrice: FlightPrice = {
        price: 75,
        currency: 'EUR',
        lastUpdated: Date.now(),
        estimated: false,
        flightNumber: 'FR1234',
        note: 'Test price'
      };
      
      setCachedPrice('TEST', 'ROUTE', testPrice);
      const retrieved = getCachedPrice('TEST', 'ROUTE');
      
      expect(retrieved).toEqual(testPrice);
    });

    it('should return null for expired cached price', async () => {
      const { setCachedPrice, getCachedPrice } = await import('../apiService');
      
      // Set price with old timestamp
      const expiredPrice: FlightPrice = {
        price: 75,
        currency: 'EUR',
        lastUpdated: Date.now() - (31 * 60 * 1000), // 31 minutes ago
        estimated: false
      };
      
      setCachedPrice('OLD', 'ROUTE', expiredPrice);
      const retrieved = getCachedPrice('OLD', 'ROUTE');
      
      expect(retrieved).toBeNull();
    });

    it('should get cache hit rate statistics', async () => {
      const { getCacheHitRate } = await import('../apiService');
      
      const stats = getCacheHitRate();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });
});