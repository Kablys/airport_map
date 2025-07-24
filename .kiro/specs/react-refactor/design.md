# Design Document

## Overview

This design document outlines the architecture for refactoring the Eurotrip Planner from vanilla JavaScript to a modern React application with Tailwind CSS. The design maintains all existing functionality while introducing component-based architecture, improved state management, and enhanced developer experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   App Component │  │  Context Layer  │  │   Hooks     │ │
│  │                 │  │                 │  │             │ │
│  │ - Layout        │  │ - MapContext    │  │ - useApi    │ │
│  │ - Routing       │  │ - AppContext    │  │ - useMap    │ │
│  │ - Error Bounds  │  │ - ErrorContext  │  │ - useCache  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Component Layer                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │   Header    │ │     Map     │ │   Sidebar   │ │ Popups ││
│  │ Component   │ │ Component   │ │ Component   │ │        ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │ API Service │ │ Map Service │ │Cache Service│ │ Utils  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
├─────────────────────────────────────────────────────────────┤
│                   External Libraries                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │   Leaflet   │ │  Tailwind   │ │    Vite     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: React 18+ with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS for utility-first styling
- **Map Library**: React-Leaflet for React integration with Leaflet
- **State Management**: React Context API with custom hooks
- **HTTP Client**: Fetch API with custom service layer
- **Testing**: Jest + React Testing Library
- **Type Safety**: TypeScript (optional, can be added incrementally)

## Components and Interfaces

### Component Hierarchy

```
App
├── ErrorBoundary
├── AppProvider (Context)
│   ├── Header
│   │   ├── Title
│   │   └── SearchBar
│   ├── MapContainer
│   │   ├── LeafletMap
│   │   ├── AirportMarkers
│   │   ├── RouteLines
│   │   ├── PriceLabels
│   │   └── MapPopups
│   ├── Sidebar
│   │   ├── StatsPanel
│   │   ├── PriceRangeDisplay
│   │   └── AirportInfo
│   └── LoadingOverlay
└── ErrorFallback
```

### Core Components

#### App Component
```typescript
interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="h-screen w-full relative">
          <Header />
          <MapContainer />
          <Sidebar />
          <LoadingOverlay />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
};
```

#### Header Component
```typescript
interface HeaderProps {}

const Header: React.FC<HeaderProps> = () => {
  return (
    <div className="absolute top-2.5 left-2.5 z-[1000] bg-white/90 p-4 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-ryanair-blue mb-1">
        🛫 Ryanair European Airports
      </h1>
      <p className="text-sm text-gray-600 mb-0">
        Interactive map of airports served by Ryanair across Europe
      </p>
      <SearchBar />
    </div>
  );
};
```

#### MapContainer Component
```typescript
interface MapContainerProps {}

const MapContainer: React.FC<MapContainerProps> = () => {
  const { mapRef, isLoading } = useMap();
  
  return (
    <div className="h-screen w-full">
      <MapContainer
        center={[50.0, 10.0]}
        zoom={4}
        className="h-full w-full"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />
        <AirportMarkers />
        <RouteLines />
        <PriceLabels />
      </MapContainer>
    </div>
  );
};
```

#### AirportMarkers Component
```typescript
interface AirportMarkersProps {}

const AirportMarkers: React.FC<AirportMarkersProps> = () => {
  const { airports, selectedAirport, onAirportClick } = useAppContext();
  const { connectedAirports } = useMap();
  
  return (
    <>
      {airports.map((airport) => (
        <AirportMarker
          key={airport.code}
          airport={airport}
          isSelected={selectedAirport?.code === airport.code}
          isConnected={connectedAirports.has(airport.code)}
          onClick={() => onAirportClick(airport)}
        />
      ))}
    </>
  );
};
```

### Custom Hooks

#### useAppContext Hook
```typescript
interface AppContextType {
  airports: Airport[];
  routes: Routes;
  selectedAirport: Airport | null;
  isLoading: boolean;
  error: string | null;
  onAirportClick: (airport: Airport) => void;
  clearSelection: () => void;
}

const useAppContext = (): AppContextType => {
  // Implementation details
};
```

#### useApi Hook
```typescript
interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const useApi = <T>(
  fetcher: () => Promise<T>,
  dependencies: any[] = []
): UseApiReturn<T> => {
  // Implementation with caching and error handling
};
```

#### useMap Hook
```typescript
interface UseMapReturn {
  mapRef: React.RefObject<L.Map>;
  showRoutes: (airportCode: string) => Promise<void>;
  clearRoutes: () => void;
  connectedAirports: Set<string>;
  priceRange: { min: number; max: number } | null;
}

const useMap = (): UseMapReturn => {
  // Map-specific logic and state management
};
```

## Data Models

