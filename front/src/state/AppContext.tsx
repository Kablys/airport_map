import React, { createContext, useContext, useMemo, useReducer } from 'react';
import type { Airport, ItineraryItem, ItinerarySegment } from '../types.ts';

// App state shape
interface AppState {
  selectedAirport: Airport | null;
  itinerary: ItineraryItem[];
}

// Actions
type Action =
  | { type: 'setSelectedAirport'; payload: Airport | null }
  | { type: 'addItinerarySegment'; payload: ItinerarySegment }
  | { type: 'clearItinerary' };

// Initial state
const initialState: AppState = {
  selectedAirport: null,
  itinerary: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setSelectedAirport':
      return { ...state, selectedAirport: action.payload };
    case 'addItinerarySegment':
      return { ...state, itinerary: [...state.itinerary, action.payload] };
    case 'clearItinerary':
      return { ...state, itinerary: [] };
    default:
      return state;
  }
}

interface AppContextValue extends AppState {
  setSelectedAirport: (airport: Airport | null) => void;
  addItinerarySegment: (segment: ItinerarySegment) => void;
  clearItinerary: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<AppContextValue>(() => ({
    ...state,
    setSelectedAirport: (airport) => dispatch({ type: 'setSelectedAirport', payload: airport }),
    addItinerarySegment: (segment) => dispatch({ type: 'addItinerarySegment', payload: segment }),
    clearItinerary: () => dispatch({ type: 'clearItinerary' }),
  }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
