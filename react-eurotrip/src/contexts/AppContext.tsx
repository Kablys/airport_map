import React, { createContext, useReducer, ReactNode, useEffect } from 'react';
import { Airport, Routes, AppError } from '../types';
import { dataService } from '../services/dataService';

// Define the shape of our global state
interface AppState {
  airports: Airport[];
  routes: Routes;
  selectedAirport: Airport | null;
  isLoading: boolean;
  errors: AppError[];
}

// Define action types for state updates
type AppAction =
  | { type: 'SET_AIRPORTS'; payload: Airport[] }
  | { type: 'SET_ROUTES'; payload: Routes }
  | { type: 'SET_SELECTED_AIRPORT'; payload: Airport | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_ERROR'; payload: AppError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'RESET_STATE' };

// Define the context type
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience methods
  setAirports: (airports: Airport[]) => void;
  setRoutes: (routes: Routes) => void;
  selectAirport: (airport: Airport | null) => void;
  setLoading: (loading: boolean) => void;
  addError: (error: AppError) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  resetState: () => void;
}

// Initial state
const initialState: AppState = {
  airports: [],
  routes: {},
  selectedAirport: null,
  isLoading: false,
  errors: [],
};

// Reducer function to handle state updates
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_AIRPORTS':
      return { ...state, airports: action.payload };
    case 'SET_ROUTES':
      return { ...state, routes: action.payload };
    case 'SET_SELECTED_AIRPORT':
      return { ...state, selectedAirport: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'ADD_ERROR':
      return { 
        ...state, 
        errors: [...state.errors.filter(e => e.id !== action.payload.id), action.payload] 
      };
    case 'REMOVE_ERROR':
      return { 
        ...state, 
        errors: state.errors.filter(error => error.id !== action.payload) 
      };
    case 'CLEAR_ERRORS':
      return { ...state, errors: [] };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Convenience methods
  const setAirports = (airports: Airport[]) => {
    dispatch({ type: 'SET_AIRPORTS', payload: airports });
  };

  const setRoutes = (routes: Routes) => {
    dispatch({ type: 'SET_ROUTES', payload: routes });
  };

  const selectAirport = (airport: Airport | null) => {
    dispatch({ type: 'SET_SELECTED_AIRPORT', payload: airport });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const addError = (error: AppError) => {
    dispatch({ type: 'ADD_ERROR', payload: error });
  };

  // Load initial data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const data = await dataService.getAllData();
        setAirports(data.airports);
        setRoutes(data.routes);
      } catch (error) {
        addError({
          id: `data-load-${Date.now()}`,
          type: 'data',
          message: error instanceof Error ? error.message : 'Failed to load application data',
          timestamp: Date.now(),
          retryable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const removeError = (errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    setAirports,
    setRoutes,
    selectAirport,
    setLoading,
    addError,
    removeError,
    clearErrors,
    resetState,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export { AppContext };