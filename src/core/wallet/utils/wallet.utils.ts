import type { PayoutRequestStatus } from '../interface/wallet.interface';

export const IMMEDIATE_PAYOUT_FEE = 500;
export const MIN_IMMEDIATE_PAYOUT_AMOUNT = 500;

/**
 * Determina si la hora actual en Argentina (GMT-3) está fuera de la ventana operativa de retiros inmediatos (08:00 a 20:00).
 */
export const isArgentinaOutsideOperatingHours = (date: Date = new Date()): boolean => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(date), 10);
    return hour < 8 || hour >= 20;
  } catch {
    // Fallback: Argentina está siempre en UTC-3 sin horario de verano
    const utcHours = date.getUTCHours();
    const argHours = (utcHours - 3 + 24) % 24;
    return argHours < 8 || argHours >= 20;
  }
};

export interface PayoutStatusMeta {
  label: string;
  sublabel: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
  iconColor: string;
  iconName: 'time-outline' | 'hourglass-outline' | 'checkmark-circle-outline' | 'close-circle-outline' | 'ellipse-outline';
  isFailed: boolean;
}

/**
 * Normaliza y devuelve los textos y estilos para cada estado de retiro.
 */
export const getNormalizedPayoutStatusMeta = (status: PayoutRequestStatus): PayoutStatusMeta => {
  switch (status) {
    case 'pending':
    case 'requested':
      return {
        label: 'Pendiente',
        sublabel: 'Saldo reservado',
        badgeBg: 'bg-amber-500/15',
        badgeBorder: 'border-amber-500/40',
        textColor: 'text-amber-400',
        iconColor: '#F59E0B',
        iconName: 'time-outline',
        isFailed: false,
      };
    case 'processing':
    case 'approved':
      return {
        label: 'En procesamiento bancario',
        sublabel: 'En curso',
        badgeBg: 'bg-blue-500/15',
        badgeBorder: 'border-blue-500/40',
        textColor: 'text-blue-400',
        iconColor: '#3B82F6',
        iconName: 'hourglass-outline',
        isFailed: false,
      };
    case 'completed':
    case 'paid':
      return {
        label: 'Acreditado / Pagado',
        sublabel: 'Completado',
        badgeBg: 'bg-emerald-500/15',
        badgeBorder: 'border-emerald-500/40',
        textColor: 'text-emerald-400',
        iconColor: '#10B981',
        iconName: 'checkmark-circle-outline',
        isFailed: false,
      };
    case 'failed':
    case 'rejected':
      return {
        label: 'Rechazado',
        sublabel: 'Saldo reintegrado',
        badgeBg: 'bg-red-500/15',
        badgeBorder: 'border-red-500/40',
        textColor: 'text-red-400',
        iconColor: '#EF4444',
        iconName: 'close-circle-outline',
        isFailed: true,
      };
    default:
      return {
        label: status,
        sublabel: '',
        badgeBg: 'bg-charcoal/40',
        badgeBorder: 'border-charcoal',
        textColor: 'text-platinum',
        iconColor: '#A1A1AA',
        iconName: 'ellipse-outline',
        isFailed: false,
      };
  }
};
