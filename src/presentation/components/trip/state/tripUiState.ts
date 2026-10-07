export type TripUiPhase =
  | 'navigating_to_pickup'
  | 'waiting_passenger'
  | 'in_trip'
  | 'approaching_dropoff'
  | 'completed'
  | 'cancelled';

export interface TripStateMachineState {
  phase: TripUiPhase;
  isActionLoading: boolean;
  actionType: 'none' | 'arriving' | 'starting' | 'finishing';
  inlineError: string | null;
  pinDigits: string[];
  isPinError: boolean;
  isOffline: boolean;
}

export type TripStateMachineAction =
  | { type: 'SET_PHASE'; phase: TripUiPhase }
  | { type: 'START_ACTION'; actionType: 'arriving' | 'starting' | 'finishing' }
  | { type: 'ACTION_SUCCESS' }
  | { type: 'ACTION_FAILURE'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_PIN_DIGIT'; index: number; value: string }
  | { type: 'SET_PIN_ERROR'; isError: boolean }
  | { type: 'RESET_PIN' }
  | { type: 'SET_OFFLINE'; isOffline: boolean };

/**
 * Reducer puro y tipado para la máquina de estados del viaje en curso.
 */
export function tripUiReducer(
  state: TripStateMachineState,
  action: TripStateMachineAction
): TripStateMachineState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: action.phase, inlineError: null };
    case 'START_ACTION':
      return {
        ...state,
        isActionLoading: true,
        actionType: action.actionType,
        inlineError: null,
      };
    case 'ACTION_SUCCESS':
      return {
        ...state,
        isActionLoading: false,
        actionType: 'none',
        inlineError: null,
      };
    case 'ACTION_FAILURE':
      return {
        ...state,
        isActionLoading: false,
        actionType: 'none',
        inlineError: action.error,
      };
    case 'CLEAR_ERROR':
      return { ...state, inlineError: null };
    case 'SET_PIN_DIGIT': {
      const nextDigits = [...state.pinDigits];
      nextDigits[action.index] = action.value;
      return { ...state, pinDigits: nextDigits, isPinError: false };
    }
    case 'SET_PIN_ERROR':
      return { ...state, isPinError: action.isError };
    case 'RESET_PIN':
      return { ...state, pinDigits: ['', '', '', ''], isPinError: false };
    case 'SET_OFFLINE':
      return { ...state, isOffline: action.isOffline };
    default:
      return state;
  }
}
