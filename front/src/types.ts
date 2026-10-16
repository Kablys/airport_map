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

/** Origin IATA → destination IATAs, after applying the airline filter. */
export type Routes = Record<string, string[]>;

/** Origin IATA → destination IATA → codes of airlines flying that route directly. */
export type RouteNetwork = Record<string, Record<string, string[]>>;

/** Display config from data/airlines.toml. */
export interface Airline {
  code: string;
  name: string;
  colors: { primary: string; secondary: string };
}

export interface FlightPriceData {
  price: number;
  currency: string;
  estimated: boolean;
}

/** Cheapest bookable fare for a route on one day. Times are local ISO strings. */
export interface DayFare {
  date: string;
  price: number;
  currency: string;
  departure: string;
  arrival: string;
}

/** Live fare for an itinerary leg; `date` is the day it was looked up for. */
export type LiveFare = { date: string } & (
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'found'; fare: DayFare | undefined; cheaperNearby: DayFare | undefined }
);

export interface PriceRange {
  min: number;
  max: number;
}

interface ItineraryStep {
  from: Airport;
  to: Airport;
  /** Nights at `to` before the next leg. */
  nights: number;
  /** Travel day (YYYY-MM-DD), set when the trip has a start date. */
  date?: string;
}

export interface ItinerarySegment extends ItineraryStep {
  type: 'flight';
  liveFare?: LiveFare;
  priceData: FlightPriceData;
  airlines: Airline[];
  /** Kilometers */
  distance: number;
  line: L.Polyline;
}

/** Two consecutive stops without a direct flight between them. */
interface ItineraryGap extends ItineraryStep {
  type: 'gap';
}

export type ItineraryItem = ItinerarySegment | ItineraryGap;
