import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Linking from 'expo-linking';
import { driverOverlay } from '../../../core/overlay/driverOverlay';
import { socket } from '../../../core/socket/socket';
import { getPendingDriverOffers } from '../../../core/trip/actions/trip.actions';
import { Trip, TripOfferPayload } from '../../../core/trip/interface/trip.interface';
import { authStorage } from '../../auth/store/authStorage';
import { offerAlarmService } from '../services/offerAlarmService';
import { useDriverTripStore } from '../store/useDriverTripStore';
import { syncActiveTripState } from './useActiveTripSync';

export interface DeepLinkOfferParams {
  offerId: string | null;
  tripId: string | null;
}

export interface ReconcileForegroundOptions {
  deepLinkUrl?: string | null;
}

let inFlightReconcile: Promise<void> | null = null;
let currentDeepLinkUrl: string | null = null;
let pendingDeepLinkUrl: string | null = null;

const normalizeParam = (value: unknown): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isLiveTrip = (trip: Trip | null | undefined): boolean =>
  !!trip?.id &&
  trip.status !== 'completed' &&
  trip.status !== 'cancelled' &&
  trip.status !== 'draft';

const normalizeValidOffers = (
  offers: TripOfferPayload[],
  nowMs: number
): TripOfferPayload[] => {
  const validOffers: TripOfferPayload[] = [];

  for (const offer of offers) {
    if (!offer) {
      continue;
    }

    if (offer.expiresAt) {
      const expiresMs = new Date(offer.expiresAt).getTime();
      if (Number.isNaN(expiresMs) || expiresMs <= nowMs) {
        continue;
      }

      const remainingSeconds = Math.floor((expiresMs - nowMs) / 1000);
      const normalizedTtl = Math.max(
        1,
        Math.min(offer.ttlSeconds || 30, remainingSeconds)
      );

      validOffers.push({
        ...offer,
        ttlSeconds: normalizedTtl,
      });
      continue;
    }

    if ((offer.ttlSeconds ?? 0) > 0) {
      validOffers.push(offer);
    }
  }

  return validOffers;
};

const prioritizeOfferByDeepLink = (
  offers: TripOfferPayload[],
  targetOfferId: string | null,
  targetTripId: string | null
): TripOfferPayload[] => {
  if (!targetOfferId && !targetTripId) {
    return offers;
  }

  const getMatchRank = (offer: TripOfferPayload): number => {
    if (targetOfferId && offer.offerId === targetOfferId) {
      return 0;
    }
    if (targetTripId && offer.tripId === targetTripId) {
      return 1;
    }
    return 2;
  };

  return [...offers].sort((a, b) => getMatchRank(a) - getMatchRank(b));
};

/**
 * Extrae `offerId` y `tripId` desde enlaces profundos con formato query
 * (`transferblackconductor://?offerId=...&tripId=...`) o path (`transferblackconductor://offer/...`).
 */
