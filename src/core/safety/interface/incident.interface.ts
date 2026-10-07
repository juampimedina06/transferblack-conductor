export type TripIncidentCategory =
  | 'violent_aggressive'
  | 'damage_cleanliness'
  | 'payment_issue'
  | 'suspicious_safety'
  | 'other';

export interface TripIncidentCategoryConfig {
  id: TripIncidentCategory;
  label: string;
  icon: string;
  description: string;
}

export const INCIDENT_CATEGORIES: TripIncidentCategoryConfig[] = [
  {
    id: 'violent_aggressive',
    label: 'Agresión o falta de respeto',
    icon: 'hand-left-outline',
    description: 'Insultos, amenazas, agresión física o trato inadecuado.',
  },
  {
    id: 'damage_cleanliness',
    label: 'Suciedad o daño al vehículo',
    icon: 'sparkles-outline',
    description: 'Vómito, derrames, rotura de tapizado o accesorios.',
  },
  {
    id: 'payment_issue',
    label: 'Problema con el cobro',
    icon: 'cash-outline',
    description: 'No abonó el viaje, evasión o desacuerdo violento con la tarifa.',
  },
  {
    id: 'suspicious_safety',
    label: 'Inseguridad o sospecha',
    icon: 'shield-alert-outline',
    description: 'Intento de robo, desvíos forzados o situación peligrosa.',
  },
  {
    id: 'other',
    label: 'Otro motivo',
    icon: 'alert-circle-outline',
    description: 'Cualquier otro inconveniente operativo grave.',
  },
];

export interface TripIncidentReportPayload {
  tripId: string;
  passengerId?: string | null;
  passengerName?: string;
  category: TripIncidentCategory;
  description: string;
  blockPassenger: boolean;
  damageEstimatedAmount?: number;
  reportedAt: string;
}

export interface BlockedPassengerRecord {
  passengerId: string;
  passengerName?: string;
  blockedAt: string;
  reason: string;
  tripId: string;
}
