import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useActiveTripNavigation } from './hooks/useActiveTripNavigation';

interface Props extends ViewProps {
  showUserLocation?: boolean;
  initialLocation: LatLng;
  bottomOffset?: number;
}

const OFFER_POLYLINE_ID = 'transferblack-offer-route';
const DRIVER_TRAIL_POLYLINE_ID = 'transferblack-driver-trail';
const PICKUP_MARKER_ID = 'transferblack-pickup-marker';
const DROPOFF_MARKER_ID = 'transferblack-dropoff-marker';

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
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isPolyline, setIsPolyline] = useState(false);

  const mapControllerRef = useRef<MapViewController | null>(null);
  const isMapReadyRef = useRef(false);
  useEffect(() => {
    mapControllerRef.current = mapViewController;
    isMapReadyRef.current = isMapReady;
  }, [mapViewController, isMapReady]);

  const currentOffer = useDriverTripStore((state) => state.currentOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);
  const locationStatus = usePermissionsStore((state) => state.locationStatus);
  const checkLocationPermission = usePermissionsStore((state) => state.checkLocationPermission);
  const hasLocationPermission = locationStatus === PermissionStatus.GRANTED;

  useEffect(() => {
    if (locationStatus === PermissionStatus.CHECKING) {
      void checkLocationPermission();
    }
  }, [locationStatus, checkLocationPermission]);

  const {
    lastKnownLocation,
    userLocationList,
    watchLocation,
    clearWatchLocation,
    getLocation,
  } = useLocationStore();

  // Mantiene nuestro sistema actual de GPS / Zustand / Socket.IO activo solo con permiso otorgado
  useEffect(() => {
    if (!hasLocationPermission) return;
    watchLocation();
    return () => {
      clearWatchLocation();
    };
  }, [hasLocationPermission, watchLocation, clearWatchLocation]);

  // Navegación giro a giro oficial de Google Navigation SDK durante el viaje activo
  const {
    isNavigating,
    isInitializing,
    isMuted,
    toggleMute,
    recenterNavigation,
    showOverview,
  } = useActiveTripNavigation({
    sdk,
    activeTrip,
    navigationViewController: isMapReady ? navigationViewController : null,
  });

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

  // Dibuja / limpia la ruta y marcadores de la oferta entrante en modo mapa libre
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

    if (isNavigating || !currentOffer) {
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
          visible: true,
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
  }, [currentOffer, isMapReady, isNavigating, mapViewController, offerRouteCoordinates]);

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
          visible: true,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [isMapReady, isNavigating, isPolyline, mapViewController, userLocationList]);

  // Seguimiento suave de cámara en modo libre (cuando no hay navegación activa ni oferta)
  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !isMapReady || !lastKnownLocation || !isFollowingUser || isNavigating || currentOffer) {
      return;
    }

    try {
      void Promise.resolve(
        controller.moveCamera({
          target: toNavLatLng(lastKnownLocation),
          zoom: 16,
        })
      ).catch(() => {});
    } catch {
      // No-op
    }
  }, [currentOffer, isFollowingUser, isMapReady, isNavigating, lastKnownLocation, mapViewController]);

  const moveToCurrentLocation = useCallback(async () => {
    if (isNavigating) {
      await recenterNavigation();
      return;
    }

    setIsFollowingUser(true);
    const target = lastKnownLocation || initialLocation;
    if (isMapReadyRef.current && mapControllerRef.current) {
      try {
        void Promise.resolve(
          mapControllerRef.current.moveCamera({
            target: toNavLatLng(target),
            zoom: 16,
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
            zoom: 16,
          })
        ).catch(() => {});
      } catch {
        // No-op
      }
    }
  }, [getLocation, initialLocation, isNavigating, lastKnownLocation, recenterNavigation]);

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
        navigationUIEnabledPreference={NavigationUIEnabledPreference.DISABLED}
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
        onMapReady={() => setIsMapReady(true)}
        onMapViewControllerCreated={setMapViewController}
        onNavigationViewControllerCreated={setNavigationViewController}
        onMapClick={() => {
          if (!isNavigating) {
            setIsFollowingUser(false);
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

      {/* Controles flotantes de navegación activa (voz + vista general) o dock en modo libre */}
      {isNavigating ? (
        <View
          className="absolute right-4 gap-2.5"
          style={{ bottom: Math.max(bottomOffset, 100) + 20 }}
        >
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
          onToggleFollowUser={() => setIsFollowingUser((prev) => !prev)}
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
    watchLocation();
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
        <View className="w-full max-w-[320px] rounded-2xl p-5 bg-[#12131A] border border-white/10 items-center">
          <View className="w-12 h-12 rounded-2xl bg-gold/15 border border-gold/30 items-center justify-center mb-3">
            <Ionicons name="navigate-outline" size={24} color={THEME_COLORS.gold} />
          </View>
          <Text className="text-white font-montserrat-semibold text-base text-center mb-1">
            Google Navigation SDK
          </Text>
          <Text className="text-ash font-montserrat text-xs text-center leading-5">
            La navegación giro a giro requiere una Development Build compilada (no está disponible en Expo Go). El GPS y Socket.IO siguen activos.
          </Text>
        </View>
      </View>
    );
  }

  return <GoogleNavigationMap {...props} sdk={sdk} />;
};

export default CustomMap;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...StyleSheet.absoluteFill,
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
});
