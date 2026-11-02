import { LatLng } from '../interface/latLng.interface';

/**
 * Calcula la distancia en metros entre dos coordenadas (fórmula de Haversine).
 */
export const getDistanceMeters = (a: LatLng, b: LatLng): number => {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const x =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 6371000 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/**
 * Calcula el rumbo (bearing en grados 0-360) desde el punto de inicio al de destino.
 * 0° = Norte, 90° = Este, 180° = Sur, 270° = Oeste.
 */
export const calculateBearing = (start: LatLng, end: LatLng): number => {
  const startLat = (start.latitude * Math.PI) / 180;
  const startLng = (start.longitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const endLng = (end.longitude * Math.PI) / 180;

  const dLng = endLng - startLng;

  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;
  return Math.round(bearing * 10) / 10;
};

/**
 * Determina el rumbo óptimo para la cámara de navegación de modo que
 * la ruta a seguir quede siempre hacia el frente (arriba en la pantalla).
 */
export const getNavigationBearing = (
  currentLocation: LatLng,
  routeCoordinates: LatLng[],
  destination: LatLng | null | undefined,
  hardwareHeading?: number | null,
  speed?: number | null,
): number => {
  // Si el vehículo va a velocidad sostenida (> 15 km/h ~ 4.2 m/s) y tiene rumbo GPS válido,
  // el movimiento real del auto manda.
  if (
    typeof speed === 'number' &&
    speed > 4.2 &&
    typeof hardwareHeading === 'number' &&
    hardwareHeading >= 0
  ) {
    return hardwareHeading;
  }

  // Si tenemos una polilínea de ruta, buscamos el siguiente punto a ~25m o más para orientar la vista
  if (routeCoordinates && routeCoordinates.length >= 2) {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < routeCoordinates.length; i++) {
      const dist = getDistanceMeters(currentLocation, routeCoordinates[i]);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    // Buscar el punto que esté al menos 20m adelante en el trazado
    for (let j = closestIndex + 1; j < routeCoordinates.length; j++) {
      const distAhead = getDistanceMeters(currentLocation, routeCoordinates[j]);
      if (distAhead >= 20) {
        return calculateBearing(currentLocation, routeCoordinates[j]);
      }
    }

    // Si estamos en el tramo final de la polilínea, orientar hacia el último punto
    if (closestIndex < routeCoordinates.length - 1) {
      return calculateBearing(
        currentLocation,
        routeCoordinates[routeCoordinates.length - 1],
      );
    }
  }

  // Si no hay polilínea intermedia, orientar directamente hacia el destino (punto de encuentro o destino final)
  if (destination?.latitude && destination?.longitude) {
    return calculateBearing(currentLocation, {
      latitude: destination.latitude,
      longitude: destination.longitude,
    });
  }

  // Fallback a rumbo de hardware si existe
  if (typeof hardwareHeading === 'number' && hardwareHeading >= 0) {
    return hardwareHeading;
  }

  return 0;
};

