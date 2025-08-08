import React, { useState, useEffect, useCallback } from 'react';
import type { Airport } from '../main.ts';

// Types from map.ts
interface FlightPriceData {
  price: number;
  currency: string;
  lastUpdated: number;
  estimated: boolean;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  aircraft: string;
  note: string;
}

interface ItinerarySegment {
  type: 'flight';
  from: Airport;
  to: Airport;
  priceData: FlightPriceData | null;
  distance: number;
  line: L.Polyline;
}

interface ItineraryGap {
  type: 'gap';
  lastAirport: Airport;
  nextAirport: Airport;
}

type ItineraryItem = ItinerarySegment | ItineraryGap;

interface ItineraryPanelProps {
  itinerary: ItineraryItem[];
  onClearItinerary: () => void;
  onSegmentHover: (segmentIndex: number, highlight: boolean) => void;
  onSegmentClick: (segment: ItinerarySegment) => void;
}

interface ItineraryTotals {
  totalPrice: number;
  totalDistance: number;
  totalDuration: number;
  flightCount: number;
}

// Helper functions moved from map.ts
function calculateFlightDuration(distance: number): number {
  // Simplified calculation: ~800 km/h average speed + 30 min for takeoff/landing
  return Math.round(distance / 800 * 60 + 30);
}

function formatFlightDuration(minutes: number): { hours: number; minutes: number } {
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60
  };
}

function calculateTotalDuration(totalMinutes: number): { hours: number; minutes: number } {
  return formatFlightDuration(totalMinutes);
}

// React Components
const AirportRow: React.FC<{ airport: Airport; index: number }> = ({ airport, index }) => (
  <div className="itinerary-row">
    <div className="airport-column">
      <div className="airport-code">{airport.code}</div>
    </div>
    <div className="flight-info-column">
      {index === 0 && <div className="departure-label">Departure</div>}
    </div>
  </div>
);

const ConnectionRow: React.FC<{
  connectionType: 'flight' | 'gap' | null;
  connectionInfo: ItinerarySegment | ItineraryGap | null;
  segmentIndex: number;
  onSegmentHover: (segmentIndex: number, highlight: boolean) => void;
  onSegmentClick: (segment: ItinerarySegment) => void;
}> = ({ connectionType, connectionInfo, segmentIndex, onSegmentHover, onSegmentClick }) => {
  if (connectionType === 'flight' && connectionInfo) {
    const segment = connectionInfo as ItinerarySegment;
    const price = segment.priceData?.price || 0;
    const duration = calculateFlightDuration(segment.distance);
    const { hours, minutes } = formatFlightDuration(duration);

    return (
      <div className="itinerary-row flight-connector-row">
        <div className="airport-column">
          <div className="connector-line">|</div>
        </div>
        <div className="flight-info-column">
          <div 
            className="flight-details"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onSegmentHover(segmentIndex, true)}
            onMouseLeave={() => onSegmentHover(segmentIndex, false)}
            onClick={() => onSegmentClick(segment)}
          >
            €{price} • {segment.distance}km • {hours}h {minutes}m
          </div>
        </div>
      </div>
    );
  }

  if (connectionType === 'gap') {
    return (
      <div className="itinerary-row flight-connector-row">
        <div className="airport-column">
          <div className="connector-line gap-connector">⚡</div>
        </div>
        <div className="flight-info-column">
          <div className="gap-details">
            <span className="gap-icon">✈️ ⚡ 🚌</span>
            <span className="gap-text">Alternative transport needed</span>
          </div>
        </div>
      </div>
    );
  }

  // Regular connector line
  return (
    <div className="itinerary-row flight-connector-row">
      <div className="airport-column">
        <div className="connector-line">|</div>
      </div>
      <div className="flight-info-column"></div>
    </div>
  );
};

const ItineraryStats: React.FC<{ totals: ItineraryTotals }> = ({ totals }) => {
  const { hours, minutes } = calculateTotalDuration(totals.totalDuration);

  return (
    <div className="itinerary-totals">
      <div><strong>Total Price:</strong> €{totals.totalPrice}</div>
      <div><strong>Total Distance:</strong> {totals.totalDistance}km</div>
      <div><strong>Total Flight Time:</strong> {hours}h {minutes}m</div>
      <div><strong>Flight Segments:</strong> {totals.flightCount}</div>
    </div>
  );
};