export const extractDeepLinkOfferParams = (
  url?: string | null
): DeepLinkOfferParams => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) {
    return { offerId: null, tripId: null };
  }

  let offerId: string | null = null;
  let tripId: string | null = null;

  try {
    const parsed = Linking.parse(trimmedUrl);
    offerId = normalizeParam(parsed?.queryParams?.offerId);
    tripId = normalizeParam(parsed?.queryParams?.tripId);

    if (!offerId) {
      const normalizedPath = parsed?.path?.replace(/^\/+/, '') ?? '';
      if (parsed?.hostname === 'offer' && normalizedPath) {
        offerId = normalizeParam(normalizedPath.split('/')[0]);
      } else if (normalizedPath.startsWith('offer/')) {
        offerId = normalizeParam(normalizedPath.slice('offer/'.length).split('/')[0]);
      }
    }

    if (offerId || tripId) {
      return { offerId, tripId };
    }
  } catch {
    // Continuar con el respaldo basado en URLSearchParams/regex
  }

  const queryIndex = trimmedUrl.indexOf('?');
  const queryString = queryIndex >= 0 ? trimmedUrl.slice(queryIndex + 1).split('#')[0] : '';
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    offerId = normalizeParam(searchParams.get('offerId'));
    tripId = normalizeParam(searchParams.get('tripId'));
  }

  if (!offerId) {
    const pathMatch = trimmedUrl.match(/\/\/(?:[^/?#]*\/)?offer\/([^/?#]+)/i);
    if (pathMatch?.[1]) {
      try {
        offerId = normalizeParam(decodeURIComponent(pathMatch[1]));
      } catch {
        offerId = normalizeParam(pathMatch[1]);
      }
    }
  }

  return { offerId, tripId };
};

const executeReconcileForegroundDriverState = async (
  options?: ReconcileForegroundOptions
): Promise<void> => {
  await driverOverlay.hideOfferOverlay();

  const initialState = useDriverTripStore.getState();
  const isTripLive = isLiveTrip(initialState.activeTrip);

  if ((initialState.isAvailable || isTripLive) && !socket.connected) {
    const token = await authStorage.getAccessToken();
    if (token) {
      socket.connect();
    }
  }

  await syncActiveTripState();

  const afterTripSync = useDriverTripStore.getState();
  const hasLiveTripNow = isLiveTrip(afterTripSync.activeTrip);

  if (hasLiveTripNow) {
    afterTripSync.clearAllOffers();
    await offerAlarmService.stop();
    return;
  }

  const { offerId: targetOfferId, tripId: targetTripId } = extractDeepLinkOfferParams(
    options?.deepLinkUrl
  );

  if (
    afterTripSync.isAvailable ||
    targetOfferId ||
    targetTripId ||
    afterTripSync.currentOffer
  ) {
    try {
      const { offers, serverNow } = await getPendingDriverOffers();
      const parsedServerMs = serverNow ? new Date(serverNow).getTime() : NaN;
      const nowMs = !Number.isNaN(parsedServerMs) ? parsedServerMs : Date.now();
      const validOffers = normalizeValidOffers(offers, nowMs);

      if (validOffers.length === 0) {
        useDriverTripStore.getState().clearAllOffers();
        await offerAlarmService.stop();
        return;
      }

      const prioritizedOffers = prioritizeOfferByDeepLink(
        validOffers,
        targetOfferId,
        targetTripId
      );

      const store = useDriverTripStore.getState();
      store.clearAllOffers();
      for (const offer of prioritizedOffers) {
        store.enqueueOffer(offer);
      }
    } catch {
      // Respaldo local ante falla de red: descartar oferta actual si ya expiró
      const currentOffer = useDriverTripStore.getState().currentOffer;
      if (currentOffer?.expiresAt) {
        const expiresMs = new Date(currentOffer.expiresAt).getTime();
        if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
          useDriverTripStore.getState().clearOffer();
          if (!useDriverTripStore.getState().currentOffer) {
            await offerAlarmService.stop();
          }
        }
      }
    }
  }
};

/**
 * Reconcilia el estado completo del conductor al volver a primer plano o abrir un deep link:
 * oculta la burbuja flotante, reconecta Socket.IO, sincroniza viaje activo y valida ofertas vía REST.
 */
export const reconcileForegroundDriverState = async (
  options?: ReconcileForegroundOptions
): Promise<void> => {
  const incomingUrl = options?.deepLinkUrl?.trim() || null;

  if (inFlightReconcile) {
    if (incomingUrl && incomingUrl !== currentDeepLinkUrl) {
      pendingDeepLinkUrl = incomingUrl;
    }
    await inFlightReconcile;
    if (pendingDeepLinkUrl) {
      const queuedUrl = pendingDeepLinkUrl;
      pendingDeepLinkUrl = null;
      return reconcileForegroundDriverState({ deepLinkUrl: queuedUrl });
    }
    if (inFlightReconcile) {
      return inFlightReconcile;
    }
    return;
  }

  currentDeepLinkUrl = incomingUrl;
  inFlightReconcile = executeReconcileForegroundDriverState({
    deepLinkUrl: incomingUrl,
  }).finally(() => {
    inFlightReconcile = null;
    currentDeepLinkUrl = null;
  });

  await inFlightReconcile;

  if (pendingDeepLinkUrl) {
    const queuedUrl = pendingDeepLinkUrl;
    pendingDeepLinkUrl = null;
    return reconcileForegroundDriverState({ deepLinkUrl: queuedUrl });
  }
};

/**
 * Escucha transiciones de AppState hacia primer plano y eventos de deep linking
 * para resincronizar inmediatamente el estado de disponibilidad, viajes y ofertas.
 */
export const useForegroundResync = (): void => {
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus) || 'active');

  useEffect(() => {
    let isMounted = true;
    appStateRef.current = (AppState.currentState as AppStateStatus) || 'active';

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const previousState = appStateRef.current;
        appStateRef.current = nextState;

        if (
          nextState === 'active' &&
          (previousState === 'background' || previousState === 'inactive')
        ) {
          void reconcileForegroundDriverState();
        }
      }
    );

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url) {
        void reconcileForegroundDriverState({ deepLinkUrl: url });
      }
    });

    void Linking.getInitialURL()
      .then((initialUrl) => {
        if (!isMounted || !initialUrl) {
          return;
        }
        const { offerId, tripId } = extractDeepLinkOfferParams(initialUrl);
        if (offerId || tripId) {
          void reconcileForegroundDriverState({ deepLinkUrl: initialUrl });
        }
      })
      .catch(() => {
        // Ignorar errores al consultar la URL inicial de apertura
      });

    return () => {
      isMounted = false;
      appStateSubscription.remove();
      linkingSubscription.remove();
    };
  }, []);
};
