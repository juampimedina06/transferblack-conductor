import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useWalletStore } from '../../../presentation/wallet/store/useWalletStore';
import * as Haptics from 'expo-haptics';
import { LiquidGlassContainer } from '../../../presentation/components/ui/LiquidGlassContainer';
import type { PayoutRequestItem } from '../../../core/wallet/interface/wallet.interface';
import { getNormalizedPayoutStatusMeta } from '../../../core/wallet/utils/wallet.utils';

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function PayoutHistoryScreen() {
  const {
    payoutsHistory,
    payoutsPagination,
    isLoadingPayouts,
    fetchPayoutsHistory,
  } = useWalletStore();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchPayoutsHistory(1, 20);
  }, [fetchPayoutsHistory]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPayoutsHistory(1, 20);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (
      loadingMore ||
      isLoadingPayouts ||
      !payoutsPagination ||
      payoutsPagination.page >= payoutsPagination.total_pages
    ) {
      return;
    }

    setLoadingMore(true);
    await fetchPayoutsHistory(payoutsPagination.page + 1, 20);
    setLoadingMore(false);
  };

  const handleOpenReceipt = (url?: string | null) => {
    if (!url) return;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se puede abrir el enlace del comprobante.');
      }
    });
  };

  const renderPayoutItem = useCallback(
    ({ item }: { item: PayoutRequestItem }) => {
      const badge = getNormalizedPayoutStatusMeta(item.status);
      const grossAmount = parseFloat(item.amount);
      const feeAmount = item.fee_amount ? parseFloat(item.fee_amount) : 0;
      const netAmount = item.net_amount
        ? parseFloat(item.net_amount)
        : feeAmount > 0
        ? grossAmount - feeAmount
        : grossAmount;
      const isFailed = badge.isFailed;
      const isPaid = item.status === 'completed' || item.status === 'paid';
      const isPending = item.status === 'pending' || item.status === 'requested';
      const isImmediate = item.type === 'immediate';

      return (
        <LiquidGlassContainer
          variant="default"
          className="rounded-2xl p-5 mb-4 border border-white/10"
        >
          {/* Header Card: Fecha, Tipo y Status Normalizado */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center flex-1 mr-2">
              <Text className="text-ash font-montserrat text-xs">
                {formatDate(item.requested_at || item.created_at)}
              </Text>
              {item.type && (
                <View
                  className={`ml-2 px-2 py-0.5 rounded-full border ${
                    isImmediate
                      ? 'bg-gold/15 border-gold/30'
                      : 'bg-white/10 border-white/15'
                  }`}
                >
                  <Text
                    className={`font-montserrat-semibold text-[10px] ${
                      isImmediate ? 'text-gold' : 'text-platinum'
                    }`}
                  >
                    {isImmediate ? 'Inmediato' : 'Semanal'}
                  </Text>
                </View>
              )}
            </View>

            {/* Badge de Estado Normalizado */}
            <View
              className={`flex-row items-center px-2.5 py-1 rounded-full border ${badge.badgeBg} ${badge.badgeBorder}`}
            >
              <Ionicons
                name={badge.iconName}
                size={14}
                className="mr-1"
                color={badge.iconColor}
              />
              <Text className={`font-montserrat-semibold text-xs ml-1 ${badge.textColor}`}>
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Monto Principal */}
          <View className="mb-3">
            <Text
              className="text-white font-montserrat-bold text-3xl"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              ${grossAmount.toFixed(2)}{' '}
              <Text className="text-ash text-sm font-montserrat">{item.currency || 'ARS'}</Text>
            </Text>

            {/* Desglose de Comisión y Neto si existe comisión */}
            {feeAmount > 0 ? (
              <View className="mt-2 bg-black/40 border border-white/5 rounded-xl p-2.5">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-ash text-[11px] font-montserrat">Comisión por retiro inmediato:</Text>
                  <Text
                    className="text-red-400 font-montserrat-semibold text-[11px]"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    -${feeAmount.toFixed(2)} ARS
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-white font-montserrat-medium text-xs">Monto neto acreditado:</Text>
                  <Text
                    className="text-emerald-400 font-montserrat-bold text-xs"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    ${netAmount.toFixed(2)} ARS
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Aviso si fue fuera de horario y está pendiente */}
          {isPending && (item.is_outside_hours || item.scheduled_for) && (
            <View className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 mb-3 flex-row items-center">
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
              <Text className="text-amber-200/95 font-montserrat-medium text-xs ml-2 flex-1">
                Agendado para procesamiento a partir de las 08:00 hs.
              </Text>
            </View>
          )}

          {/* Destino */}
          <View className="pt-1 mb-2">
            <Text className="text-ash font-montserrat text-[10px] uppercase tracking-wider mb-0.5">
              Destino
            </Text>
            <Text className="text-white font-montserrat-medium text-xs">
              {item.account_holder_name ? `${item.account_holder_name} • ` : ''}
              {item.destination_alias ? `Alias: ${item.destination_alias}` : item.destination_cbu_cvu || 'Cuenta Bancaria'}
            </Text>
            {item.destination_cbu_cvu && item.destination_alias && (
              <Text className="text-ash/70 font-montserrat text-[11px] mt-0.5">
                {item.payment_method || 'CBU/CVU'}: {item.destination_cbu_cvu}
              </Text>
            )}
          </View>

          {/* Motivo de rechazo y aclaración de reintegro de saldo */}
          {isFailed && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 mt-2">
              <View className="flex-row items-center mb-1">
                <Ionicons name="close-circle" size={17} color="#EF4444" />
                <Text className="text-red-400 font-montserrat-bold text-xs ml-1.5">
                  Solicitud Rechazada
                </Text>
              </View>
              {item.rejection_reason && (
                <Text className="text-red-200/90 font-montserrat text-xs leading-relaxed mb-2">
                  Motivo: {item.rejection_reason}
                </Text>
              )}
              <View className="flex-row items-center bg-red-500/15 border border-red-500/25 px-2.5 py-1.5 rounded-xl">
                <Ionicons name="refresh-outline" size={14} color="#F87171" />
                <Text className="text-red-200 font-montserrat-semibold text-[11px] ml-1.5 flex-1">
                  El saldo fue reintegrado a tu saldo disponible.
                </Text>
              </View>
            </View>
          )}

          {/* Referencia de transferencia y comprobante para pagados */}
          {isPaid && (
            <View className="mt-2 pt-2 border-t border-white/10">
              {item.transfer_reference && (
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-ash text-xs font-montserrat">Referencia bancaria:</Text>
                  <Text className="text-white font-montserrat-semibold text-xs">
                    {item.transfer_reference}
                  </Text>
                </View>
              )}

              {item.receipt_url && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleOpenReceipt(item.receipt_url)}
                  className="flex-row items-center justify-center bg-gold/15 border border-gold/30 rounded-2xl py-2.5 mt-2 active:bg-gold/25"
                >
                  <Ionicons name="document-text-outline" size={16} color={THEME_COLORS.gold} />
                  <Text className="text-gold font-montserrat-semibold text-xs ml-2">
                    Ver comprobante
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </LiquidGlassContainer>
      );
    },
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-white/10">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver a la billetera"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 items-center justify-center active:scale-95"
        >
          <Ionicons name="arrow-back" size={22} color={THEME_COLORS.gold} />
        </TouchableOpacity>
        <Text className="text-white font-montserrat-bold text-lg ml-3">
          Historial de Retiros
        </Text>
      </View>

      {isLoadingPayouts && payoutsHistory.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME_COLORS.gold} />
          <Text className="text-ash font-montserrat text-sm mt-3">
            Cargando historial de retiros...
          </Text>
        </View>
      ) : (
        <FlatList
          data={payoutsHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderPayoutItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={THEME_COLORS.gold}
              colors={[THEME_COLORS.gold]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color={THEME_COLORS.gold} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center px-6">
              <View className="w-16 h-16 rounded-full bg-charcoal/40 items-center justify-center mb-4">
                <Ionicons name="wallet-outline" size={32} color={THEME_COLORS.ash} />
              </View>
              <Text className="text-platinum font-montserrat-bold text-base text-center mb-1">
                No tenés solicitudes de retiro
              </Text>
              <Text className="text-ash font-montserrat text-xs text-center leading-relaxed">
                Cuando solicites el retiro de tus ganancias, vas a poder realizar el seguimiento y ver los comprobantes acá.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
