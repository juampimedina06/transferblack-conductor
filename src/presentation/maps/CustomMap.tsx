import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import MapView, { PROVIDER_GOOGLE, Polyline, Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { THEME_COLORS } from "../../core/constants/theme";
import { LatLng } from "../../core/location/interface/latLng.interface";
import { FAB } from "../components/ui/FAB";
import { useLocationStore } from "./store/useLocationStore";
import { useDriverTripStore } from "../trip/store/useDriverTripStore";

interface Props extends ViewProps {
  showUserLocation?: boolean;
  initialLocation: LatLng;
  bottomOffset?: number;
}

// Dark theme map style
const darkMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#242f3e" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#746855" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#242f3e" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#746855" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f2835" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f3d19c" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

export const CustomMap = ({
  initialLocation,
  showUserLocation = true,
  bottomOffset,
  ...rest
}: Props) => {
  const mapRef = useRef<MapView>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isPolyline, setIsPolyline] = useState(true);

  const targetBottom = (bottomOffset && bottomOffset > 0 ? bottomOffset : 90) + 16;
  const animatedBottom = useSharedValue(targetBottom);

  useEffect(() => {
    animatedBottom.value = withSpring(targetBottom, {
      damping: 18,
      stiffness: 150,
      mass: 0.8,
    });
  }, [targetBottom, animatedBottom]);

  const fabContainerStyle = useAnimatedStyle(() => ({
    bottom: animatedBottom.value,
  }));
  const currentOffer = useDriverTripStore((state) => state.currentOffer);
  const activeTrip = useDriverTripStore((state) => state.activeTrip);

  const activePickup = activeTrip?.pickup || currentOffer?.pickup;
  const activeDropoff = activeTrip?.dropoff || currentOffer?.dropoff;
  const activeRouteGeometry = activeTrip?.routeGeometry || currentOffer?.routeGeometry;

  const {
    lastKnownLocation,
    userLocationList,
    watchLocation,
    clearWatchLocation,
    getLocation,
  } = useLocationStore();

  // Parse route geometry from backend or fallback to straight line
  const offerRouteCoordinates = React.useMemo((): LatLng[] => {
    if (!activeRouteGeometry && !activePickup && !activeDropoff) return [];
    const geom = activeRouteGeometry;
    if (geom?.type === "MultiLineString" && Array.isArray(geom.coordinates)) {
      return geom.coordinates
        .flat()
        .map(([lng, lat]: [number, number]) => ({ latitude: lat, longitude: lng }));
    }
    if (geom?.type === "LineString" && Array.isArray(geom.coordinates)) {
      return geom.coordinates.map(([lng, lat]: [number, number]) => ({
        latitude: lat,
        longitude: lng,
      }));
    }
    // Fallback: connect pickup to dropoff if both have coords
    if (
      activePickup?.latitude &&
      activePickup?.longitude &&
      activeDropoff?.latitude &&
      activeDropoff?.longitude
    ) {
      return [
        {
          latitude: activePickup.latitude,
          longitude: activePickup.longitude,
        },
        {
          latitude: activeDropoff.latitude,
          longitude: activeDropoff.longitude,
        },
      ];
    }
    return [];
  }, [activeRouteGeometry, activePickup, activeDropoff]);

  // Ajustar la cámara a las coordenadas de la oferta o del viaje activo
  const fitCoords = useMemo<LatLng[]>(() => {
    const coords: LatLng[] = [];

    if (activePickup?.latitude && activePickup?.longitude) {
      coords.push({
        latitude: activePickup.latitude,
        longitude: activePickup.longitude,
      });
    }

    if (activeDropoff?.latitude && activeDropoff?.longitude) {
      coords.push({
        latitude: activeDropoff.latitude,
        longitude: activeDropoff.longitude,
      });
    }

    if (lastKnownLocation) {
      coords.push(lastKnownLocation);
    }

    return coords;
  }, [activePickup, activeDropoff, lastKnownLocation]);

  const shouldFitCamera = !!((currentOffer || activeTrip) && fitCoords.length > 0);
  const [wasFittingForOffer, setWasFittingForOffer] = useState(shouldFitCamera);

  // Mientras la cámara encuadra la oferta el auto-follow queda apagado. Se ajusta
  // durante el render para que el efecto se dedique a tocar el mapa, que sí es
  // un sistema externo. Antes se apagaba en cada tick de GPS, sobreescribiendo
  // que el usuario volviera a activar el seguimiento a mano.
  if (shouldFitCamera !== wasFittingForOffer) {
    setWasFittingForOffer(shouldFitCamera);
    if (shouldFitCamera) {
      setIsFollowingUser(false);
    }
  }

  useEffect(() => {
    if (!shouldFitCamera || !mapRef.current) return;
    mapRef.current.fitToCoordinates(fitCoords, {
      edgePadding: { top: 90, right: 50, bottom: 260, left: 50 },
      animated: true,
    });
  }, [shouldFitCamera, fitCoords]);

  const moveCameraToLocation = (latLng: LatLng) => {
    if (!mapRef.current) return;
    mapRef.current.animateCamera({
      center: latLng,
    });
  };

  const moveToCurrentLocation = async () => {
    if (!lastKnownLocation) {
      moveCameraToLocation(initialLocation);
    } else {
      moveCameraToLocation(lastKnownLocation);
    }

    const location = await getLocation();
    if (!location) return;

    moveCameraToLocation(location);
    setIsFollowingUser(true);
  };

  useEffect(() => {
    watchLocation();

    return () => {
      clearWatchLocation();
    };
  }, [watchLocation, clearWatchLocation]);

  useEffect(() => {
    if (lastKnownLocation && isFollowingUser && !currentOffer) {
      moveCameraToLocation(lastKnownLocation);
    }
  }, [lastKnownLocation, isFollowingUser, currentOffer]);

  return (
    <View style={[styles.container, rest.style]} {...rest}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        loadingEnabled={true}
        loadingIndicatorColor={THEME_COLORS.gold}
        loadingBackgroundColor={THEME_COLORS.obsidian}
        customMapStyle={darkMapStyle}
        showsPointsOfInterests={false}
        showsCompass={false}
        onTouchStart={() => setIsFollowingUser(false)}
        showsUserLocation={showUserLocation}
        initialRegion={{
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {/* Past Driver Trail */}
        {isPolyline && userLocationList.length > 1 && (
          <Polyline
            coordinates={userLocationList}
            strokeColor={THEME_COLORS.gold}
            strokeWidth={4}
          />
        )}

        {/* Offer Route Polyline */}
        {offerRouteCoordinates.length > 1 && (
          <Polyline
            coordinates={offerRouteCoordinates}
            strokeColor="#1E293B"
            strokeWidth={7}
          />
        )}
        {offerRouteCoordinates.length > 1 && (
          <Polyline
            coordinates={offerRouteCoordinates}
            strokeColor={THEME_COLORS.gold}
            strokeWidth={4}
          />
        )}

        {/* Pickup Marker */}
        {activePickup?.latitude && activePickup?.longitude && (
          <Marker
            coordinate={{
              latitude: activePickup.latitude,
              longitude: activePickup.longitude,
            }}
            title="Punto de encuentro"
            description={activePickup.address}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center border-2 border-white shadow-lg shadow-black">
              <Ionicons name="person" size={18} color="white" />
            </View>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {activeDropoff?.latitude && activeDropoff?.longitude && (
          <Marker
            coordinate={{
              latitude: activeDropoff.latitude,
              longitude: activeDropoff.longitude,
            }}
            title="Destino"
            description={activeDropoff.address}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-10 h-10 rounded-full border border-black/80 bg-black/10 items-center justify-center">
              <View className="w-6 h-6 rounded-full bg-black items-center justify-center border border-white">
                <View className="w-2.5 h-2.5 bg-white rounded-sm" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Map Control Toggles (positioned bottom-right, dynamically adapting above bottom sheet/card) */}
      <Animated.View 
        className="absolute right-4 gap-2.5 z-10" 
        style={fabContainerStyle}
        pointerEvents="box-none"
      >
        <FAB
          iconName={isPolyline ? "eye-outline" : "eye-off-outline"}
          onPress={() => setIsPolyline(!isPolyline)}
          style={{ position: 'relative' }}
        />

        <FAB
          iconName={isFollowingUser ? "walk-outline" : "accessibility-outline"}
          onPress={() => setIsFollowingUser(!isFollowingUser)}
          style={{ position: 'relative' }}
        />

        <FAB
          iconName="compass-outline"
          onPress={moveToCurrentLocation}
          style={{ position: 'relative' }}
        />
      </Animated.View>
    </View>
  );
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
