import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { THEME_COLORS } from '../../../core/constants/theme';
import { useWalletStore } from '../../../presentation/wallet/store/useWalletStore';
import { PayoutModal } from '../../../presentation/components/wallet/PayoutModal';

const getTransactionMeta = (type: string, amount: number) => {
  switch (type) {
    case 'manual_adjustment':
      return {
        label: 'Ajuste de Administración',
        icon: 'construct-outline',
        color: amount >= 0 ? '#10B981' : '#EF4444',
      };
    case 'debt_settlement':
      return {
        label: 'Rendición de Comisiones',
        icon: 'checkmark-done-circle-outline',
        color: '#10B981',
      };
    case 'trip_earning':
      return {
        label: 'Ganancia de Viaje Digital',
        icon: 'car-outline',
        color: '#10B981',
      };
    case 'trip_commission_debt':
      return {
        label: 'Comisión Viaje en Efectivo',
        icon: 'cash-outline',
        color: '#EF4444',
      };
    case 'payout':
      return {
        label: 'Retiro Bancario',
        icon: 'wallet-outline',
        color: '#3B82F6',
      };
    case 'cancellation_compensation':
      return {
        label: 'Compensación por Cancelación',
        icon: 'shield-checkmark-outline',
        color: '#10B981',
      };
    case 'trip_refund':
    case 'trip_chargeback':
      return {
        label: 'Reverso / Contracargo',
        icon: 'refresh-outline',
        color: '#F59E0B',
      };
    default:
      return {
        label: 'Movimiento de Cuenta',
        icon: 'receipt-outline',
        color: amount >= 0 ? '#10B981' : '#EF4444',
      };
  }
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

type TransactionFilter = 'all' | 'earnings' | 'commissions' | 'payouts';

export default function WalletScreen() {
  const { summary, transactions, isLoading, isLoadingTransactions, fetchSummary, fetchTransactions } = useWalletStore();
  const [isPayoutModalVisible, setPayoutModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<TransactionFilter>('all');

  useEffect(() => {
    fetchSummary();
    fetchTransactions();
  }, [fetchSummary, fetchTransactions]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchSummary(), fetchTransactions()]);
    setIsRefreshing(false);
  };

  const filteredTransactions = transactions.filter((tx) => {
    const numAmount = parseFloat(tx.amount);
    if (activeFilter === 'earnings') {
      return (
        numAmount > 0 ||
        tx.entry_type === 'trip_earning' ||
        tx.entry_type === 'manual_adjustment' ||
        tx.entry_type === 'debt_settlement' ||
        tx.entry_type === 'cancellation_compensation'
      );
    }
    if (activeFilter === 'commissions') {
      return tx.entry_type === 'trip_commission_debt' || (numAmount < 0 && tx.entry_type !== 'payout');
    }
    if (activeFilter === 'payouts') {
      return tx.entry_type === 'payout';
    }
    return true;
  });

  if (isLoading && !summary && transactions.length === 0) {
    return (
      <View className="flex-1 bg-obsidian items-center justify-center">
        <ActivityIndicator size="large" color={THEME_COLORS.gold} />
      </View>
    );
  }

  const isRestricted = summary?.is_cash_restricted;
  const balance = summary?.balance ? parseFloat(summary.balance) : 0;
  const debtLimit = summary?.debt_limit ? parseFloat(summary.debt_limit) : 50000;
  const hasPendingPayout = !!summary?.pending_payout;
  
  // Can only withdraw if balance is positive and no payout is already pending
  const canWithdraw = balance > 0 && !hasPendingPayout;

  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-charcoal/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-charcoal/30 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={24} color={THEME_COLORS.platinum} />
        </TouchableOpacity>
        <Text className="text-platinum font-montserrat-bold text-lg ml-4">
          Bóveda Financiera
        </Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6" 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={THEME_COLORS.gold} 
            colors={[THEME_COLORS.gold]}
          />
        }
      >
        {/* Warning Banner if Restricted */}
        {isRestricted && (
          <View className="bg-red-600/20 border border-red-600/50 rounded-2xl p-4 mb-6 flex-row items-start">
            <Ionicons name="warning" size={24} color="#EF4444" className="mt-1" />
            <View className="ml-3 flex-1">
              <Text className="text-red-400 font-montserrat-bold text-base mb-1">
                Cuenta Limitada
              </Text>
              <Text className="text-red-200/90 font-montserrat text-sm leading-tight">
                Superaste el límite de deuda permitida. Acercate a nuestras oficinas para regularizar tu saldo. Mientras tanto, solo recibirás viajes con pago digital.
              </Text>
            </View>
          </View>
        )}

        {/* Pending Payout Banner */}
        {summary?.pending_payout && (
          <View className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center mb-1">
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text className="text-amber-400 font-montserrat-semibold text-sm ml-2">
                Retiro pendiente de aprobación
              </Text>
            </View>
            <Text className="text-platinum font-montserrat-bold text-3xl my-1">
              ${parseFloat(summary.pending_payout.amount).toFixed(2)}
            </Text>
            <Text className="text-ash text-xs font-montserrat">
              Solicitud enviada el {formatDate(summary.pending_payout.requested_at)}. En proceso de transferencia bancaria por administración.
            </Text>
          </View>
        )}

        {/* Balance Card */}
        <View 
          className={`rounded-3xl p-6 shadow-lg shadow-black mb-6 ${
            isRestricted ? 'bg-red-950/40 border border-red-900/50' : 'bg-charcoal/30 border border-charcoal/50'
          }`}
        >
          <Text className="text-ash font-montserrat-medium text-sm mb-1 uppercase tracking-wider">
            Saldo Actual
          </Text>
          <Text 
            className={`font-montserrat-bold text-5xl mb-2 ${
              balance < 0 ? 'text-red-400' : 'text-platinum'
            }`}
          >
            ${Math.abs(balance).toFixed(2)}
            {balance < 0 && <Text className="text-2xl text-red-400"> (Deuda)</Text>}
          </Text>

          <View className="bg-obsidian/50 rounded-xl p-3 flex-row justify-between items-center mt-4">
            <Text className="text-ash text-xs font-montserrat">Límite de deuda:</Text>
            <Text className="text-platinum text-xs font-montserrat-semibold">${debtLimit.toFixed(2)}</Text>
          </View>
        </View>

        {/* Breakdown Card */}
        {summary?.breakdown && (
          <View className="bg-charcoal/20 border border-charcoal/50 rounded-2xl p-4 mb-6">
            <Text className="text-platinum font-montserrat-bold text-sm mb-3">Detalle de Cuenta</Text>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-ash text-xs font-montserrat">Viajes completados hoy</Text>
              <Text className="text-platinum text-xs font-montserrat-semibold">
                {summary.completedTripsToday ?? 0}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-ash text-xs font-montserrat">Ganancias retenidas (Digital)</Text>
              <Text className="text-emerald-400 text-xs font-montserrat-semibold">
                +${parseFloat(summary.breakdown.trip_earnings || '0').toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-ash text-xs font-montserrat">Comisiones por viajes en efectivo</Text>
              <Text className="text-red-400 text-xs font-montserrat-semibold">
                ${parseFloat(summary.breakdown.cash_commission_debt || '0').toFixed(2)}
              </Text>
            </View>

            {parseFloat(summary.breakdown.settlements || '0') > 0 && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-ash text-xs font-montserrat">Comisiones rendidas</Text>
                <Text className="text-emerald-400 text-xs font-montserrat-semibold">
                  +${parseFloat(summary.breakdown.settlements).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(summary.breakdown.adjustments || '0') > 0 && (
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-ash text-xs font-montserrat">Ajustes de administración</Text>
                <Text className="text-emerald-400 text-xs font-montserrat-semibold">
                  +${parseFloat(summary.breakdown.adjustments).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(summary.breakdown.paid_out || '0') > 0 && (
              <View className="flex-row justify-between items-center">
                <Text className="text-ash text-xs font-montserrat">Retiros pagados</Text>
                <Text className="text-platinum text-xs font-montserrat-semibold">
                  -${parseFloat(summary.breakdown.paid_out || '0').toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Withdraw Button */}
        {canWithdraw && (
          <TouchableOpacity
            onPress={() => setPayoutModalVisible(true)}
            className="w-full bg-gold rounded-2xl py-4 flex-row justify-center items-center mb-6 shadow-md shadow-black"
          >
            <Ionicons name="cash-outline" size={20} color={THEME_COLORS.obsidian} className="mr-2" />
            <Text className="text-obsidian font-montserrat-bold text-base ml-2">
              Solicitar Retiro
            </Text>
          </TouchableOpacity>
        )}

        {/* Movimientos Recientes */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-platinum font-montserrat-bold text-base">Movimientos Recientes</Text>
            {isLoadingTransactions && (
              <ActivityIndicator size="small" color={THEME_COLORS.gold} />
            )}
          </View>

          {/* Filtros tipo pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-3"
            contentContainerStyle={{ paddingRight: 8 }}
          >
            {[
              { id: 'all', label: 'Todos' },
              { id: 'earnings', label: 'Ingresos' },
              { id: 'commissions', label: 'Comisiones' },
              { id: 'payouts', label: 'Retiros CBU' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setActiveFilter(tab.id as TransactionFilter)}
                  className={`px-4 py-1.5 rounded-full border mr-2 ${
                    isActive
                      ? 'bg-platinum border-platinum'
                      : 'bg-[#18181A] border-[#2C2C2E]'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isActive
                        ? 'text-obsidian font-montserrat-bold'
                        : 'text-ash font-montserrat-medium'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {filteredTransactions.length === 0 && !isLoadingTransactions ? (
            <View className="bg-charcoal/20 border border-charcoal/40 rounded-2xl p-6 items-center justify-center">
              <Ionicons name="receipt-outline" size={32} color={THEME_COLORS.ash} />
              <Text className="text-ash font-montserrat text-sm mt-2 text-center">
                {transactions.length === 0
                  ? 'No hay movimientos registrados en tu billetera todavía.'
                  : 'No hay movimientos en esta categoría.'}
              </Text>
            </View>
          ) : (
            <View className="bg-charcoal/20 border border-charcoal/50 rounded-2xl overflow-hidden divide-y divide-charcoal/40">
              {filteredTransactions.map((tx) => {
                const numAmount = parseFloat(tx.amount);
                const isPositive = numAmount > 0;
                const meta = getTransactionMeta(tx.entry_type, numAmount);

                return (
                  <View key={tx.id} className="p-4 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1 mr-3">
                      <View 
                        style={{ backgroundColor: `${meta.color}20` }}
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      >
                        <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-platinum font-montserrat-semibold text-sm" numberOfLines={1}>
                          {meta.label}
                        </Text>
                        <Text className="text-ash/70 font-montserrat text-xs mt-0.5">
                          {formatDate(tx.created_at)}
                          {tx.notes ? ` • ${tx.notes}` : ''}
                        </Text>
                      </View>
                    </View>

                    <Text 
                      className={`font-montserrat-bold text-sm ${
                        isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isPositive ? `+$${numAmount.toFixed(2)}` : `-$${Math.abs(numAmount).toFixed(2)}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Info Box */}
        <View className="bg-charcoal/20 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="information-circle-outline" size={20} color={THEME_COLORS.gold} />
            <Text className="text-platinum font-montserrat-semibold ml-2">¿Cómo funciona?</Text>
          </View>
          <Text className="text-ash font-montserrat text-sm leading-relaxed">
            Las comisiones por viajes en efectivo se descuentan de tu saldo. Si el saldo llega al límite negativo, se restringirán los viajes en efectivo hasta que saldes la deuda recibiendo pagos digitales o pagando en oficina.
          </Text>
        </View>
      </ScrollView>

      {/* Payout Modal */}
      <PayoutModal 
        visible={isPayoutModalVisible}
        onClose={() => setPayoutModalVisible(false)}
        maxAmount={canWithdraw ? balance : 0}
      />
    </SafeAreaView>
  );
}
