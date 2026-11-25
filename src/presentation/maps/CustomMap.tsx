import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import type {
  AndroidStylingOptions,
  LatLng as NavLatLng,
  MapViewController,
  NavigationViewController,
  iOSStylingOptions,
} from '@googlemaps/react-native-navigation-sdk';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../core/constants/theme';
import { LatLng } from '../../core/location/interface/latLng.interface';
import { PermissionStatus } from '../../core/location/interface/permission.interface';
import {
  getGoogleNavigationSdk,
  type GoogleNavigationSdkModule,
} from '../../core/navigation/googleNavigationSdk';
import { MapControlsDock } from '../components/maps/MapControlsDock';
import { useLocationStore } from './store/useLocationStore';
import { usePermissionsStore } from './store/usePermissionsStore';
import { useDriverTripStore } from '../trip/store/useDriverTripStore';
import { usePeerAlertStore } from '../safety/store/usePeerAlertStore';
import { useActiveTripNavigation } from './hooks/useActiveTripNavigation';

interface Props extends ViewProps {
  showUserLocation?: boolean;
  initialLocation: LatLng;
  bottomOffset?: number;
}

const OFFER_CASING_POLYLINE_ID = 'transferblack-offer-route-casing';
const OFFER_POLYLINE_ID = 'transferblack-offer-route';
const ARRIVED_CASING_POLYLINE_ID = 'transferblack-arrived-route-casing';
const ARRIVED_POLYLINE_ID = 'transferblack-arrived-route';
const DRIVER_TRAIL_POLYLINE_ID = 'transferblack-driver-trail';
const PICKUP_MARKER_ID = 'transferblack-pickup-marker';
const DROPOFF_MARKER_ID = 'transferblack-dropoff-marker';
const PEER_VEHICLE_MARKER_ID = 'transferblack-peer-vehicle-marker';
const PEER_ROUTE_POLYLINE_ID = 'transferblack-peer-vehicle-route';

// Distancia mínima (en metros) para mover la cámara en modo libre y evitar saltos por ruido de GPS
const FREE_ROAM_MIN_MOVE_METERS = 15;

// Colores de ruta limpios estilo Uber Driver (sin líneas amarillas ni trazos crudos)
const UBER_ROUTE_PRIMARY = '#276EF1';
const UBER_ROUTE_CASING = '#102A6B';
const UBER_PEER_LINE = '#38BDF8';

// Paleta nocturna estilo Uber Driver con contraste arquitectónico real para edificios 3D y calles legibles
const uberCleanDarkMapStyle = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E9BAE' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0E131B' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#121722' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#1B2333' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#273349' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#132026' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#253042' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#212A3B' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#0F141D' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#293448' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#101620' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#334159' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#131A26' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#0E131B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#090E17' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#334155' }] },
];

const UBER_CLEAN_DARK_STYLE_JSON = JSON.stringify(uberCleanDarkMapStyle);

const ANDROID_NAV_STYLING: AndroidStylingOptions = {
  primaryDayModeThemeColor: '#111622',
  secondaryDayModeThemeColor: '#192132',
  primaryNightModeThemeColor: '#111622',
  secondaryNightModeThemeColor: '#192132',
  headerLargeManeuverIconColor: '#FFFFFF',
  headerSmallManeuverIconColor: '#CBD5E1',
  headerInstructionsTextColor: '#FFFFFF',
  headerNextStepTextColor: '#CBD5E1',
  headerDistanceValueTextColor: '#FFFFFF',
  headerDistanceUnitsTextColor: '#94A3B8',
  headerGuidanceRecommendedLaneColor: UBER_ROUTE_PRIMARY,
};

const IOS_NAV_STYLING: iOSStylingOptions = {
  navigationHeaderPrimaryBackgroundColor: '#111622',
  navigationHeaderSecondaryBackgroundColor: '#192132',
  navigationHeaderPrimaryBackgroundColorNightMode: '#111622',
  navigationHeaderSecondaryBackgroundColorNightMode: '#192132',
  navigationHeaderLargeManeuverIconColor: '#FFFFFF',
  navigationHeaderSmallManeuverIconColor: '#CBD5E1',
  navigationHeaderInstructionsTextColor: '#FFFFFF',
  navigationHeaderNextStepTextColor: '#CBD5E1',
  navigationHeaderDistanceValueTextColor: '#FFFFFF',
  navigationHeaderDistanceUnitsTextColor: '#94A3B8',
  navigationHeaderGuidanceRecommendedLaneColor: UBER_ROUTE_PRIMARY,
};

