import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export interface PassengerRowProps {
  theme: TripOfferTheme;
  name: string;
  avatarLetter: string;
  rating?: number | string;
  isVip?: boolean;
  isThirdParty?: boolean;
  preferences?: string[];
  unreadMessagesCount?: number;
  onCall: () => void;
  onChat: () => void;
  onEmergency?: () => void;
}

const getPreferenceIcon = (pref: string): keyof typeof Ionicons.glyphMap => {
  const lower = pref.toLowerCase();
  if (
    lower.includes('aire') ||
    lower.includes('clima') ||
    lower.includes('temp') ||
    lower.includes('frio') ||
    lower.includes('calor')
  ) {
    return 'snow-outline';
  }
  if (
    lower.includes('silencio') ||
    lower.includes('quiet') ||
    lower.includes('tranquil')
  ) {
    return 'volume-mute-outline';
  }
  if (
    lower.includes('música') ||
    lower.includes('musica') ||
    lower.includes('radio')
  ) {
    return 'musical-notes-outline';
  }
  if (lower.includes('convers') || lower.includes('charla')) {
    return 'chatbubbles-outline';
  }
  if (lower.includes('equipaje') || lower.includes('valija') || lower.includes('maleta')) {
    return 'briefcase-outline';
  }
  return 'sparkles-outline';
};

/**
 * Fila unificada de Pasajero para el Cockpit de Conducción:
 * - Avatar con monograma y borde de acento
 * - Nombre, rating tabular y chips sutiles de vidrio (VIP, equipaje, confort)
 * - Botones circulares con target táctil >= 44x44 (Llamar, Chat con badge, SOS)
 */
export const PassengerRow: React.FC<PassengerRowProps> = React.memo(({
  theme,
  name,
  avatarLetter,
  rating = '5.0',
  isVip = true,
  isThirdParty = false,
  preferences = [],
  unreadMessagesCount = 0,
  onCall,
  onChat,
  onEmergency,
}) => {
  return (
    <View style={styles.container}>
      {/* Información de Pasajero */}
      <View style={styles.passengerInfoCol}>
        <View style={styles.topInfoRow}>
          {/* Avatar Monograma */}
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.accentBorder,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.accent }]}>
              {avatarLetter}
            </Text>
          </View>

          {/* Nombre y Rating */}
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                style={[styles.nameText, { color: theme.textPrimary }]}
              >
                {name}
              </Text>
              {isVip && (
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={theme.accent}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>

            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={theme.accent} />
              <Text
                style={[
                  styles.ratingText,
                  { color: theme.textSecondary },
                ]}
              >
                {typeof rating === 'number' ? rating.toFixed(1) : rating}
              </Text>
              <Text style={[styles.tagText, { color: theme.textMuted }]}>
                {isThirdParty ? '· Invitado' : '· TransferBlack'}
              </Text>
            </View>
          </View>
        </View>

        {/* Chips de Vidrio (Preferencias / VIP / Equipaje) */}
        {(isVip || preferences.length > 0) && (
          <View style={styles.chipsContainer}>
            {isVip && (
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.accentSoft,
                    borderColor: theme.accentBorder,
                  },
                ]}
              >
                <Ionicons name="sparkles" size={10} color={theme.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.chipText, { color: theme.accent }]}>VIP</Text>
              </View>
            )}

            {preferences.slice(0, 3).map((pref, idx) => (
              <View
                key={`${pref}-${idx}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.innerSurfaceBg,
                    borderColor: theme.innerSurfaceBorder,
                  },
                ]}
              >
                <Ionicons
                  name={getPreferenceIcon(pref)}
                  size={10}
                  color={theme.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, { color: theme.textSecondary }]}>
                  {pref}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Botones de Acción Circulares (Targets >= 44x44) */}
      <View style={styles.actionsRow}>
        {/* SOS */}
        {onEmergency && (
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onEmergency();
            }}
            accessibilityRole="button"
            accessibilityLabel="Botón de emergencia SOS"
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: theme.urgentSoft,
                borderColor: 'rgba(239, 68, 68, 0.4)',
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}
          >
            <Ionicons name="warning" size={18} color={theme.urgentAccent} />
          </Pressable>
        )}

        {/* Llamar */}
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCall();
          }}
          accessibilityRole="button"
          accessibilityLabel="Llamar al pasajero"
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: theme.innerSurfaceBg,
              borderColor: theme.innerSurfaceBorder,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons name="call" size={17} color={theme.textPrimary} />
        </Pressable>

        {/* Chat con badge */}
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChat();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Chatear con el pasajero${unreadMessagesCount > 0 ? `, ${unreadMessagesCount} mensajes no leídos` : ''}`}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accentBorder,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={17} color={theme.accent} />
          {unreadMessagesCount > 0 && (
            <View
              style={[
                styles.unreadBadge,
                { backgroundColor: theme.urgentAccent },
              ]}
            >
              <Text style={styles.unreadBadgeText}>
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
});

PassengerRow.displayName = 'PassengerRow';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  passengerInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  topInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
  },
  nameBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 15,
    fontFamily: 'Montserrat_700Bold',
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    fontVariant: ['tabular-nums'],
    marginLeft: 3,
  },
  tagText: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
    marginLeft: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: 'Montserrat_700Bold',
  },
});
