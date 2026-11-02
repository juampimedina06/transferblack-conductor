import { describe, it, expect } from 'vitest';
import {
  calculateBearing,
  getDistanceMeters,
  getNavigationBearing,
} from '../../src/core/location/utils/navigationBearing';
import { LatLng } from '../../src/core/location/interface/latLng.interface';

describe('Navigation Bearing & Heading Calculations', () => {
  const cordobaCenter: LatLng = { latitude: -31.4201, longitude: -64.1888 };
  const northOfCordoba: LatLng = { latitude: -31.4101, longitude: -64.1888 };
  const eastOfCordoba: LatLng = { latitude: -31.4201, longitude: -64.1788 };
  const southOfCordoba: LatLng = { latitude: -31.4301, longitude: -64.1888 };
  const westOfCordoba: LatLng = { latitude: -31.4201, longitude: -64.1988 };

  describe('calculateBearing', () => {
    it('calculates approximately 0° for points directly North', () => {
      const bearing = calculateBearing(cordobaCenter, northOfCordoba);
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('calculates approximately 90° for points directly East', () => {
      const bearing = calculateBearing(cordobaCenter, eastOfCordoba);
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('calculates approximately 180° for points directly South', () => {
      const bearing = calculateBearing(cordobaCenter, southOfCordoba);
      expect(bearing).toBeCloseTo(180, 0);
    });

    it('calculates approximately 270° for points directly West', () => {
      const bearing = calculateBearing(cordobaCenter, westOfCordoba);
      expect(bearing).toBeCloseTo(270, 0);
    });
  });

  describe('getDistanceMeters', () => {
    it('calculates non-zero distance between distinct coordinates', () => {
      const dist = getDistanceMeters(cordobaCenter, northOfCordoba);
      expect(dist).toBeGreaterThan(1000); // ~1.1 km
      expect(dist).toBeLessThan(1200);
    });

    it('returns 0 for the exact same point', () => {
      const dist = getDistanceMeters(cordobaCenter, cordobaCenter);
      expect(dist).toBe(0);
    });
  });

  describe('getNavigationBearing', () => {
    it('orients camera ahead along route line polyline', () => {
      const route: LatLng[] = [
        cordobaCenter,
        { latitude: -31.418, longitude: -64.1888 }, // ~230m North
        { latitude: -31.4101, longitude: -64.1888 },
      ];

      const bearing = getNavigationBearing(
        cordobaCenter,
        route,
        northOfCordoba,
        null,
        null
      );

      // Should be pointing North (~0°)
      expect(bearing).toBeCloseTo(0, 0);
    });

    it('falls back directly to destination when route polyline is empty', () => {
      const bearing = getNavigationBearing(
        cordobaCenter,
        [],
        eastOfCordoba,
        null,
        null
      );

      // Should be pointing East (~90°)
      expect(bearing).toBeCloseTo(90, 0);
    });

    it('uses hardware heading when moving at driving speed', () => {
      const hardwareHeading = 45; // NE
      const bearing = getNavigationBearing(
        cordobaCenter,
        [],
        northOfCordoba,
        hardwareHeading,
        10 // 10 m/s ~ 36 km/h
      );

      expect(bearing).toBe(45);
    });
  });
});

