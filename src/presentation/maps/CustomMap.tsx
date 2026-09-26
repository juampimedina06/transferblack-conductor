import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";
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
  ...rest
}: Props) => {
  const mapRef = useRef<MapView>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [isPolyline, setIsPolyline] = useState(true);
  const currentOffer = useDriverTripStore((state) => state.currentOffer);

  const {
    lastKnownLocation,
    userLocationList,
    watchLocation,
    clearWatchLocation,
    getLocation,
  } = useLocationStore();

  // Parse route geometry from backend or fallback to straight line
  const offerRouteCoordinates = React.useMemo((): LatLng[] => {
    if (!currentOffer) return [];
    const geom = currentOffer.routeGeometry;
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
      currentOffer.pickup?.latitude &&
      currentOffer.pickup?.longitude &&
      currentOffer.dropoff?.latitude &&
      currentOffer.dropoff?.longitude
    ) {
      return [
        {
          latitude: currentOffer.pickup.latitude,
          longitude: currentOffer.pickup.longitude,
        },
        {
          latitude: currentOffer.dropoff.latitude,
          longitude: currentOffer.dropoff.longitude,
        },
      ];
    }
    return [];
  }, [currentOffer]);

  // Adjust camera to fit offer coordinates
  useEffect(() => {
    if (!currentOffer || !mapRef.current) return;
    const coords: LatLng[] = [];

    if (currentOffer.pickup?.latitude && currentOffer.pickup?.longitude) {
      coords.push({
        latitude: currentOffer.pickup.latitude,
        longitude: currentOffer.pickup.longitude,
      });
    }

    if (currentOffer.dropoff?.latitude && currentOffer.dropoff?.longitude) {
      coords.push({
        latitude: currentOffer.dropoff.latitude,
        longitude: currentOffer.dropoff.longitude,
      });
    }

    if (lastKnownLocation) {
      coords.push(lastKnownLocation);
    }

    if (coords.length > 0) {
      setIsFollowingUser(false);
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 90, right: 50, bottom: 260, left: 50 },
        animated: true,
      });
    }
  }, [currentOffer, lastKnownLocation]);

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
  }, []);

  useEffect(() => {
    if (lastKnownLocation && isFollowingUser && !currentOffer) {
      moveCameraToLocation(lastKnownLocation);
    }
  }, [lastKnownLocation, isFollowingUser, currentOffer]);

  return (
    <View {...rest}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
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
        {currentOffer?.pickup?.latitude && currentOffer?.pickup?.longitude && (
          <Marker
            coordinate={{
              latitude: currentOffer.pickup.latitude,
              longitude: currentOffer.pickup.longitude,
            }}
            title="Punto de encuentro"
            description={currentOffer.pickup.address}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-9 h-9 rounded-full bg-blue-600 items-center justify-center border-2 border-white shadow-lg shadow-black">
              <Ionicons name="person" size={18} color="white" />
            </View>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {currentOffer?.dropoff?.latitude && currentOffer?.dropoff?.longitude && (
          <Marker
            coordinate={{
              latitude: currentOffer.dropoff.latitude,
              longitude: currentOffer.dropoff.longitude,
            }}
            title="Destino"
            description={currentOffer.dropoff.address}
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

      <FAB
        iconName={isPolyline ? "eye-outline" : "eye-off-outline"}
        onPress={() => setIsPolyline(!isPolyline)}
        style={{ bottom: 220, right: 20 }}
      />

      <FAB
        iconName={isFollowingUser ? "walk-outline" : "accessibility-outline"}
        onPress={() => setIsFollowingUser(!isFollowingUser)}
        style={{ bottom: 158, right: 20 }}
      />

      <FAB
        iconName="compass-outline"
        onPress={moveToCurrentLocation}
        style={{ bottom: 96, right: 20 }}
      />
    </View>
  );
};

export default CustomMap;

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
});
