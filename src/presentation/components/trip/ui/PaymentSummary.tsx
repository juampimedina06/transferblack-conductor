import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export interface PaymentSummaryProps {
  theme: TripOfferTheme;
  totalFare: number;
  isCash: boolean;
  paymentLabel: string;
  paymentIcon?: 'cash-outline' | 'card-outline' | 'business-outline';
  tollsAmount?: number;
  waitingChargeAmount?: number;
  currency?: string;
}

/**
 * Resumen de pago continuo con jerarquía cristalina:
 * - Destaca el modo de cobro (Efectivo vs Digital acreditado).
 * - Muestra desglose en hairlines sutiles (peajes, espera).
 * - Números grandes con fontVariant tabular-nums para evitar saltos.
 */
export const PaymentSummary: React.FC<PaymentSummaryProps> = React.memo(({
  theme,
  totalFare,
  isCash,
  paymentLabel,
  paymentIcon = isCash ? 'cash-outline' : 'card-outline',
  tollsAmount = 0,
  waitingChargeAmount = 0,
  currency = 'ARS',
}) => {
  const currencySymbol = currency === 'USD' ? 'USD ' : '$';
  const hasExtras = tollsAmount > 0 || waitingChargeAmount > 0;
  const baseFare = Math.max(0, totalFare - tollsAmount - waitingChargeAmount);

  return (
    <View style={styles.container}>
      {/* Encabezado de Cobro */}
      <View style={styles.headerRow}>
        <View style={styles.methodBadge}>
          <Ionicons
            name={paymentIcon}
            size={14}
            color={isCash ? theme.cashAccent : theme.accent}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.methodLabel,
              { color: isCash ? theme.cashAccent : theme.textPrimary },
            ]}
          >
            {isCash ? 'COBRO EN EFECTIVO' : `PAGO DIGITAL · ${paymentLabel.toUpperCase()}`}
          </Text>
        </View>

        <Text
          style={[
            styles.statusNotice,
            { color: isCash ? theme.cashAccent : theme.textMuted },
          ]}
        >
          {isCash ? 'Cobrar en mano' : 'Acreditado ($0)'}
        </Text>
      </View>

      {/* Importe Principal */}
      <View style={styles.amountRow}>
        <Text style={[styles.amountLabel, { color: theme.textSecondary }]}>
          {isCash ? 'Monto a percibir' : 'Tarifa del viaje'}
        </Text>
        <Text
          style={[
            styles.amountValue,
            {
              color: isCash ? theme.cashAccent : theme.textPrimary,
            },
          ]}
        >
          {currencySymbol}{totalFare.toLocaleString('es-AR')}
        </Text>
      </View>

      {/* Desglose de Extras (solo si existen) */}
      {hasExtras && (
        <View
          style={[
            styles.breakdownContainer,
            { borderColor: theme.innerSurfaceBorder },
          ]}
        >
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: theme.textMuted }]}>
              Tarifa base
            </Text>
            <Text style={[styles.breakdownValue, { color: theme.textSecondary }]}>
              {currencySymbol}{baseFare.toLocaleString('es-AR')}
            </Text>
          </View>

          {waitingChargeAmount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textMuted }]}>
                Tiempo de espera
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.accent }]}>
                +{currencySymbol}{waitingChargeAmount.toLocaleString('es-AR')}
              </Text>
            </View>
          )}

          {tollsAmount > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.textMuted }]}>
                Peajes / Adicionales
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.accent }]}>
                +{currencySymbol}{tollsAmount.toLocaleString('es-AR')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Nota legal / informativa sutil */}
      <Text style={[styles.footnote, { color: theme.textSubtle }]}>
        {isCash
          ? 'Cobrá este importe exacto al pasajero antes de completar el viaje.'
          : 'El pago se procesa electrónicamente y se liquida en tu Bóveda.'}
      </Text>
    </View>
  );
});

PaymentSummary.displayName = 'PaymentSummary';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodLabel: {
    fontSize: 10,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  statusNotice: {
    fontSize: 10,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.3,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
  },
  amountValue: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  breakdownContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
    gap: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_500Medium',
  },
  breakdownValue: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 6,
    lineHeight: 14,
  },
});