### Airport Interface
```typescript
interface Airport {
  code: string;        // IATA code (e.g., "DUB")
  name: string;        // Full airport name
  city: string;        // City name
  country: string;     // Country name
  lat: number;         // Latitude
  lng: number;         // Longitude
}
```

### Route Interface
```typescript
interface Routes {
  [airportCode: string]: string[]; // Airport code -> array of destination codes
}
```

### Flight Price Interface
```typescript
interface FlightPrice {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  note?: string;
}
```

### Route Line Interface
```typescript
interface RouteLine {
  id: string;
  source: Airport;
  destination: Airport;
  price: FlightPrice | null;
  distance: number;
  color: string;
}
```

## Error Handling

### Error Boundary Implementation
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  // Error boundary implementation with fallback UI
}
```

### API Error Handling Strategy
1. **Network Errors**: Retry mechanism with exponential backoff
2. **API Rate Limiting**: Graceful degradation to cached/estimated data
3. **Data Loading Errors**: User-friendly error messages with retry options
4. **Map Loading Errors**: Fallback to basic map without enhanced features

### Error Context
```typescript
interface ErrorContextType {
  errors: AppError[];
  addError: (error: AppError) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

interface AppError {
  id: string;
  type: 'api' | 'map' | 'data' | 'network';
  message: string;
  timestamp: number;
  retryable: boolean;
}
```

## Testing Strategy

### Unit Testing Approach
- **Components**: Test rendering, props handling, and user interactions
- **Hooks**: Test state management, side effects, and return values
- **Services**: Test API calls, data transformation, and error handling
- **Utils**: Test pure functions and calculations

### Integration Testing
- **Map Integration**: Test Leaflet integration and marker interactions
- **API Integration**: Test real API calls with mocked responses
- **Context Integration**: Test data flow between components
- **Route Visualization**: Test route line rendering and price display

### Testing Tools Configuration
```typescript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
  ],
};
```

### Mock Strategy
- **Leaflet**: Mock map instance and marker methods
- **API Calls**: Mock fetch with MSW (Mock Service Worker)
- **Context**: Provide test context wrappers
- **Local Storage**: Mock browser APIs

## Performance Optimizations

### React Optimizations
1. **React.memo**: Memoize expensive components (AirportMarker, RouteLines)
2. **useMemo**: Cache expensive calculations (distance, price colors)
3. **useCallback**: Stabilize event handlers and API calls
4. **Code Splitting**: Lazy load non-critical components

### Map Performance
1. **Marker Clustering**: Group nearby airports at low zoom levels
2. **Virtualization**: Only render visible route lines
3. **Debounced Updates**: Throttle map interaction handlers
4. **Canvas Rendering**: Use canvas for large numbers of route lines

### API Performance
1. **Request Caching**: Cache API responses with TTL
2. **Request Batching**: Batch multiple price requests
3. **Debounced Requests**: Prevent rapid-fire API calls
4. **Background Updates**: Refresh cached data in background

### Bundle Optimization
1. **Tree Shaking**: Remove unused code from bundles
2. **Code Splitting**: Split by routes and features
3. **Asset Optimization**: Optimize images and static assets
4. **Lazy Loading**: Load components and data on demand

## Migration Strategy

### Phase 1: Project Setup
1. Initialize Vite + React + TypeScript project
2. Configure Tailwind CSS with custom Ryanair colors
3. Set up React-Leaflet integration
4. Migrate static data files (airports.json, routes.json)

### Phase 2: Core Components
1. Create basic App structure and routing
2. Implement Header and Sidebar components
3. Set up MapContainer with basic Leaflet integration
4. Migrate airport marker rendering

### Phase 3: Interactive Features
1. Implement airport selection and route visualization
2. Migrate API integration for flight pricing
3. Add route lines and price labels
4. Implement popup functionality

### Phase 4: State Management
1. Set up Context providers for global state
2. Implement custom hooks for API and map logic
3. Add error handling and loading states
4. Optimize performance with memoization

### Phase 5: Testing & Polish
1. Add comprehensive test suite
2. Implement error boundaries and fallbacks
3. Add accessibility improvements
4. Performance optimization and bundle analysis

## Tailwind Configuration

### Custom Theme Extension
```javascript
// tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ryanair-blue': '#003d82',
        'ryanair-yellow': '#ffcc00',
        'price-green': '#00cc44',
        'price-orange': '#ff8800',
        'price-red': '#ff0066',
      },
      animation: {
        'marker-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'route-draw': 'draw 0.5s ease-in-out',
      },
      zIndex: {
        'map': '400',
        'markers': '500',
        'routes': '450',
        'popups': '600',
        'controls': '1000',
      }
    },
  },
  plugins: [],
};
```

This design provides a solid foundation for migrating the vanilla JavaScript application to React while maintaining all existing functionality and improving the overall architecture, maintainability, and user experience.