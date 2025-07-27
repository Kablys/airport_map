import { useState, useEffect, useCallback } from 'react';
import { Airport, Routes, ApiResponse } from '../types';
import { dataService } from '../services/dataService';

// Hook for loading airports data
export function useAirports(): ApiResponse<Airport[]> {
  const [data, setData] = useState<Airport[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const airports = await dataService.getAirports();
      setData(airports);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load airports';
      setError(errorMessage);
      console.error('Error loading airports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error };
}

// Hook for loading routes data
export function useRoutes(): ApiResponse<Routes> {
  const [data, setData] = useState<Routes | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const routes = await dataService.getRoutes();
      setData(routes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load routes';
      setError(errorMessage);
      console.error('Error loading routes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error };
}

// Combined hook for loading all data
export function useAllData(): {
  airports: Airport[] | null;
  routes: Routes | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [airports, setAirports] = useState<Airport[] | null>(null);
  const [routes, setRoutes] = useState<Routes | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getAllData();
      setAirports(data.airports);
      setRoutes(data.routes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load application data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    dataService.clearCache();
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { airports, routes, loading, error, refetch };
}

// Generic hook for any async data fetching with retry functionality
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): ApiResponse<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refetch };
}

// Hook for checking if data is cached (useful for optimistic UI)
export function useDataCache(): {
  hasAirportsCache: boolean;
  hasRoutesCache: boolean;
  clearCache: () => void;
} {
  const [hasAirportsCache, setHasAirportsCache] = useState<boolean>(false);
  const [hasRoutesCache, setHasRoutesCache] = useState<boolean>(false);

  const checkCache = useCallback(() => {
    setHasAirportsCache(dataService.getCachedAirports() !== null);
    setHasRoutesCache(dataService.getCachedRoutes() !== null);
  }, []);

  const clearCache = useCallback(() => {
    dataService.clearCache();
    checkCache();
  }, [checkCache]);

  useEffect(() => {
    checkCache();
  }, [checkCache]);

  return { hasAirportsCache, hasRoutesCache, clearCache };
}