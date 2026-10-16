import type L from 'leaflet';

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
}

export type Routes = Record<string, string[]>;

export interface FlightPriceData {
  price: number;
  currency: string;
  estimated: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface ItinerarySegment {
  type: 'flight';
  from: Airport;
  to: Airport;
  priceData: FlightPriceData;
  /** Kilometers */
  distance: number;
  line: L.Polyline;
}

/** Two consecutive stops without a direct flight between them. */
interface ItineraryGap {
  type: 'gap';
  from: Airport;
  to: Airport;
}

export type ItineraryItem = ItinerarySegment | ItineraryGap;
