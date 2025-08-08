import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Airport } from '../main.ts';
import { FlightPopup } from './FlightPopup.tsx';

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

/**
 * Utility class for integrating React components with Leaflet
 * This provides a clean way to render React components in Leaflet popups
 */
export class ReactLeafletIntegration {
  private static roots = new Map<HTMLElement, any>();

  /**
   * Renders a React FlightPopup component into a DOM element for Leaflet
   * This is the proper way to integrate React with Leaflet popups
   */
  static createFlightPopupElement(
    sourceAirport: Airport,
    destAirport: Airport,
    priceData: FlightPriceData,
    distance: number,
    lineColor: string,
    flightDuration: number
  ): HTMLElement {
    const container = document.createElement('div');
    
    // Create React root and render the component
    const root = createRoot(container);
    
    root.render(
      React.createElement(FlightPopup, {
        sourceAirport,
        destAirport,
        priceData,
        distance,
        lineColor,
        flightDuration
      })
    );
    
    // Store the root for cleanup later
    this.roots.set(container, root);
    
    return container;
  }

  /**
   * Creates a Leaflet popup content string by rendering React component to HTML
   * This is a fallback method for when we need HTML strings
   */
  static createFlightPopupHTML(
    sourceAirport: Airport,
    destAirport: Airport,
    priceData: FlightPriceData,
    distance: number,
    lineColor: string,
    flightDuration: number
  ): string {
    // Create a temporary container
    const tempContainer = document.createElement('div');
    const element = this.createFlightPopupElement(
      sourceAirport,
      destAirport,
      priceData,
      distance,
      lineColor,
      flightDuration
    );
    
    tempContainer.appendChild(element);
    
    // Wait for React to render, then return HTML
    // Note: This is synchronous for now, but could be made async if needed
    setTimeout(() => {
      // Clean up the temporary root
      const root = this.roots.get(element);
      if (root) {
        root.unmount();
        this.roots.delete(element);
      }
    }, 0);
    
    return tempContainer.innerHTML;
  }

  /**
   * Cleanup function to unmount React roots when popups are closed
   */
  static cleanup(container: HTMLElement): void {
    const root = this.roots.get(container);
    if (root) {
      root.unmount();
      this.roots.delete(container);
    }
  }

  /**
   * Cleanup all React roots (useful for app cleanup)
   */
  static cleanupAll(): void {
    this.roots.forEach((root, container) => {
      root.unmount();
    });
    this.roots.clear();
  }
}

// Export a simple function for backward compatibility
export function createFlightPopupContent(
  sourceAirport: Airport,
  destAirport: Airport,
  priceData: FlightPriceData,
  distance: number,
  lineColor: string,
  flightDuration: number
): string {
  return ReactLeafletIntegration.createFlightPopupHTML(
    sourceAirport,
    destAirport,
    priceData,
    distance,
    lineColor,
    flightDuration
  );
}