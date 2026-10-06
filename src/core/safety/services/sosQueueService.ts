import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueuedSosEvent, SosRequestPayload } from '../interface/sos.interface';
import { sendSosAlert } from '../actions/sos.actions';
import { socket } from '@/core/socket/socket';

const SOS_QUEUE_STORAGE_KEY = 'transferblack_sos_queue_v1';

type SosStatusListener = (status: 'idle' | 'sending' | 'success' | 'retrying') => void;

class SosQueueService {
  private isProcessing = false;
  private listeners: Set<SosStatusListener> = new Set();
  private currentStatus: 'idle' | 'sending' | 'success' | 'retrying' = 'idle';

  constructor() {
    // Reintentar automáticamente al reconectar el socket
    if (socket) {
      socket.on('connect', () => {
        void this.flushQueue();
      });
    }
  }

  subscribe(listener: SosStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: 'idle' | 'sending' | 'success' | 'retrying') {
    this.currentStatus = status;
    this.listeners.forEach((l) => l(status));
  }

  async getQueue(): Promise<QueuedSosEvent[]> {
    try {
      const data = await AsyncStorage.getItem(SOS_QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: QueuedSosEvent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SOS_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error guardando cola de SOS en storage:', e);
    }
  }

  /**
   * Encola y dispara el envío de alerta SOS. Si falla por red, persiste para reintentos.
   */
  async dispatchSosAlert(tripId: string, payload: SosRequestPayload): Promise<boolean> {
    this.setStatus('sending');

    try {
      await sendSosAlert(tripId, payload);
      this.setStatus('success');
      return true;
    } catch (error) {
      console.warn('⚠️ [SOS] Error enviando alerta inicial a backend. Encolando para reintento:', error);
      this.setStatus('retrying');

      const queue = await this.getQueue();
      // Si no está ya encolado con ese clientEventId, agregarlo
      if (!queue.some((item) => item.clientEventId === payload.clientEventId)) {
        queue.push({
          ...payload,
          tripId,
          retryCount: 0,
          lastAttemptAt: Date.now(),
        });
        await this.saveQueue(queue);
      }
      return false;
    }
  }

  /**
   * Intenta enviar todos los eventos pendientes en la cola conservando el mismo clientEventId.
   */
  async flushQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.setStatus('retrying');
      const remaining: QueuedSosEvent[] = [];

      for (const item of queue) {
        try {
          await sendSosAlert(item.tripId, {
            clientEventId: item.clientEventId,
            lat: item.lat,
            lng: item.lng,
            accuracyMeters: item.accuracyMeters,
            clientTimestamp: item.clientTimestamp,
          });
        } catch {
          // Si falla, conservar con retryCount incrementado
          remaining.push({
            ...item,
            retryCount: item.retryCount + 1,
            lastAttemptAt: Date.now(),
          });
        }
      }

      await this.saveQueue(remaining);

      if (remaining.length === 0) {
        this.setStatus('success');
      } else {
        this.setStatus('retrying');
      }
    } finally {
      this.isProcessing = false;
    }
  }
}

export const sosQueueService = new SosQueueService();