export const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onClearItinerary,
  onSegmentHover,
  onSegmentClick
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Update visibility based on itinerary length
  useEffect(() => {
    setIsVisible(itinerary.length > 0);
  }, [itinerary.length]);

  // Build itinerary structure
  const buildItineraryStructure = useCallback(() => {
    const airports: Airport[] = [];
    const connectionsAfter: ('flight' | 'gap' | null)[] = [];
    const connectionDataAfter: (ItinerarySegment | ItineraryGap | null)[] = [];

    // Collect all unique airports in order
    itinerary.forEach((item) => {
      if (item.type === 'flight') {
        const segment = item as ItinerarySegment;
        addAirportIfNew(airports, segment.from);
        addAirportIfNew(airports, segment.to);
      } else if (item.type === 'gap') {
        const gap = item as ItineraryGap;
        addAirportIfNew(airports, gap.lastAirport);
        addAirportIfNew(airports, gap.nextAirport);
      }
    });

    // Initialize connections arrays
    for (let i = 0; i < airports.length; i++) {
      connectionsAfter.push(null);
      connectionDataAfter.push(null);
    }

    // Fill in the connections based on itinerary items
    itinerary.forEach((item) => {
      const fromIndex = getAirportIndex(airports, item);
      if (fromIndex !== -1) {
        connectionsAfter[fromIndex] = item.type;
        connectionDataAfter[fromIndex] = item;
      }
    });

    return { airports, connectionsAfter, connectionDataAfter };
  }, [itinerary]);

  // Helper functions
  const addAirportIfNew = (airports: Airport[], airport: Airport): void => {
    if (airports.length === 0 || airports[airports.length - 1]?.code !== airport.code) {
      airports.push(airport);
    }
  };

  const getAirportIndex = (airports: Airport[], item: ItineraryItem): number => {
    if (item.type === 'flight') {
      const segment = item as ItinerarySegment;
      return airports.findIndex((airport) => airport.code === segment.from.code);
    } else if (item.type === 'gap') {
      const gap = item as ItineraryGap;
      return airports.findIndex((airport) => airport.code === gap.lastAirport.code);
    }
    return -1;
  };

  // Calculate totals
  const calculateTotals = useCallback((): ItineraryTotals => {
    let totalPrice = 0;
    let totalDistance = 0;
    let totalDuration = 0;
    let flightCount = 0;

    itinerary.forEach((item) => {
      if (item.type === 'flight') {
        const segment = item as ItinerarySegment;
        const price = segment.priceData?.price || 0;
        const duration = calculateFlightDuration(segment.distance);
        totalPrice += price;
        totalDistance += segment.distance;
        totalDuration += duration;
        flightCount++;
      }
    });

    return { totalPrice, totalDistance, totalDuration, flightCount };
  }, [itinerary]);

  if (!isVisible) {
    return null;
  }

  const { airports, connectionsAfter, connectionDataAfter } = buildItineraryStructure();
  const totals = calculateTotals();

  return (
    <div id="itinerary-panel" className="itinerary-panel" style={{ display: 'block' }}>
      <div className="itinerary-header">
        <h4>🛫 Your Itinerary</h4>
        <button 
          className="clear-itinerary-btn" 
          title="Clear itinerary"
          onClick={onClearItinerary}
        >
          ✕
        </button>
      </div>
      
      <div className="itinerary-list">
        <div className="itinerary-vertical">
          {airports.map((airport, index) => {
            const isLast = index === airports.length - 1;
            const connectionType = connectionsAfter[index] || null;
            const connectionInfo = connectionDataAfter[index] || null;
            const segmentIndex = itinerary.findIndex((item) => 
              item.type === 'flight' && (item as ItinerarySegment) === connectionInfo
            );

            return (
              <React.Fragment key={`${airport.code}-${index}`}>
                <AirportRow airport={airport} index={index} />
                {!isLast && (
                  <ConnectionRow
                    connectionType={connectionType}
                    connectionInfo={connectionInfo}
                    segmentIndex={segmentIndex}
                    onSegmentHover={onSegmentHover}
                    onSegmentClick={onSegmentClick}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      <div className="itinerary-stats">
        <ItineraryStats totals={totals} />
      </div>
    </div>
  );
};