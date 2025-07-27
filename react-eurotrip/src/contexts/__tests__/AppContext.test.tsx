import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AppProvider } from '../AppContext';
import { useAppContext } from '../../hooks/useAppContext';
import { Airport, AppError } from '../../types';

// Test component to interact with the context
const TestComponent: React.FC = () => {
  const { state, setAirports, selectAirport, setLoading, addError } = useAppContext();

  const handleAddAirport = () => {
    const testAirport: Airport = {
      code: 'DUB',
      name: 'Dublin Airport',
      city: 'Dublin',
      country: 'Ireland',
      lat: 53.4213,
      lng: -6.2701,
    };
    setAirports([testAirport]);
  };

  const handleSelectAirport = () => {
    if (state.airports.length > 0) {
      selectAirport(state.airports[0]);
    }
  };

  const handleSetLoading = () => {
    setLoading(true);
  };

  const handleAddError = () => {
    const testError: AppError = {
      id: 'test-error',
      type: 'api',
      message: 'Test error message',
      timestamp: Date.now(),
      retryable: true,
    };
    addError(testError);
  };

  return (
    <div>
      <div data-testid="airports-count">{state.airports.length}</div>
      <div data-testid="selected-airport">
        {state.selectedAirport ? state.selectedAirport.code : 'none'}
      </div>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="errors-count">{state.errors.length}</div>
      
      <button onClick={handleAddAirport} data-testid="add-airport">
        Add Airport
      </button>
      <button onClick={handleSelectAirport} data-testid="select-airport">
        Select Airport
      </button>
      <button onClick={handleSetLoading} data-testid="set-loading">
        Set Loading
      </button>
      <button onClick={handleAddError} data-testid="add-error">
        Add Error
      </button>
    </div>
  );
};

describe('AppContext', () => {
  it('provides initial state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    expect(screen.getByTestId('airports-count')).toHaveTextContent('0');
    expect(screen.getByTestId('selected-airport')).toHaveTextContent('none');
    expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    expect(screen.getByTestId('errors-count')).toHaveTextContent('0');
  });

  it('updates airports state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('add-airport').click();
    });

    expect(screen.getByTestId('airports-count')).toHaveTextContent('1');
  });

  it('updates selected airport state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('add-airport').click();
    });

    act(() => {
      screen.getByTestId('select-airport').click();
    });

    expect(screen.getByTestId('selected-airport')).toHaveTextContent('DUB');
  });

  it('updates loading state correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('set-loading').click();
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('loading');
  });

  it('manages errors correctly', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    act(() => {
      screen.getByTestId('add-error').click();
    });

    expect(screen.getByTestId('errors-count')).toHaveTextContent('1');
  });
});

// Test component that throws an error
const ErrorThrowingComponent: React.FC = () => {
  throw new Error('Test error');
};

describe('useAppContext hook', () => {
  it('throws error when used outside AppProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAppContext must be used within an AppProvider');

    console.error = originalError;
  });
});