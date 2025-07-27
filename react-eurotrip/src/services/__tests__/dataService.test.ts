import { dataService, validateAirport, validateRoutes } from '../dataService';
import { Airport, Routes } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('DataService', () => {
  beforeEach(() => {
    // Clear cache before each test
    dataService.clearCache();
    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('validateAirport', () => {
    it('should validate correct airport object', () => {
      const validAirport = {
        code: 'DUB',
        name: 'Dublin',
        city: 'Dublin',
        country: 'Ireland',
        lat: 53.4213,
        lng: -6.2701
      };

      expect(validateAirport(validAirport)).toBe(true);
    });

    it('should reject invalid airport object', () => {
      const invalidAirport = {
        code: 'DUB',
        name: 'Dublin',
        // missing required fields
      };

      expect(validateAirport(invalidAirport)).toBe(false);
    });
  });

  describe('validateRoutes', () => {
    it('should validate correct routes object', () => {
      const validRoutes = {
        'DUB': ['STN', 'BCN', 'MAD'],
        'STN': ['DUB', 'BCN']
      };

      expect(validateRoutes(validRoutes)).toBe(true);
    });

    it('should reject invalid routes object', () => {
      const invalidRoutes = {
        'DUB': 'not-an-array'
      };

      expect(validateRoutes(invalidRoutes)).toBe(false);
    });
  });

  describe('getAirports', () => {
    it('should fetch and cache airports data', async () => {
      const mockAirports: Airport[] = [
        {
          code: 'DUB',
          name: 'Dublin',
          city: 'Dublin',
          country: 'Ireland',
          lat: 53.4213,
          lng: -6.2701
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAirports
      });

      const airports = await dataService.getAirports();
      
      expect(fetch).toHaveBeenCalledWith('/data/airports.json');
      expect(airports).toEqual(mockAirports);
      
      // Should use cache on second call
      const airportsSecondCall = await dataService.getAirports();
      expect(fetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(airportsSecondCall).toEqual(mockAirports);
    });

    it('should handle fetch errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(dataService.getAirports()).rejects.toThrow('Failed to fetch data from /data/airports.json: Network error');
    });

    it('should handle HTTP errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(dataService.getAirports()).rejects.toThrow('Failed to fetch data from /data/airports.json: HTTP error! status: 404');
    });
  });

  describe('getRoutes', () => {
    it('should fetch and cache routes data', async () => {
      const mockRoutes: Routes = {
        'DUB': ['STN', 'BCN'],
        'STN': ['DUB']
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRoutes
      });

      const routes = await dataService.getRoutes();
      
      expect(fetch).toHaveBeenCalledWith('/data/routes.json');
      expect(routes).toEqual(mockRoutes);
    });
  });

  describe('getAllData', () => {
    it('should fetch both airports and routes', async () => {
      const mockAirports: Airport[] = [
        {
          code: 'DUB',
          name: 'Dublin',
          city: 'Dublin',
          country: 'Ireland',
          lat: 53.4213,
          lng: -6.2701
        }
      ];

      const mockRoutes: Routes = {
        'DUB': ['STN']
      };

      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAirports
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRoutes
        });

      const data = await dataService.getAllData();
      
      expect(data.airports).toEqual(mockAirports);
      expect(data.routes).toEqual(mockRoutes);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache management', () => {
    it('should clear cache correctly', async () => {
      const mockAirports: Airport[] = [
        {
          code: 'DUB',
          name: 'Dublin',
          city: 'Dublin',
          country: 'Ireland',
          lat: 53.4213,
          lng: -6.2701
        }
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAirports
      });

      // Load data to populate cache
      await dataService.getAirports();
      expect(dataService.getCachedAirports()).toEqual(mockAirports);

      // Clear cache
      dataService.clearCache();
      expect(dataService.getCachedAirports()).toBeNull();
    });
  });
});