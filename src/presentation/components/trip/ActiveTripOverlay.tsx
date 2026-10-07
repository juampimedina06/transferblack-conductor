import React from 'react';
import { Trip } from '../../../core/trip/interface/trip.interface';
import { TripInProgressSheet } from './TripInProgressSheet';

export interface ActiveTripOverlayProps {
  trip: Trip;
  onHeightChange?: (height: number) => void;
}

/**
 * Cockpit de viaje en curso (ActiveTripOverlay):
 * Delegado al nuevo componente unificado Liquid Glass `TripInProgressSheet`.
 */
export const ActiveTripOverlay: React.FC<ActiveTripOverlayProps> = (props) => {
  return <TripInProgressSheet {...props} />;
};

export { TripInProgressSheet };
