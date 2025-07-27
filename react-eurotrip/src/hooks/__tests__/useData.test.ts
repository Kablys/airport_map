import { renderHook, waitFor } from '@testing-library/react';
import { useAllData, useAirports, useRoutes } from '../useData';
import { dataService } from '../../services/dataService';
import { Airport, Routes } from '../../types';

// Mock the dataService
jest.mock('../../services/dataService');

const mockDataService = dataService as jest.Mocked<typeof dataService>;

describe('useData hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useAirports', () => {
    it('should load airports successfully', async () => {
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

      mockDataService.getAirports.mockResolvedValue(mockAirports);

      const { result } = renderHook(() => useAirports());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockAirports);
      expect(result.current.error).toBeNull();
      expect(mockDataService.getAirports).toHaveBeenCalledTimes(1);
    });

    it('should handle errors', async () => {
      const errorMessage = 'Failed to load airports';
      mockDataService.getAirports.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAirports());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('useRoutes', () => {
    it('should load routes successfully', async () => {
      const mockRoutes: Routes = {
        'DUB': ['STN', 'BCN'],
        'STN': ['DUB']
      };

      mockDataService.getRoutes.mockResolvedValue(mockRoutes);

      const { result } = renderHook(() => useRoutes());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockRoutes);
      expect(result.current.error).toBeNull();
      expect(mockDataService.getRoutes).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAllData', () => {
    it('should load all data successfully', async () => {
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

      mockDataService.getAllData.mockResolvedValue({
        airports: mockAirports,
        routes: mockRoutes
      });

      const { result } = renderHook(() => useAllData());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.airports).toBeNull();
      expect(result.current.routes).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.airports).toEqual(mockAirports);
      expect(result.current.routes).toEqual(mockRoutes);
      expect(result.current.error).toBeNull();
      expect(mockDataService.getAllData).toHaveBeenCalledTimes(1);
    });

    it('should handle refetch', async () => {
      const mockData = {
        airports: [] as Airport[],
        routes: {} as Routes
      };

      mockDataService.getAllData.mockResolvedValue(mockData);
      mockDataService.clearCache.mockImplementation(() => {});

      const { result } = renderHook(() => useAllData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call refetch
      await result.current.refetch();

      expect(mockDataService.clearCache).toHaveBeenCalledTimes(1);
      expect(mockDataService.getAllData).toHaveBeenCalledTimes(2);
    });

    it('should handle errors', async () => {
      const errorMessage = 'Failed to load application data';
      mockDataService.getAllData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAllData());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.airports).toBeNull();
      expect(result.current.routes).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });
});