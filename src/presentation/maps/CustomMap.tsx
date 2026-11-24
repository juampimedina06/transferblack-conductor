import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import type {
  LatLng as NavLatLng,
  MapViewController,
  NavigationViewController,
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

const OFFER_POLYLINE_ID = 'transferblack-offer-route';
const FALLBACK_TRIP_POLYLINE_ID = 'transferblack-active-trip-route';
const DRIVER_TRAIL_POLYLINE_ID = 'transferblack-driver-trail';
const PICKUP_MARKER_ID = 'transferblack-pickup-marker';
const DROPOFF_MARKER_ID = 'transferblack-dropoff-marker';
const PEER_VEHICLE_MARKER_ID = 'transferblack-peer-vehicle-marker';
const PEER_ROUTE_POLYLINE_ID = 'transferblack-peer-vehicle-route';

// Estilo oscuro alineado con la paleta TransferBlack Obsidian
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8E8E93' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0C' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#101012' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1A1C' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0A0A0C' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050507' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2C2C2E' }] },
];

const DARK_MAP_STYLE_JSON = JSON.stringify(darkMapStyle);

function toNavLatLng(coord: LatLng): NavLatLng {
  return { lat: coord.latitude, lng: coord.longitude };
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

  // Cada vez que cambia la etapa del viaje (aceptado -> llegó -> en progreso -> finalizado),
  // re-encuadramos la cámara de forma limpia sobre el vehículo y dirección de avance.
  useEffect(() => {
    if (!isMapReadyRef.current) return;

    if (isNavigating) {
      const timer = setTimeout(() => {
        void recenterNavigation();
      }, 220);
      return () => clearTimeout(timer);
    }

    const controller = mapControllerRef.current;
    if (!controller) return;

    const driverPos = useLocationStore.getState().lastKnownLocation;
    const driverHeading = useLocationStore.getState().lastKnownReading?.heading;
    if (!driverPos) return;

    if (
      activeTrip &&
      activeTrip.status !== 'completed' &&
      activeTrip.status !== 'cancelled'
    ) {
      let computedBearing =
        typeof driverHeading === 'number' && Number.isFinite(driverHeading) && driverHeading >= 0
          ? driverHeading
          : 0;

      if (
        computedBearing === 0 &&
        activeTrip.status === 'in_progress' &&
        activeTrip.dropoff?.latitude != null &&
        activeTrip.dropoff?.longitude != null
      ) {
        computedBearing = computeBearingDegrees(driverPos, {
          latitude: activeTrip.dropoff.latitude,
          longitude: activeTrip.dropoff.longitude,
        });
      } else if (
        computedBearing === 0 &&
        activeTrip.pickup?.latitude != null &&
        activeTrip.pickup?.longitude != null
      ) {
        computedBearing = computeBearingDegrees(driverPos, {
          latitude: activeTrip.pickup.latitude,
          longitude: activeTrip.pickup.longitude,
        });
      }

      try {
        void Promise.resolve(
          controller.moveCamera({
            target: toNavLatLng(driverPos),
            zoom: activeTrip.status === 'driver_arrived' ? 17.5 : 17,
            tilt: activeTrip.status === 'in_progress' ? 45 : 30,
            bearing: computedBearing,
          })
        ).catch(() => {});
      } catch {
        // Ignorar si el controlador todavía está montándose
      }
    }
  }, [activeTrip, activeTrip?.id, activeTrip?.status, isNavigating, recenterNavigation]);

  // Cuando cambia el alto de la tarjeta inferior en plena navegación giro a giro (ej. al iniciar viaje),
  // re-centramos la perspectiva 3D para que el auto quede bien ubicado sobre la tarjeta.
  useEffect(() => {
    if (!isNavigating || !isMapReady) return;
    const timer = setTimeout(() => {
      void recenterNavigation();
    }, 180);
    return () => clearTimeout(timer);
  }, [activeDestinationPhase, bottomOffset, isMapReady, isNavigating, recenterNavigation]);

  // Coordenadas de oferta entrante (cuando todavía no se inició navegación giro a giro)
  const offerRouteCoordinates = useMemo((): NavLatLng[] => {
    if (isNavigating || !currentOffer) return [];
    const geom = currentOffer.routeGeometry;
    if (geom?.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
      return geom.coordinates
        .flat()
        .map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
    if (geom?.type === 'LineString' && Array.isArray(geom.coordinates)) {
      return geom.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
    if (
      currentOffer.pickup?.latitude != null &&
      currentOffer.pickup?.longitude != null &&
      currentOffer.dropoff?.latitude != null &&
      currentOffer.dropoff?.longitude != null
    ) {
      return [
        { lat: currentOffer.pickup.latitude, lng: currentOffer.pickup.longitude },
        { lat: currentOffer.dropoff.latitude, lng: currentOffer.dropoff.longitude },
      ];
    }
    return [];
  }, [currentOffer, isNavigating]);

  // Ruta de respaldo del viaje activo cuando Navigation SDK aún está inicializando o en espera en pickup
  const fallbackActiveTripCoordinates = useMemo((): NavLatLng[] => {
    if (
      isNavigating ||
      !activeTrip ||
      activeTrip.status === 'completed' ||
      activeTrip.status === 'cancelled'
    ) {
      return [];
    }
    const geom = activeTrip.routeGeometry;
    if (geom?.type === 'MultiLineString' && Array.isArray(geom.coordinates)) {
      return geom.coordinates
        .flat()
        .map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
    if (geom?.type === 'LineString' && Array.isArray(geom.coordinates)) {
      return geom.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    }
    const pts: NavLatLng[] = [];
    if (activeTrip.pickup?.latitude != null && activeTrip.pickup?.longitude != null) {
      pts.push({ lat: activeTrip.pickup.latitude, lng: activeTrip.pickup.longitude });
    }
    for (const stop of activeTrip.stops ?? []) {
      if (stop.latitude != null && stop.longitude != null) {
        pts.push({ lat: stop.latitude, lng: stop.longitude });
      }
    }
    if (activeTrip.dropoff?.latitude != null && activeTrip.dropoff?.longitude != null) {
      pts.push({ lat: activeTrip.dropoff.latitude, lng: activeTrip.dropoff.longitude });
    }
    return pts.length > 1 ? pts : [];
  }, [activeTrip, isNavigating]);

  // Dibuja / limpia la ruta y marcadores de la oferta entrante o respaldo de viaje activo
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

    if (isNavigating) {
      safeCall(() => controller.removePolyline(OFFER_POLYLINE_ID));
      safeCall(() => controller.removePolyline(FALLBACK_TRIP_POLYLINE_ID));
      safeCall(() => controller.removeMarker(PICKUP_MARKER_ID));
      safeCall(() => controller.removeMarker(DROPOFF_MARKER_ID));
      return;
    }

    if (fallbackActiveTripCoordinates.length > 1) {
      safeCall(() =>
        controller.addPolyline({
          id: FALLBACK_TRIP_POLYLINE_ID,
          points: fallbackActiveTripCoordinates,
          color: THEME_COLORS.gold,
          width: 5,
        })
      );
    } else {
      safeCall(() => controller.removePolyline(FALLBACK_TRIP_POLYLINE_ID));
    }

    if (!currentOffer) {
      safeCall(() => controller.removePolyline(OFFER_POLYLINE_ID));
      safeCall(() => controller.removeMarker(PICKUP_MARKER_ID));
      safeCall(() => controller.removeMarker(DROPOFF_MARKER_ID));
      return;
    }

    if (offerRouteCoordinates.length > 1) {
      safeCall(() =>
        controller.addPolyline({
          id: OFFER_POLYLINE_ID,
          points: offerRouteCoordinates,
          color: THEME_COLORS.gold,
          width: 6,
        })
      );
    }

    const pickupLat = currentOffer.pickup?.latitude;
    const pickupLng = currentOffer.pickup?.longitude;
    if (pickupLat != null && pickupLng != null) {
      safeCall(() =>
        controller.addMarker({
          id: PICKUP_MARKER_ID,
          position: { lat: pickupLat, lng: pickupLng },
          title: 'Punto de encuentro',
          snippet: currentOffer.pickup.address,
        })
      );

      safeCall(() =>
        controller.moveCamera({
          target: { lat: pickupLat, lng: pickupLng },
          zoom: 14,
          tilt: 0,
          bearing: 0,
        })
      );
    }

    const dropoffLat = currentOffer.dropoff?.latitude;
    const dropoffLng = currentOffer.dropoff?.longitude;
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
    currentOffer,
    fallbackActiveTripCoordinates,
    isMapReady,
    isNavigating,
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

    if (!isNavigating && lastKnownLocation) {
      safeCall(() =>
        controller.addPolyline({
          id: PEER_ROUTE_POLYLINE_ID,
          points: [toNavLatLng(lastKnownLocation), peerPosition],
          color: THEME_COLORS.gold,
          width: 5,
        })
      );
    } else {
      safeCall(() => controller.removePolyline(PEER_ROUTE_POLYLINE_ID));
    }
  }, [followingPeerAlert, isMapReady, isNavigating, lastKnownLocation, mapViewController]);

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
          tilt: 35,
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

  // Rastro GPS opcional (desactivado por defecto)
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady) return;

    if (!isPolyline || isNavigating || userLocationList.length < 2) {
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
          color: THEME_COLORS.gold,
          width: 4,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [isMapReady, isNavigating, isPolyline, mapViewController, userLocationList]);

  // Seguimiento suave de cámara en modo libre o respaldo de viaje activo cuando Navigation SDK no está guiando
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (
      !controller ||
      !isMapReady ||
      !lastKnownLocation ||
      !isFollowingUser ||
      isNavigating ||
      currentOffer
    ) {
      return;
    }

    const isTripInProgress = activeTrip?.status === 'in_progress';
    const isOnActiveTrip =
      Boolean(activeTrip) &&
      activeTrip?.status !== 'completed' &&
      activeTrip?.status !== 'cancelled';
    const heading =
      typeof lastKnownReading?.heading === 'number' &&
      Number.isFinite(lastKnownReading.heading) &&
      lastKnownReading.heading >= 0
        ? lastKnownReading.heading
        : 0;

    try {
      void Promise.resolve(
        controller.moveCamera({
          target: toNavLatLng(lastKnownLocation),
          zoom: isOnActiveTrip ? 17 : 16,
          tilt: isTripInProgress ? 45 : isOnActiveTrip ? 25 : 0,
          bearing: isOnActiveTrip ? heading : 0,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [
    activeTrip,
    currentOffer,
    isFollowingUser,
    isMapReady,
    isNavigating,
    lastKnownLocation,
    lastKnownReading?.heading,
    mapViewController,
  ]);

  const moveToCurrentLocation = useCallback(async () => {
    if (isNavigating) {
      await recenterNavigation();
      return;
    }

    setFollowPreference({ contextKey: cameraContextKey, following: true });
    const target = lastKnownLocation || initialLocation;
    if (isMapReadyRef.current && mapControllerRef.current) {
      try {
        void Promise.resolve(
          mapControllerRef.current.moveCamera({
            target: toNavLatLng(target),
            zoom: 16.5,
            tilt: activeTripStatus === 'in_progress' ? 45 : 0,
          })
        ).catch(() => {});
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
            tilt: activeTripStatus === 'in_progress' ? 45 : 0,
          })
        ).catch(() => {});
      } catch {
        // No-op
      }
    }
  }, [activeTripStatus, cameraContextKey, getLocation, initialLocation, isNavigating, lastKnownLocation, recenterNavigation]);

  const initialCameraPosition = useMemo(
    () => ({
      target: toNavLatLng(initialLocation),
      zoom: 15,
    }),
    [initialLocation]
  );

  const mapPadding = useMemo(
    () => ({
      top: isNavigating ? 16 : 90,
      bottom: Math.max(bottomOffset, 100) + 16,
      left: 12,
      right: 12,
    }),
    [bottomOffset, isNavigating]
  );

  return (
    <View style={[styles.container, rest.style]} {...rest}>
      <NavigationView
        style={styles.map}
        initialCameraPosition={initialCameraPosition}
        mapColorScheme={MapColorScheme.DARK}
        navigationNightMode={NavigationNightMode.FORCE_NIGHT}
        navigationUIEnabledPreference={
          isNavigating
            ? NavigationUIEnabledPreference.AUTOMATIC
            : NavigationUIEnabledPreference.DISABLED
        }
        mapStyle={DARK_MAP_STYLE_JSON}
        mapPadding={mapPadding}
        myLocationEnabled={showUserLocation && hasLocationPermission}
        myLocationButtonEnabled={false}
        compassEnabled={false}
        mapToolbarEnabled={false}
        buildingsEnabled={true}
        trafficEnabled={true}
        headerEnabled={true}
        footerEnabled={false}
        tripProgressBarEnabled={true}
        speedLimitIconEnabled={true}
        recenterButtonEnabled={true}
        reportIncidentButtonEnabled={false}
        onRecenterButtonClick={() => {
          void recenterNavigation();
        }}
        onMapReady={() => setIsMapReady(true)}
        onMapViewControllerCreated={setMapViewController}
        onNavigationViewControllerCreated={setNavigationViewController}
        onMapClick={() => {
          if (!isNavigating) {
            setFollowPreference({ contextKey: cameraContextKey, following: false });
          }
        }}
      />

      {/* Indicador discreto mientras inicializa la ruta giro a giro */}
      {isInitializing && (
        <View
          pointerEvents="none"
          className="absolute top-28 self-center flex-row items-center px-4 py-2 rounded-full bg-[#12131A]/95 border border-gold/40"
        >
          <ActivityIndicator size="small" color={THEME_COLORS.gold} />
          <Text className="text-platinum font-montserrat-semibold text-xs ml-2">
            Calculando ruta giro a giro...
          </Text>
        </View>
      )}

      {/* Controles flotantes de navegación activa (recentrar + voz + vista general) o dock en modo libre */}
      {isNavigating ? (
        <View
          className="absolute right-4 gap-2.5"
          style={{ bottom: Math.max(bottomOffset, 100) + 20 }}
        >
          <TouchableOpacity
            onPress={() => {
              void recenterNavigation();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Centrar cámara en dirección de marcha"
            className="w-12 h-12 rounded-full bg-[#12131A]/95 border border-gold/45 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons name="navigate" size={20} color={THEME_COLORS.gold} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              void toggleMute();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isMuted ? 'Activar voz de navegación' : 'Silenciar voz de navegación'}
            className="w-12 h-12 rounded-full bg-[#12131A]/95 border border-white/15 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={isMuted ? THEME_COLORS.ash : THEME_COLORS.gold}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showOverview}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Ver resumen completo de la ruta"
            className="w-12 h-12 rounded-full bg-[#12131A]/95 border border-white/15 items-center justify-center shadow-lg shadow-black"
          >
            <Ionicons name="map-outline" size={20} color={THEME_COLORS.platinum} />
          </TouchableOpacity>
        </View>
      ) : (
        <MapControlsDock
          isPolyline={isPolyline}
          onTogglePolyline={() => setIsPolyline((prev) => !prev)}
          isFollowingUser={isFollowingUser}
          onToggleFollowUser={() =>
            setFollowPreference({
              contextKey: cameraContextKey,
              following: !isFollowingUser,
            })
          }
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
