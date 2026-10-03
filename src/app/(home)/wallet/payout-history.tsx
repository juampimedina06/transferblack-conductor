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
import type {
  PayoutRequestItem,
  PayoutRequestStatus,
} from '../../../core/wallet/interface/wallet.interface';

const getStatusBadge = (status: PayoutRequestStatus) => {
  switch (status) {
    case 'requested':
      return {
        label: 'Pendiente',
        bgColor: 'bg-amber-500/15',
        borderColor: 'border-amber-500/40',
        textColor: 'text-amber-400',
        icon: 'time-outline' as const,
      };
    case 'approved':
      return {
        label: 'En Proceso',
        bgColor: 'bg-blue-500/15',
        borderColor: 'border-blue-500/40',
        textColor: 'text-blue-400',
        icon: 'hourglass-outline' as const,
      };
    case 'paid':
      return {
        label: 'Pagado',
        bgColor: 'bg-emerald-500/15',
        borderColor: 'border-emerald-500/40',
        textColor: 'text-emerald-400',
        icon: 'checkmark-circle-outline' as const,
      };
    case 'rejected':
      return {
        label: 'Rechazado',
        bgColor: 'bg-red-500/15',
        borderColor: 'border-red-500/40',
        textColor: 'text-red-400',
        icon: 'close-circle-outline' as const,
      };
    default:
      return {
        label: status,
        bgColor: 'bg-charcoal/40',
        borderColor: 'border-charcoal',
        textColor: 'text-platinum',
        icon: 'ellipse-outline' as const,
      };
  }
};

const formatDate = (dateStr: string) => {
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

  const handleOpenReceipt = (url: string | null) => {
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
      const badge = getStatusBadge(item.status);
      const formattedAmount = parseFloat(item.amount).toFixed(2);

      return (
        <View className="bg-charcoal/30 border border-charcoal/60 rounded-2xl p-5 mb-4 shadow-sm">
          {/* Header Card: Fecha y Status */}
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-ash font-montserrat text-xs">
              {formatDate(item.requested_at)}
            </Text>

            <View
              className={`flex-row items-center px-2.5 py-1 rounded-full border ${badge.bgColor} ${badge.borderColor}`}
            >
              <Ionicons
                name={badge.icon}
                size={14}
                className="mr-1"
                color={
                  item.status === 'paid'
                    ? '#10B981'
                    : item.status === 'rejected'
                    ? '#EF4444'
                    : item.status === 'approved'
                    ? '#3B82F6'
                    : '#F59E0B'
                }
              />
              <Text className={`font-montserrat-semibold text-xs ml-1 ${badge.textColor}`}>
                {badge.label}
              </Text>
            </View>
          </View>

          {/* Monto */}
          <Text className="text-platinum font-montserrat-bold text-3xl mb-3">
            ${formattedAmount}{' '}
            <Text className="text-ash text-sm font-montserrat">{item.currency || 'ARS'}</Text>
          </Text>

          {/* Destino */}
          <View className="bg-obsidian/40 rounded-xl p-3 mb-2">
            <Text className="text-ash text-xs font-montserrat mb-0.5">Destino</Text>
            <Text className="text-platinum font-montserrat-medium text-xs">
              {item.account_holder_name ? `${item.account_holder_name} • ` : ''}
              {item.destination_alias ? `Alias: ${item.destination_alias}` : item.destination_cbu_cvu || 'Cuenta Bancaria'}
            </Text>
            {item.destination_cbu_cvu && item.destination_alias && (
              <Text className="text-ash/70 font-montserrat text-[11px] mt-0.5">
                {item.payment_method || 'CBU/CVU'}: {item.destination_cbu_cvu}
              </Text>
            )}
          </View>

          {/* Motivo de rechazo */}
          {item.status === 'rejected' && item.rejection_reason && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mt-2 flex-row items-start">
              <Ionicons name="alert-circle-outline" size={18} color="#EF4444" className="mt-0.5" />
              <View className="ml-2 flex-1">
                <Text className="text-red-400 font-montserrat-semibold text-xs mb-0.5">
                  Motivo de rechazo:
                </Text>
                <Text className="text-red-200/90 font-montserrat text-xs leading-relaxed">
                  {item.rejection_reason}
                </Text>
              </View>
            </View>
          )}

          {/* Referencia de transferencia y comprobante */}
          {item.status === 'paid' && (
            <View className="mt-2 pt-2 border-t border-charcoal/40">
              {item.transfer_reference && (
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-ash text-xs font-montserrat">Referencia bancaria:</Text>
                  <Text className="text-platinum font-montserrat-semibold text-xs">
                    {item.transfer_reference}
                  </Text>
                </View>
              )}

              {item.receipt_url && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleOpenReceipt(item.receipt_url)}
                  className="flex-row items-center justify-center bg-gold/15 border border-gold/30 rounded-xl py-2 mt-2"
                >
                  <Ionicons name="document-text-outline" size={16} color={THEME_COLORS.gold} />
                  <Text className="text-gold font-montserrat-semibold text-xs ml-2">
                    Ver comprobante
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      );
    },
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-charcoal/50">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver a la billetera"
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-charcoal/30 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={THEME_COLORS.platinum} />
        </TouchableOpacity>
        <Text className="text-platinum font-montserrat-bold text-lg ml-4">
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
