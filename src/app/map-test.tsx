import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '@/core/constants/theme';

const CORDOBA_REGION: Region = {
  latitude: -31.4201,
  longitude: -64.1888,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapTestScreen() {
  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={CORDOBA_REGION}
        showsUserLocation
        showsMyLocationButton
        showsCompass
      >
        <Marker
          coordinate={{
            latitude: CORDOBA_REGION.latitude,
            longitude: CORDOBA_REGION.longitude,
          }}
          title="Córdoba Capital"
          description="Punto de prueba Google Maps - TransferBlack"
        />
      </MapView>

      <SafeAreaView style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Volver"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color={THEME_COLORS.gold} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Test Google Maps</Text>
            <Text style={styles.subtitle}>Córdoba, Argentina</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME_COLORS.obsidian,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 12, 0.85)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME_COLORS.glassBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME_COLORS.obsidianCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: THEME_COLORS.platinum,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: THEME_COLORS.ash,
    fontSize: 12,
  },
});
