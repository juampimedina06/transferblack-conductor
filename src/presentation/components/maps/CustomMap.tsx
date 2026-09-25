import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { FAB } from "../ui/FAB";
import * as Location from 'expo-location';

interface Props extends ViewProps {
  showUserLocation?: boolean;
  initialLocation: { latitude: number; longitude: number };
  currentLocation: Location.LocationObject | null;
}

// Dark theme map style
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f2835" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "transit",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

export const CustomMap = ({
  initialLocation,
  currentLocation,
  showUserLocation = true,
  ...rest
}: Props) => {
  const mapRef = useRef<MapView>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  const moveCameraToLocation = (lat: number, lng: number) => {
    if (!mapRef.current) return;
    mapRef.current.animateCamera({
      center: { latitude: lat, longitude: lng },
    });
  };

  const moveToCurrentLocation = () => {
    if (currentLocation) {
      moveCameraToLocation(currentLocation.coords.latitude, currentLocation.coords.longitude);
      setIsFollowingUser(true);
    }
  };

  useEffect(() => {
    if (currentLocation && isFollowingUser) {
      moveCameraToLocation(currentLocation.coords.latitude, currentLocation.coords.longitude);
    }
  }, [currentLocation, isFollowingUser]);

  return (
    <View {...rest}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
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
      />

      <FAB
        iconName={isFollowingUser ? "walk-outline" : "accessibility-outline"}
        onPress={() => setIsFollowingUser(!isFollowingUser)}
        style={{ bottom: 80, right: 20 }}
      />

      <FAB
        iconName="compass-outline"
        onPress={moveToCurrentLocation}
        style={{ bottom: 20, right: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: "100%",
  },
});
