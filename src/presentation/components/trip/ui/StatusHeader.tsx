import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export type TripStatusPhase =
  | 'navigating_to_pickup'
  | 'waiting_passenger'
  | 'in_trip'
  | 'approaching_dropoff'
  | 'completed'
  | 'cancelled';

export interface StatusHeaderProps {
  theme: TripOfferTheme;
  phase: TripStatusPhase;
  title: string;
  subtitle?: string;
  etaMinutes?: number | string | null;
  distanceKm?: string | null;
  statusDotColor?: string;
}

/**
 * Header de estado con jerarquía visual de alto impacto:
 * - Una línea clara con el estado y acción siguiente.
 * - ETA grande (28-32pt, 700, tabular-nums) + distancia restante tenue.
 * - Anuncio accesible inmediato ante cada transición de fase.
 */
export const StatusHeader: React.FC<StatusHeaderProps> = React.memo(({
  theme,
  phase,
  title,
  subtitle,
  etaMinutes,
  distanceKm,
  statusDotColor,
}) => {
  const prevPhaseRef = useRef<TripStatusPhase | null>(null);

  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      const announcement = etaMinutes != null && etaMinutes !== ''
        ? `${title}. Tiempo estimado: ${etaMinutes} minutos.`
        : title;
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  }, [phase, title, etaMinutes]);

  const activeDotColor = statusDotColor || (
    phase === 'waiting_passenger'
      ? theme.cashAccent
      : phase === 'approaching_dropoff'
        ? theme.accent
        : phase === 'completed'
          ? theme.cashAccent
          : phase === 'cancelled'
            ? theme.urgentAccent
            : theme.accent
  );

  const displayEta = etaMinutes != null && etaMinutes !== '' ? `${etaMinutes}` : null;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel={`${title}. ${subtitle || ''}. ${displayEta ? `Tiempo estimado ${displayEta} minutos.` : ''}`}
    >
      <View style={styles.leftCol}>
        {/* Status Line */}
        <View style={styles.statusPill}>
          <View
            style={[
              styles.pulseDot,
              {
                backgroundColor: activeDotColor,
                shadowColor: activeDotColor,
              },
            ]}
          />
          <Text
            numberOfLines={1}
            style={[styles.statusTitle, { color: theme.textPrimary }]}
          >
            {title}
          </Text>
        </View>

        {/* Subtitle / Next Action */}
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.subtitle, { color: theme.textMuted }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* ETA + Distance Block */}
      {displayEta ? (
        <View style={styles.rightCol}>
          <View style={styles.etaRow}>
            <Text
              style={[
                styles.etaNumber,
                { color: theme.textPrimary },
              ]}
            >
              {displayEta}
            </Text>
            <Text style={[styles.etaUnit, { color: theme.textMuted }]}>
              min
            </Text>
          </View>
          {distanceKm ? (
            <Text style={[styles.distanceText, { color: theme.textSubtle }]}>
              {distanceKm}
            </Text>
          ) : null}
        </View>
      ) : distanceKm ? (
        <View style={styles.rightCol}>
          <Text
            style={[
              styles.etaNumber,
              { color: theme.textPrimary, fontSize: 20 },
            ]}
          >
            {distanceKm}
          </Text>
          <Text style={[styles.distanceText, { color: theme.textSubtle }]}>
            restantes
          </Text>
        </View>
      ) : null}
    </View>
  );
});

StatusHeader.displayName = 'StatusHeader';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minHeight: 52,
  },
  leftCol: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 2,
    marginLeft: 16,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  etaNumber: {
    fontSize: 28,
    fontFamily: 'Montserrat_700Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  etaUnit: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  distanceText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    fontVariant: ['tabular-nums'],
    marginTop: 1,
  },
});