function dpToPx(dp: number): number {
  return Math.max(2, Math.round(PixelRatio.getPixelSizeForLayoutSize(dp)));
}

function toNavLatLng(coord: LatLng): NavLatLng {
  return { lat: coord.latitude, lng: coord.longitude };
}

function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function computeBearingDegrees(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function extractRoadPolylinePoints(
  geom?: { type?: string; coordinates?: unknown } | null
): NavLatLng[] {
  if (!geom || !Array.isArray(geom.coordinates)) return [];

  if (geom.type === 'MultiLineString') {
    const pts = (geom.coordinates as [number, number][][])
      .flat()
      .filter((pair) => Array.isArray(pair) && pair.length >= 2)
      .map(([lng, lat]) => ({ lat, lng }));
    return pts.length > 2 ? pts : [];
  }

  if (geom.type === 'LineString') {
    const pts = (geom.coordinates as [number, number][])
      .filter((pair) => Array.isArray(pair) && pair.length >= 2)
      .map(([lng, lat]) => ({ lat, lng }));
    return pts.length > 2 ? pts : [];
  }

  return [];
}

interface GoogleNavigationMapProps extends Props {
  sdk: GoogleNavigationSdkModule;
}

const GoogleNavigationMap: React.FC<GoogleNavigationMapProps> = ({
  sdk,
  initialLocation,
  showUserLocation = true,
  bottomOffset = 100,
  ...rest
}) => {
  const {
    NavigationView,
    MapColorScheme,
    NavigationNightMode,
    NavigationUIEnabledPreference,
  } = sdk;

  const [mapViewController, setMapViewController] = useState<MapViewController | null>(null);
  const [navigationViewController, setNavigationViewController] =
    useState<NavigationViewController | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [followPreference, setFollowPreference] = useState<{
    contextKey: string;
    following: boolean;
  }>({ contextKey: '', following: true });
  const [isPolyline, setIsPolyline] = useState(false);

  const mapControllerRef = useRef<MapViewController | null>(null);
  const isMapReadyRef = useRef(false);
  const lastFreeRoamTargetRef = useRef<LatLng | null>(null);

  useEffect(() => {
    mapControllerRef.current = mapViewController;
    isMapReadyRef.current = isMapReady;
  }, [mapViewController, isMapReady]);

  const currentOffer = useDriverTripStore((state) => state.currentOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const activeTripStatus = activeTrip?.status;
  const followingPeerAlert = usePeerAlertStore((state) => state.followingAlert);
  const focusPeerNonce = usePeerAlertStore((state) => state.focusRequestNonce);

  const cameraContextKey = `${activeTrip?.id ?? 'idle'}:${activeTripStatus ?? 'none'}:peer-${focusPeerNonce}`;
  const defaultFollowForContext = !(focusPeerNonce > 0 && Boolean(followingPeerAlert));
  const isFollowingUser =
    followPreference.contextKey === cameraContextKey
      ? followPreference.following
      : defaultFollowForContext;

  const locationStatus = usePermissionsStore((state) => state.locationStatus);
  const checkLocationPermission = usePermissionsStore((state) => state.checkLocationPermission);
  const hasLocationPermission = locationStatus === PermissionStatus.GRANTED;

  useEffect(() => {
    void checkLocationPermission();
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkLocationPermission();
      }
    });
    return () => sub.remove();
  }, [checkLocationPermission]);

  const {
    lastKnownLocation,
    lastKnownReading,
    userLocationList,
    watchLocation,
    clearWatchLocation,
    getLocation,
  } = useLocationStore();

  // Mantiene nuestro sistema actual de GPS / Zustand / Socket.IO activo solo con permiso otorgado
  useEffect(() => {
    if (!hasLocationPermission) return;
    void watchLocation();
    return () => {
      clearWatchLocation();
    };
  }, [hasLocationPermission, watchLocation, clearWatchLocation]);

  // Navegación giro a giro oficial de Google Navigation SDK durante el viaje activo
  const {
    shouldNavigate,
    isNavigating,
    isInitializing,
    isMuted,
    activeDestinationPhase,
    toggleMute,
    recenterNavigation,
    showOverview,
  } = useActiveTripNavigation({
    sdk,
    activeTrip,
    navigationViewController: isMapReady ? navigationViewController : null,
  });

  // Mientras Navigation SDK tenga destino activo (o esté inicializando), él es dueño absoluto de la cámara 3D.
  const isNavCameraOwner = shouldNavigate || isNavigating || isInitializing;

  // Padding real respetando el espacio exacto que ocupa el panel inferior (tanto en inicio como en viaje)
  const effectiveBottomPadding = Math.max(Math.round(bottomOffset), 100) + 28;
  const mapPadding = useMemo(
    () => ({
      top: isNavigating ? 16 : 92,
      bottom: effectiveBottomPadding,
      left: 12,
      right: 12,
    }),
    [effectiveBottomPadding, isNavigating]
  );

  // Aplica padding al controlador nativo apenas cambia el alto del componente inferior y re-centra la cámara
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady) return;
    try {
      controller.setPadding(mapPadding);
    } catch {
      // No-op
    }

    if (isNavigating) {
      const timer = setTimeout(() => {
        void recenterNavigation();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [activeDestinationPhase, isMapReady, isNavigating, mapPadding, mapViewController, recenterNavigation]);

  // En punto de encuentro (`driver_arrived`), encuadramos una sola vez en perspectiva 3D apuntando al próximo destino
  useEffect(() => {
    if (!isMapReadyRef.current) return;

    if (isNavigating) {
      const timer = setTimeout(() => {
        void recenterNavigation();
      }, 180);
      return () => clearTimeout(timer);
    }

    if (isNavCameraOwner) return;

    const controller = mapControllerRef.current;
    if (!controller || activeTrip?.status !== 'driver_arrived') return;

    const driverPos = useLocationStore.getState().lastKnownLocation;
    if (!driverPos) return;

    const firstStop = activeTrip.stops?.[0];
    const nextTarget =
      firstStop?.latitude != null && firstStop?.longitude != null
        ? { latitude: firstStop.latitude, longitude: firstStop.longitude }
        : activeTrip.dropoff?.latitude != null && activeTrip.dropoff?.longitude != null
          ? { latitude: activeTrip.dropoff.latitude, longitude: activeTrip.dropoff.longitude }
          : null;

    const arrivedBearing = nextTarget
      ? computeBearingDegrees(driverPos, nextTarget)
      : useLocationStore.getState().lastKnownReading?.heading || 0;

    try {
      void Promise.resolve(
        controller.moveCamera({
          target: toNavLatLng(driverPos),
          zoom: 17.5,
          tilt: 48,
          bearing: arrivedBearing,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [
    activeTrip?.dropoff?.latitude,
    activeTrip?.dropoff?.longitude,
    activeTrip?.id,
    activeTrip?.status,
    activeTrip?.stops,
    isNavCameraOwner,
    isNavigating,
    recenterNavigation,
  ]);

  // Coordenadas reales sobre calles para previsualizar oferta entrante (nunca líneas rectas diagonales)
  const offerRouteCoordinates = useMemo((): NavLatLng[] => {
    if (isNavCameraOwner || !currentOffer) return [];
    return extractRoadPolylinePoints(currentOffer.routeGeometry);
  }, [currentOffer, isNavCameraOwner]);

  // Ruta limpia sobre calles únicamente mientras el conductor espera en el punto de encuentro (`driver_arrived`)
  const arrivedPreviewCoordinates = useMemo((): NavLatLng[] => {
    if (isNavCameraOwner || activeTrip?.status !== 'driver_arrived') {
      return [];
    }
    return extractRoadPolylinePoints(activeTrip.routeGeometry);
  }, [activeTrip, isNavCameraOwner]);

  // Dibuja / limpia rutas de previsualización con doble capa estilo Uber (borde oscuro + línea azul limpia)
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady) return;

    const safeCall = (fn: () => unknown) => {
      try {
        void Promise.resolve(fn()).catch(() => {});
      } catch {
        // Ignorar si el mapa todavía se está inicializando
      }
    };

    if (isNavCameraOwner) {
      safeCall(() => controller.removePolyline(OFFER_CASING_POLYLINE_ID));
      safeCall(() => controller.removePolyline(OFFER_POLYLINE_ID));
      safeCall(() => controller.removePolyline(ARRIVED_CASING_POLYLINE_ID));
      safeCall(() => controller.removePolyline(ARRIVED_POLYLINE_ID));
      safeCall(() => controller.removeMarker(PICKUP_MARKER_ID));
      safeCall(() => controller.removeMarker(DROPOFF_MARKER_ID));
      return;
    }

    if (arrivedPreviewCoordinates.length > 2) {
      safeCall(() =>
        controller.addPolyline({
          id: ARRIVED_CASING_POLYLINE_ID,
          points: arrivedPreviewCoordinates,
          color: UBER_ROUTE_CASING,
          width: dpToPx(7),
          visible: true,
        })
      );
      safeCall(() =>
        controller.addPolyline({
          id: ARRIVED_POLYLINE_ID,
          points: arrivedPreviewCoordinates,
          color: UBER_ROUTE_PRIMARY,
          width: dpToPx(4.5),
          visible: true,
        })
      );
    } else {
      safeCall(() => controller.removePolyline(ARRIVED_CASING_POLYLINE_ID));
      safeCall(() => controller.removePolyline(ARRIVED_POLYLINE_ID));
    }

    if (!currentOffer) {
      safeCall(() => controller.removePolyline(OFFER_CASING_POLYLINE_ID));
      safeCall(() => controller.removePolyline(OFFER_POLYLINE_ID));
      safeCall(() => controller.removeMarker(PICKUP_MARKER_ID));
      safeCall(() => controller.removeMarker(DROPOFF_MARKER_ID));
      return;
    }

    if (offerRouteCoordinates.length > 2) {
      safeCall(() =>
        controller.addPolyline({
          id: OFFER_CASING_POLYLINE_ID,
          points: offerRouteCoordinates,
          color: UBER_ROUTE_CASING,
          width: dpToPx(7.5),
          visible: true,
        })
      );
      safeCall(() =>
        controller.addPolyline({
          id: OFFER_POLYLINE_ID,
          points: offerRouteCoordinates,
          color: UBER_ROUTE_PRIMARY,
          width: dpToPx(4.5),
          visible: true,
        })
      );
    } else {
      safeCall(() => controller.removePolyline(OFFER_CASING_POLYLINE_ID));
      safeCall(() => controller.removePolyline(OFFER_POLYLINE_ID));
    }

    const pickupLat = currentOffer.pickup?.latitude;
    const pickupLng = currentOffer.pickup?.longitude;
    const dropoffLat = currentOffer.dropoff?.latitude;
    const dropoffLng = currentOffer.dropoff?.longitude;

    if (pickupLat != null && pickupLng != null) {
      safeCall(() =>
        controller.addMarker({
          id: PICKUP_MARKER_ID,
          position: { lat: pickupLat, lng: pickupLng },
          title: 'Punto de encuentro',
          snippet: currentOffer.pickup.address,
        })
      );

      const offerBearing =
        dropoffLat != null && dropoffLng != null
          ? computeBearingDegrees(
              { latitude: pickupLat, longitude: pickupLng },
              { latitude: dropoffLat, longitude: dropoffLng }
            )
          : 0;

      safeCall(() =>
        controller.moveCamera({
          target: { lat: pickupLat, lng: pickupLng },
          zoom: 15,
          tilt: 35,
          bearing: offerBearing,
        })
      );
    }

    if (dropoffLat != null && dropoffLng != null) {
      safeCall(() =>
        controller.addMarker({
          id: DROPOFF_MARKER_ID,
          position: { lat: dropoffLat, lng: dropoffLng },
          title: 'Destino',
          snippet: currentOffer.dropoff.address,
        })
      );
    }
  }, [
    arrivedPreviewCoordinates,
    currentOffer,
    isMapReady,
    isNavCameraOwner,
    mapViewController,
    offerRouteCoordinates,
  ]);

  // Marcador en vivo del vehículo del compañero en Retaguardia ("Carita") sin salir de la app
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady) return;

    const safeCall = (fn: () => unknown) => {
      try {
        void Promise.resolve(fn()).catch(() => {});
      } catch {
        // No-op
      }
    };

    if (!followingPeerAlert) {
      safeCall(() => controller.removeMarker(PEER_VEHICLE_MARKER_ID));
      safeCall(() => controller.removePolyline(PEER_ROUTE_POLYLINE_ID));
      return;
    }

    const peerPosition: NavLatLng = {
      lat: followingPeerAlert.lat,
      lng: followingPeerAlert.lng,
    };
    const vehicleInfo = [followingPeerAlert.vehicleLabel, followingPeerAlert.plate]
      .filter(Boolean)
      .join(' · ');

    safeCall(() =>
      controller.addMarker({
        id: PEER_VEHICLE_MARKER_ID,
        position: peerPosition,
        title: `Auto de ${followingPeerAlert.driverName}`,
        snippet: vehicleInfo || 'Compañero en retaguardia',
        rotation:
          typeof followingPeerAlert.heading === 'number' &&
          Number.isFinite(followingPeerAlert.heading)
            ? followingPeerAlert.heading
            : 0,
      })
    );

    if (!isNavCameraOwner && lastKnownLocation) {
      safeCall(() =>
        controller.addPolyline({
          id: PEER_ROUTE_POLYLINE_ID,
          points: [toNavLatLng(lastKnownLocation), peerPosition],
          color: UBER_PEER_LINE,
          width: dpToPx(3.5),
          visible: true,
        })
      );
    } else {
      safeCall(() => controller.removePolyline(PEER_ROUTE_POLYLINE_ID));
    }
  }, [followingPeerAlert, isMapReady, isNavCameraOwner, lastKnownLocation, mapViewController]);

  // Enfoca la cámara sobre el auto del compañero al iniciar seguimiento o tocar "Centrar"
  useEffect(() => {
    if (!focusPeerNonce || !followingPeerAlert || !isMapReady || !mapControllerRef.current) {
      return;
    }
    try {
      void Promise.resolve(
        mapControllerRef.current.moveCamera({
          target: { lat: followingPeerAlert.lat, lng: followingPeerAlert.lng },
          zoom: 16.5,
          tilt: 40,
          bearing:
            typeof followingPeerAlert.heading === 'number' &&
            Number.isFinite(followingPeerAlert.heading)
              ? followingPeerAlert.heading
              : 0,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPeerNonce, isMapReady]);

  // Rastro GPS opcional en modo libre (desactivado por defecto)
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady) return;

    if (!isPolyline || isNavCameraOwner || userLocationList.length < 2) {
      try {
        void Promise.resolve(controller.removePolyline(DRIVER_TRAIL_POLYLINE_ID)).catch(() => {});
      } catch {
        // No-op
      }
      return;
    }

    try {
      void Promise.resolve(
        controller.addPolyline({
          id: DRIVER_TRAIL_POLYLINE_ID,
          points: userLocationList.map(toNavLatLng),
          color: UBER_ROUTE_PRIMARY,
          width: dpToPx(3.5),
          visible: true,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [isMapReady, isNavCameraOwner, isPolyline, mapViewController, userLocationList]);

  // Seguimiento en modo libre: solo actualiza cuando el seguimiento está activo y el vehículo avanzó >= 15m
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (
      !controller ||
      !isMapReady ||
      !lastKnownLocation ||
      !isFollowingUser ||
      isNavCameraOwner ||
      activeTripStatus === 'driver_arrived' ||
      currentOffer
    ) {
      return;
    }

    if (
      lastFreeRoamTargetRef.current &&
      distanceMeters(lastFreeRoamTargetRef.current, lastKnownLocation) < FREE_ROAM_MIN_MOVE_METERS
    ) {
      return;
    }

    lastFreeRoamTargetRef.current = lastKnownLocation;

    const heading =
      typeof lastKnownReading?.heading === 'number' &&
      Number.isFinite(lastKnownReading.heading) &&
      lastKnownReading.heading > 0
        ? lastKnownReading.heading
        : 0;

    try {
      void Promise.resolve(
        controller.moveCamera({
          target: toNavLatLng(lastKnownLocation),
          zoom: 16,
          tilt: 25,
          bearing: heading,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [
    activeTripStatus,
    currentOffer,
    isFollowingUser,
    isMapReady,
    isNavCameraOwner,
    lastKnownLocation,
    lastKnownReading?.heading,
    mapViewController,
  ]);

  // Si el conductor toca o arrastra el mapa con el dedo en modo libre, soltamos el seguimiento automáticamente
  const handleUserMapTouch = useCallback(() => {
    if (!isNavCameraOwner && isFollowingUser) {
      setFollowPreference({ contextKey: cameraContextKey, following: false });
    }
  }, [cameraContextKey, isFollowingUser, isNavCameraOwner]);

  const moveToCurrentLocation = useCallback(async () => {
    if (isNavigating || shouldNavigate) {
      await recenterNavigation();
      return;
    }

    lastFreeRoamTargetRef.current = null;
    setFollowPreference({ contextKey: cameraContextKey, following: true });
    const target = lastKnownLocation || initialLocation;
    const tiltAngle = activeTripStatus === 'driver_arrived' ? 48 : 25;
    if (isMapReadyRef.current && mapControllerRef.current) {
      try {
        mapControllerRef.current.setPadding(mapPadding);
        void Promise.resolve(
          mapControllerRef.current.moveCamera({
            target: toNavLatLng(target),
            zoom: 16.5,
            tilt: tiltAngle,
          })
        ).catch(() => {});
        lastFreeRoamTargetRef.current = target;
      } catch {
        // No-op
      }
    }

    const freshLocation = await getLocation();
    if (freshLocation && isMapReadyRef.current && mapControllerRef.current) {
      try {
        void Promise.resolve(
          mapControllerRef.current.moveCamera({
            target: toNavLatLng(freshLocation),
            zoom: 16.5,
            tilt: tiltAngle,
          })
        ).catch(() => {});
        lastFreeRoamTargetRef.current = freshLocation;
      } catch {
        // No-op
      }
    }
  }, [
    activeTripStatus,
    cameraContextKey,
    getLocation,
    initialLocation,
    isNavigating,
    lastKnownLocation,
    mapPadding,
    recenterNavigation,
    shouldNavigate,
  ]);

  const handleToggleFollowUser = useCallback(() => {
    const nextFollowing = !isFollowingUser;
    if (nextFollowing) {
      lastFreeRoamTargetRef.current = null;
    }
    setFollowPreference({
      contextKey: cameraContextKey,
      following: nextFollowing,
    });
  }, [cameraContextKey, isFollowingUser]);

  const initialCameraPosition = useMemo(
    () => ({
      target: toNavLatLng(initialLocation),
      zoom: 16,
      tilt: 25,
    }),
    [initialLocation]
  );

  return (
    <View style={[styles.container, rest.style]} {...rest}>
      <View style={styles.map} onTouchStart={handleUserMapTouch}>
        <NavigationView
          style={styles.map}
          initialCameraPosition={initialCameraPosition}
          mapColorScheme={MapColorScheme.DARK}
          navigationNightMode={NavigationNightMode.FORCE_NIGHT}
          navigationUIEnabledPreference={NavigationUIEnabledPreference.AUTOMATIC}
          androidStylingOptions={ANDROID_NAV_STYLING}
          iOSStylingOptions={IOS_NAV_STYLING}
          mapStyle={UBER_CLEAN_DARK_STYLE_JSON}
          mapPadding={mapPadding}
          myLocationEnabled={showUserLocation && hasLocationPermission}
          myLocationButtonEnabled={false}
          compassEnabled={false}
          mapToolbarEnabled={false}
          buildingsEnabled={true}
          trafficEnabled={false}
          trafficPromptsEnabled={false}
          trafficIncidentCardsEnabled={false}
          headerEnabled={true}
          footerEnabled={false}
          tripProgressBarEnabled={false}
          speedLimitIconEnabled={true}
          recenterButtonEnabled={true}
          reportIncidentButtonEnabled={false}
          onRecenterButtonClick={() => {
            void recenterNavigation();
          }}
          onMapReady={() => setIsMapReady(true)}
          onMapViewControllerCreated={setMapViewController}
          onNavigationViewControllerCreated={setNavigationViewController}
          onMapClick={handleUserMapTouch}
        />
      </View>

      {/* Indicador discreto mientras inicializa la ruta giro a giro */}
      {isInitializing && (
        <View
          pointerEvents="none"
          className="absolute top-28 self-center flex-row items-center px-4 py-2 rounded-full bg-[#111622]/95 border border-white/15"
        >
          <ActivityIndicator size="small" color={UBER_ROUTE_PRIMARY} />
          <Text className="text-platinum font-montserrat-semibold text-xs ml-2">
            Calculando ruta 3D...
          </Text>
        </View>
      )}

      {/* Controles flotantes de navegación activa (recentrar 3D + voz + vista general) o dock en modo libre */}
      {isNavigating ? (
        <View
          className="absolute right-4 gap-2.5"
          style={{ bottom: Math.max(bottomOffset, 100) + 16 }}
        >
          <TouchableOpacity
            onPress={() => {
              void recenterNavigation();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Centrar cámara 3D en dirección de marcha"
            className="w-12 h-12 rounded-full bg-[#111622]/95 border border-white/20 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons name="navigate" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void toggleMute();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Activar voz de navegación' : 'Silenciar voz de navegación'}
            className="w-12 h-12 rounded-full bg-[#111622]/95 border border-white/15 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={isMuted ? THEME_COLORS.ash : '#FFFFFF'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showOverview}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Ver resumen completo de la ruta"
            className="w-12 h-12 rounded-full bg-[#111622]/95 border border-white/15 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons name="map-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        </View>
      ) : (
        <MapControlsDock
          isPolyline={isPolyline}
          onTogglePolyline={() => setIsPolyline((prev) => !prev)}
          isFollowingUser={isFollowingUser}
          onToggleFollowUser={handleToggleFollowUser}
          onRecenter={() => {
            void moveToCurrentLocation();
          }}
          bottomOffset={bottomOffset}
        />
      )}
    </View>
  );
};

export const CustomMap = (props: Props) => {
  const sdk = getGoogleNavigationSdk();
  const { watchLocation, clearWatchLocation } = useLocationStore();

  // En Expo Go mantenemos el GPS activo igual aunque no exista el módulo nativo de Navigation SDK
  useEffect(() => {
    if (sdk) return;
    void watchLocation();
    return () => {
      clearWatchLocation();
    };
  }, [clearWatchLocation, sdk, watchLocation]);

  if (!sdk) {
    return (
      <View
        style={[styles.container, props.style]}
        className="bg-obsidian items-center justify-center px-8"
      >
        <View className="w-16 h-16 rounded-2xl bg-gold/15 border border-gold/40 items-center justify-center mb-4">
          <Ionicons name="navigate" size={28} color={THEME_COLORS.gold} />
        </View>
        <Text className="text-white font-montserrat-bold text-base text-center mb-2">
          Google Navigation SDK requiere Development Build
        </Text>
        <Text className="text-ash font-montserrat text-xs text-center leading-5">
          Estás ejecutando en un entorno sin el módulo nativo compilado (ej. Expo Go). Ejecutá{' '}
          <Text className="text-gold font-montserrat-semibold">npx expo run:android</Text> o{' '}
          <Text className="text-gold font-montserrat-semibold">npx expo run:ios</Text> para ver el mapa y la navegación giro a giro.
        </Text>
      </View>
    );
  }

  return <GoogleNavigationMap {...props} sdk={sdk} />;
};

export default CustomMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
