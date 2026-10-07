import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export interface MetricsRowProps {
  theme: TripOfferTheme;
  etaToPickupMinutes?: number;
  distanceToPickupKm?: number | string;
  tripDistanceKm: string;
  tripDurationMinutes: number;
}

/**
 * Fila unificada de métricas sin mini-tarjetas fragmentadas.
 * Diseño fluido, profesional y continuo estilo Uber Driver.
 */
export const MetricsRow: React.FC<MetricsRowProps> = React.memo(({
  theme,
  etaToPickupMinutes = 2,
  distanceToPickupKm,
  tripDistanceKm,
  tripDurationMinutes,
}) => {
  const pickupMetricText = distanceToPickupKm
    ? `${distanceToPickupKm} km · ${etaToPickupMinutes}m`
    : `a ${etaToPickupMinutes} min`;

  return (
    <View style={styles.container}>
      {/* 1. Recogida */}
      <View style={styles.metricItem}>
        <Ionicons name="navigate" size={13} color={theme.accent} style={styles.icon} />
        <View style={styles.textStack}>
          <Text style={[styles.caption, { color: theme.textSubtle }]}>RECOGIDA</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>
            {pickupMetricText}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.innerSurfaceBorder }]} />

      {/* 2. Distancia */}
      <View style={styles.metricItem}>
        <Ionicons name="speedometer-outline" size={14} color={theme.accent} style={styles.icon} />
        <View style={styles.textStack}>
          <Text style={[styles.caption, { color: theme.textSubtle }]}>DISTANCIA</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>
            {tripDistanceKm}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.innerSurfaceBorder }]} />

      {/* 3. Duración */}
      <View style={styles.metricItem}>
        <Ionicons name="time-outline" size={14} color={theme.accent} style={styles.icon} />
        <View style={styles.textStack}>
          <Text style={[styles.caption, { color: theme.textSubtle }]}>DURACIÓN</Text>
          <Text style={[styles.value, { color: theme.textPrimary }]}>
            ~{tripDurationMinutes} min
          </Text>
        </View>
      </View>
    </View>
  );
});

MetricsRow.displayName = 'MetricsRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  textStack: {
    flexDirection: 'column',
  },
  divider: {
    width: 1,
    height: 24,
    opacity: 0.6,
  },
  caption: {
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
});
