// Airport data model interface
export interface Airport {
  code: string;        // IATA code (e.g., "DUB")
  name: string;        // Full airport name
  city: string;        // City name
  country: string;     // Country name
  lat: number;         // Latitude
  lng: number;         // Longitude
}

// Routes data model interface - maps airport codes to arrays of destination codes
export interface Routes {
  [airportCode: string]: string[]; // Airport code -> array of destination codes
}

// Flight price data model interface
export interface FlightPrice {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  note?: string;
}

// Route line interface for map visualization
export interface RouteLine {
  id: string;
  source: Airport;
  destination: Airport;
  price: FlightPrice | null;
  distance: number;
  color: string;
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Error types for better error handling
export interface AppError {
  id: string;
  type: 'api' | 'map' | 'data' | 'network';
  message: string;
  timestamp: number;
  retryable: boolean;
}