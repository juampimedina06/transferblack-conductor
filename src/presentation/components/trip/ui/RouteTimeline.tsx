import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export interface RouteTimelineProps {
  theme: TripOfferTheme;
  pickupAddress: string;
  dropoffAddress: string;
  pickupEtaMinutes?: number;
  dropoffEtaMinutes?: number;
  intermediateStops?: Array<{ address: string; label?: string }>;
}

/**
 * Visualizador de ruta unificado y continuo sin cajas anidadas.
 * Fluye naturalmente sobre la superficie de vidrio principal.
 */
export const RouteTimeline: React.FC<RouteTimelineProps> = React.memo(({
  theme,
  pickupAddress,
  dropoffAddress,
  pickupEtaMinutes = 2,
  dropoffEtaMinutes,
  intermediateStops = [],
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Punto de Retiro (Pickup) */}
      <View style={styles.stopRow}>
        <View style={styles.indicatorCol}>
          <View
            style={[
              styles.originDot,
              {
                backgroundColor: theme.cashAccent,
                shadowColor: theme.cashAccent,
              },
            ]}
          />
          <View style={[styles.connectorLine, { backgroundColor: theme.innerSurfaceBorder }]} />
        </View>

        <View style={styles.addressCol}>
          <View style={styles.labelRow}>
            <Text style={[styles.badgeLabel, { color: theme.cashAccent }]}>PUNTO DE RETIRO</Text>
            {pickupEtaMinutes != null && (
              <Text style={[styles.etaLabel, { color: theme.textMuted }]}>
                · a ~{pickupEtaMinutes} min
              </Text>
            )}
          </View>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.addressText, { color: theme.textPrimary }]}
          >
            {pickupAddress || 'Ubicación de partida'}
          </Text>
        </View>
      </View>

      {/* Paradas Intermedias (si las hay) */}
      {intermediateStops.map((stop, idx) => (
        <View key={`${stop.address}-${idx}`} style={styles.stopRow}>
          <View style={styles.indicatorCol}>
            <View
              style={[
                styles.intermediateDot,
                {
                  backgroundColor: theme.accent,
                  borderColor: theme.glassBorderColor,
                },
              ]}
            />
            <View style={[styles.connectorLine, { backgroundColor: theme.innerSurfaceBorder }]} />
          </View>

          <View style={styles.addressCol}>
            <Text style={[styles.badgeLabel, { color: theme.textMuted }]}>
              {stop.label || `PARADA ${idx + 1}`}
            </Text>
            <Text
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[styles.addressText, { color: theme.textSecondary }]}
            >
              {stop.address}
            </Text>
          </View>
        </View>
      ))}

      {/* 2. Punto de Destino (Dropoff) */}
      <View style={styles.stopRow}>
        <View style={styles.indicatorCol}>
          <View
            style={[
              styles.destinationSquare,
              {
                backgroundColor: theme.accent,
                shadowColor: theme.accent,
              },
            ]}
          />
        </View>

        <View style={styles.addressCol}>
          <View style={styles.labelRow}>
            <Text style={[styles.badgeLabel, { color: theme.accent }]}>DESTINO FINAL</Text>
            {dropoffEtaMinutes != null && (
              <Text style={[styles.etaLabel, { color: theme.textMuted }]}>
                · ~{dropoffEtaMinutes} min
              </Text>
            )}
          </View>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.addressText, { color: theme.textSecondary }]}
          >
            {dropoffAddress || 'Destino no especificado'}
          </Text>
        </View>
      </View>
    </View>
  );
});

RouteTimeline.displayName = 'RouteTimeline';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  indicatorCol: {
    width: 22,
    alignItems: 'center',
    paddingTop: 3,
  },
  originDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  intermediateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  connectorLine: {
    width: 1.5,
    height: 32,
    marginVertical: 2,
    opacity: 0.7,
  },
  destinationSquare: {
    width: 8,
    height: 8,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  addressCol: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  etaLabel: {
    fontSize: 9,
    fontFamily: 'Montserrat_500Medium',
    marginLeft: 4,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 18,
    marginTop: 2,
  },
});
