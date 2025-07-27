import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useAppContext, useAppState, useAppSelectors } from '../useAppContext';
import { AppProvider } from '../../contexts/AppContext';
import { Airport, AppError } from '../../types';

// Mock data
const mockAirports: Airport[] = [
  {
    code: 'DUB',
    name: 'Dublin Airport',
    city: 'Dublin',
    country: 'Ireland',
    lat: 53.4213,
    lng: -6.2701,
  },
  {
    code: 'LHR',
    name: 'London Heathrow',
    city: 'London',
    country: 'United Kingdom',
    lat: 51.4700,
    lng: -0.4543,
  },
];

const mockRoutes = {
  DUB: ['LHR', 'CDG'],
  LHR: ['DUB', 'MAD'],
};

const mockError: AppError = {
  id: 'test-error',
  type: 'api',
  message: 'Test error message',
  timestamp: Date.now(),
  retryable: true,
};

describe('useAppContext', () => {
  it('provides context when used within AppProvider', () => {
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AppProvider,
    });

    expect(result.current).toBeDefined();
    expect(result.current.state).toBeDefined();
    expect(result.current.dispatch).toBeDefined();
    expect(result.current.setAirports).toBeDefined();
    expect(result.current.setRoutes).toBeDefined();
    expect(result.current.selectAirport).toBeDefined();
    expect(result.current.setLoading).toBeDefined();
    expect(result.current.addError).toBeDefined();
    expect(result.current.removeError).toBeDefined();
    expect(result.current.clearErrors).toBeDefined();
    expect(result.current.resetState).toBeDefined();
  });

  it('provides initial state correctly', () => {
    const { result } = renderHook(() => useAppContext(), {
      wrapper: AppProvider,
    });

    expect(result.current.state.airports).toEqual([]);
    expect(result.current.state.routes).toEqual({});
    expect(result.current.state.selectedAirport).toBeNull();
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.errors).toEqual([]);
  });
});

describe('useAppState', () => {
  it('returns only the state portion', () => {
    const { result } = renderHook(() => useAppState(), {
      wrapper: AppProvider,
    });

    expect(result.current.airports).toEqual([]);
    expect(result.current.routes).toEqual({});
    expect(result.current.selectedAirport).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.errors).toEqual([]);
  });
});

describe('useAppSelectors', () => {
  it('returns commonly used state values', () => {
    const { result } = renderHook(() => useAppSelectors(), {
      wrapper: AppProvider,
    });

    expect(result.current.airports).toEqual([]);
    expect(result.current.routes).toEqual({});
    expect(result.current.selectedAirport).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasErrors).toBe(false);
    expect(result.current.errors).toEqual([]);
  });

  it('correctly calculates hasErrors', () => {
    const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <AppProvider>{children}</AppProvider>
    );

    const { result, rerender } = renderHook(() => {
      const context = useAppContext();
      const selectors = useAppSelectors();
      return { context, selectors };
    }, {
      wrapper: TestWrapper,
    });

    // Initially no errors
    expect(result.current.selectors.hasErrors).toBe(false);

    // Add an error
    act(() => {
      result.current.context.addError(mockError);
    });

    // Rerender to get updated state
    rerender();

    // Should now have errors
    expect(result.current.selectors.hasErrors).toBe(true);
    expect(result.current.selectors.errors).toHaveLength(1);
  });
});