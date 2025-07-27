import { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

/**
 * Custom hook to access the AppContext
 * Provides type-safe access to global application state and actions
 */
export const useAppContext = () => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  
  return context;
};

/**
 * Custom hook to access only the state portion of AppContext
 * Useful when you only need to read state without actions
 */
export const useAppState = () => {
  const context = useAppContext();
  return context.state;
};

/**
 * Custom hook that provides commonly used state selectors
 * Includes computed values like hasErrors for convenience
 */
export const useAppSelectors = () => {
  const state = useAppState();
  
  return {
    airports: state.airports,
    routes: state.routes,
    selectedAirport: state.selectedAirport,
    isLoading: state.isLoading,
    errors: state.errors,
    hasErrors: state.errors.length > 0,
  };
};