import { describe, expect, it } from 'vitest';
import {
  TripStateMachineState,
  tripUiReducer,
} from '../../src/presentation/components/trip/state/tripUiState';

describe('TripInProgressSheet State Machine & Reducer', () => {
  const initialState: TripStateMachineState = {
    phase: 'navigating_to_pickup',
    isActionLoading: false,
    actionType: 'none',
    inlineError: null,
    pinDigits: ['', '', '', ''],
    isPinError: false,
    isOffline: false,
  };

  it('transitions between trip phases cleanly', () => {
    let state = tripUiReducer(initialState, { type: 'SET_PHASE', phase: 'waiting_passenger' });
    expect(state.phase).toBe('waiting_passenger');

    state = tripUiReducer(state, { type: 'SET_PHASE', phase: 'in_trip' });
    expect(state.phase).toBe('in_trip');

    state = tripUiReducer(state, { type: 'SET_PHASE', phase: 'approaching_dropoff' });
    expect(state.phase).toBe('approaching_dropoff');

    state = tripUiReducer(state, { type: 'SET_PHASE', phase: 'completed' });
    expect(state.phase).toBe('completed');
  });

  it('handles action start, success, and failure cycles', () => {
    // Start arriving action
    let state = tripUiReducer(initialState, { type: 'START_ACTION', actionType: 'arriving' });
    expect(state.isActionLoading).toBe(true);
    expect(state.actionType).toBe('arriving');
    expect(state.inlineError).toBeNull();

    // Action failure
    state = tripUiReducer(state, {
      type: 'ACTION_FAILURE',
      error: 'Error de red al notificar llegada',
    });
    expect(state.isActionLoading).toBe(false);
    expect(state.actionType).toBe('none');
    expect(state.inlineError).toBe('Error de red al notificar llegada');

    // Clear error
    state = tripUiReducer(state, { type: 'CLEAR_ERROR' });
    expect(state.inlineError).toBeNull();

    // Start finishing action and succeed
    state = tripUiReducer(state, { type: 'START_ACTION', actionType: 'finishing' });
    expect(state.isActionLoading).toBe(true);
    state = tripUiReducer(state, { type: 'ACTION_SUCCESS' });
    expect(state.isActionLoading).toBe(false);
    expect(state.actionType).toBe('none');
  });

  it('updates PIN digits and clears errors correctly', () => {
    let state = tripUiReducer(initialState, { type: 'SET_PIN_DIGIT', index: 0, value: '4' });
    state = tripUiReducer(state, { type: 'SET_PIN_DIGIT', index: 1, value: '8' });
    state = tripUiReducer(state, { type: 'SET_PIN_DIGIT', index: 2, value: '2' });
    state = tripUiReducer(state, { type: 'SET_PIN_DIGIT', index: 3, value: '9' });

    expect(state.pinDigits).toEqual(['4', '8', '2', '9']);
    expect(state.isPinError).toBe(false);

    state = tripUiReducer(state, { type: 'SET_PIN_ERROR', isError: true });
    expect(state.isPinError).toBe(true);

    state = tripUiReducer(state, { type: 'RESET_PIN' });
    expect(state.pinDigits).toEqual(['', '', '', '']);
    expect(state.isPinError).toBe(false);
  });

  it('updates offline status dynamically', () => {
    let state = tripUiReducer(initialState, { type: 'SET_OFFLINE', isOffline: true });
    expect(state.isOffline).toBe(true);

    state = tripUiReducer(state, { type: 'SET_OFFLINE', isOffline: false });
    expect(state.isOffline).toBe(false);
  });
});
