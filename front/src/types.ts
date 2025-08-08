// Leaflet is provided globally via CDN
// Declare the global type so we can reference Leaflet types without an npm import
declare const L: typeof import('leaflet');

export interface FlightPriceData {
  // Core fields we actually use in the UI
  price: number;
  currency?: string;
  lastUpdated?: string | number | Date;

  // Optional metadata from APIs or stubs
  destination?: string;
  origin?: string;
  airline?: string;
  short_airline?: string;
  estimated?: boolean;
  flightNumber?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  aircraft?: string;
  note?: string;
}

export interface ItinerarySegment {
  type: "flight";
  from: Airport;
  to: Airport;
  // Price information as fetched from the API
  priceData?: FlightPriceData | null;
  // Distance in kilometers
  distance: number;
  // Leaflet polyline for the rendered segment (when present)
  line?: L.Polyline | null;
}

export interface ItineraryGap {
  type: "gap";
  lastAirport: Airport;
  nextAirport: Airport;
}

export type ItineraryItem = ItinerarySegment | ItineraryGap;

export interface LeafletMap extends L.Map {
  // You can add any custom properties or methods here if needed
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
}

export interface Routes {
  [airportCode: string]: string[];
}