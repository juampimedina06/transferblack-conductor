import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NavigationViewController,
  TimeAndDistance,
  Waypoint,
} from '@googlemaps/react-native-navigation-sdk';
import {
  checkLocationPermission,
  requestLocationPermission,
} from '@/core/location/actions/permissions.actions';
import { PermissionStatus } from '@/core/location/interface/permission.interface';
import type { GoogleNavigationSdkModule } from '@/core/navigation/googleNavigationSdk';
import { Trip } from '@/core/trip/interface/trip.interface';
import { showBannerNotification } from '@/presentation/notifications/store/useBannerNotificationStore';

interface ActiveTripDestination {
  key: string;
  phase: 'pickup' | 'dropoff';
  waypoints: Waypoint[];
}

export interface UseActiveTripNavigationParams {
  sdk: GoogleNavigationSdkModule;
  activeTrip: Trip | null;
  navigationViewController: NavigationViewController | null;
}

export interface UseActiveTripNavigationResult {
  isNavigating: boolean;
  isInitializing: boolean;
  isMuted: boolean;
  activeDestinationPhase: 'pickup' | 'dropoff' | null;
  remainingTimeAndDistance: TimeAndDistance | null;
  navigationError: string | null;
  toggleMute: () => Promise<void>;
  recenterNavigation: () => Promise<void>;
  showOverview: () => void;
}

function resolveTripDestination(activeTrip: Trip | null): ActiveTripDestination | null {
  if (!activeTrip) return null;

  const status = activeTrip.status;
  // Al llegar al punto de encuentro, completar o cancelar, se detiene la navegación giro a giro
  if (
    status === 'driver_arrived' ||
    status === 'completed' ||
    status === 'cancelled'
  ) {
    return null;
  }

  if (status === 'in_progress') {
    const dropoff = activeTrip.dropoff;
    if (dropoff?.latitude != null && dropoff?.longitude != null) {
      const intermediateWaypoints: Waypoint[] = (activeTrip.stops ?? [])
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s, idx) => ({
          title: s.address || `Parada ${idx + 1}`,
          position: {
            lat: s.latitude,
            lng: s.longitude,
          },
          preferSameSideOfRoad: true,
        }));

      const finalWaypoint: Waypoint = {
        title: dropoff.address || 'Destino del pasajero',
        position: {
          lat: dropoff.latitude,
          lng: dropoff.longitude,
        },
        preferSameSideOfRoad: true,
      };

      const waypoints = [...intermediateWaypoints, finalWaypoint];
      const stopsKey = intermediateWaypoints
        .map((w) => `${w.position?.lat.toFixed(5)},${w.position?.lng.toFixed(5)}`)
        .join('|');

      return {
        key: `${activeTrip.id}:dropoff:${stopsKey}:${dropoff.latitude.toFixed(5)},${dropoff.longitude.toFixed(5)}`,
        phase: 'dropoff',
        waypoints,
      };
    }
    return null;
  }

  // Estados previos a iniciar viaje (accepted, driver_assigned, driver_en_route) -> navegar al pickup
  const pickup = activeTrip.pickup;
  if (pickup?.latitude != null && pickup?.longitude != null) {
    return {
      key: `${activeTrip.id}:pickup:${pickup.latitude.toFixed(5)},${pickup.longitude.toFixed(5)}`,
      phase: 'pickup',
      waypoints: [
        {
          title: pickup.address || 'Punto de encuentro',
          position: {
            lat: pickup.latitude,
            lng: pickup.longitude,
          },
          preferSameSideOfRoad: true,
        },
      ],
    };
  }

  return null;
}

/**
 * Orquesta la sesión de navegación giro a giro de Google Navigation SDK
 * a partir de las coordenadas de pickup y dropoff del viaje activo del backend.
 * Mantiene desacoplado el tracking GPS y Socket.IO existentes.
 */
export function useActiveTripNavigation({
  sdk,
  activeTrip,
  navigationViewController,
}: UseActiveTripNavigationParams): UseActiveTripNavigationResult {
  const {
    useNavigation,
    AudioGuidanceMode,
    CameraPerspective,
    NavigationSessionStatus,
    RouteStatus,
    TravelMode,
  } = sdk;

  const {
    navigationController,
    setOnArrival,
    setOnRemainingTimeOrDistanceChanged,
    removeAllListeners,
  } = useNavigation();

  const [isNavigating, setIsNavigating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [remainingTimeAndDistance, setRemainingTimeAndDistance] =
    useState<TimeAndDistance | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);

  const isSessionInitializedRef = useRef(false);
  const activeRouteKeyRef = useRef<string | null>(null);
  const navViewControllerRef = useRef<NavigationViewController | null>(
    navigationViewController
  );

  useEffect(() => {
    navViewControllerRef.current = navigationViewController;
  }, [navigationViewController]);

  const targetDestination = useMemo(
    () => resolveTripDestination(activeTrip),
    [activeTrip]
  );

  const targetPhaseRef = useRef<'pickup' | 'dropoff' | null>(null);
  useEffect(() => {
    targetPhaseRef.current = targetDestination?.phase ?? null;
  }, [targetDestination?.phase]);

  // Suscripción a eventos nativos de llegada y ETA/distancia restante
  useEffect(() => {
    setOnArrival((arrivalEvent) => {
      const label =
        targetPhaseRef.current === 'pickup'
          ? 'Llegaste al punto de encuentro'
          : 'Llegaste al destino del pasajero';

      showBannerNotification({
        type: 'trip',
        title: label,
        message: arrivalEvent.waypoint?.title || undefined,
      });
    });

    setOnRemainingTimeOrDistanceChanged((timeAndDistance) => {
      setRemainingTimeAndDistance(timeAndDistance);
    });

    return () => {
      removeAllListeners();
    };
  }, [removeAllListeners, setOnArrival, setOnRemainingTimeOrDistanceChanged]);

  // Sincroniza el destino del navegador nativo con el viaje activo del backend
  useEffect(() => {
    let isCancelled = false;

    const stopNavigationSession = async () => {
      if (!activeRouteKeyRef.current && !isSessionInitializedRef.current) {
        return;
      }

      activeRouteKeyRef.current = null;
      try {
        await navigationController.stopGuidance();
        await navigationController.clearDestinations();
        await navViewControllerRef.current?.setNavigationUIEnabled(false);
      } catch {
        // Ignorar errores de limpieza si la sesión ya estaba detenida
      }

      if (!isCancelled) {
        setIsNavigating(false);
        setRemainingTimeAndDistance(null);
        setNavigationError(null);
      }
    };

    const startOrUpdateNavigation = async (destination: ActiveTripDestination) => {
      if (activeRouteKeyRef.current === destination.key) {
        // Si el NavigationViewController acaba de montarse, asegurar UI activa
        if (navViewControllerRef.current) {
          try {
            await navViewControllerRef.current.setNavigationUIEnabled(true);
            await navViewControllerRef.current.setFollowingPerspective(
              CameraPerspective.TILTED
            );
          } catch {
            // No-op
          }
        }
        return;
      }

      setIsInitializing(true);
      setNavigationError(null);

      try {
        // 1. Verificar / solicitar permisos de ubicación requeridos por Navigation SDK
        let permission = await checkLocationPermission();
        if (permission !== PermissionStatus.GRANTED) {
          permission = await requestLocationPermission();
        }
        if (permission !== PermissionStatus.GRANTED) {
          const msg = 'Necesitás habilitar el permiso de ubicación para iniciar la navegación giro a giro.';
          if (!isCancelled) {
            setNavigationError(msg);
            showBannerNotification({
              type: 'warning',
              title: 'Permiso de ubicación requerido',
              message: msg,
            });
          }
          return;
        }

        // 2. Verificar términos de Google Navigation SDK e inicializar sesión
        if (!isSessionInitializedRef.current) {
          const accepted = await navigationController.areTermsAccepted();
          if (!accepted) {
            const userAccepted = await navigationController.showTermsAndConditionsDialog();
            if (!userAccepted) {
              const msg = 'Debés aceptar los términos de Google Navigation para usar la navegación integrada.';
              if (!isCancelled) {
                setNavigationError(msg);
                showBannerNotification({
                  type: 'warning',
                  title: 'Términos no aceptados',
                  message: msg,
                });
              }
              return;
            }
          }

          const initStatus = await navigationController.init();
          if (initStatus !== NavigationSessionStatus.OK) {
            const statusMessageMap: Record<string, string> = {
              [NavigationSessionStatus.NOT_AUTHORIZED]:
                'La API Key no está autorizada para Google Navigation SDK.',
              [NavigationSessionStatus.TERMS_NOT_ACCEPTED]:
                'Aceptá los términos de navegación para continuar.',
              [NavigationSessionStatus.LOCATION_PERMISSION_MISSING]:
                'Falta permiso de ubicación para iniciar la navegación.',
              [NavigationSessionStatus.NETWORK_ERROR]:
                'Sin conexión a internet para inicializar la navegación.',
            };
            const msg =
              statusMessageMap[initStatus] ||
              'No se pudo inicializar Google Navigation SDK.';
            if (!isCancelled) {
              setNavigationError(msg);
              showBannerNotification({
                type: 'error',
                title: 'Error de navegación',
                message: msg,
              });
            }
            return;
          }

          isSessionInitializedRef.current = true;
          await navigationController.setAudioGuidanceSettings({
            guidanceMode: AudioGuidanceMode.VOICE_ALERTS_AND_GUIDANCE,
            vibrationEnabled: true,
            bluetoothAudioEnabled: true,
          });
        }

        if (isCancelled) return;

        // 3. Calcular ruta hacia pickup o stops + dropoff del backend
        const navOptions = {
          routingOptions: {
            travelMode: TravelMode.DRIVING,
          },
          displayOptions: {
            showDestinationMarkers: true,
          },
        };
        const routeStatus =
          destination.waypoints.length > 1
            ? await navigationController.setDestinations(destination.waypoints, navOptions)
            : await navigationController.setDestination(destination.waypoints[0], navOptions);

        if (isCancelled) return;

        if (routeStatus !== RouteStatus.OK) {
          const msg = 'No se pudo calcular la ruta hacia el destino. Revisá tu conexión.';
          setNavigationError(msg);
          showBannerNotification({
            type: 'warning',
            title: 'Ruta no disponible',
            message: msg,
          });
          return;
        }

        // 4. Iniciar guía giro a giro y habilitar UI nativa en perspectiva 3D
        await navigationController.startGuidance();
        await navViewControllerRef.current?.setNavigationUIEnabled(true);
        await navViewControllerRef.current?.setFollowingPerspective(
          CameraPerspective.TILTED
        );

        activeRouteKeyRef.current = destination.key;
        if (!isCancelled) {
          setIsNavigating(true);
        }
      } catch (error) {
        console.warn('[GoogleNavigationSDK] Error iniciando guía:', error);
        if (!isCancelled) {
          setNavigationError('Ocurrió un error al iniciar la navegación giro a giro.');
        }
      } finally {
        if (!isCancelled) {
          setIsInitializing(false);
        }
      }
    };

    if (!targetDestination) {
      void stopNavigationSession();
    } else {
      void startOrUpdateNavigation(targetDestination);
    }

    return () => {
      isCancelled = true;
    };
  }, [
    AudioGuidanceMode.VOICE_ALERTS_AND_GUIDANCE,
    CameraPerspective.TILTED,
    NavigationSessionStatus.LOCATION_PERMISSION_MISSING,
    NavigationSessionStatus.NETWORK_ERROR,
    NavigationSessionStatus.NOT_AUTHORIZED,
    NavigationSessionStatus.OK,
    NavigationSessionStatus.TERMS_NOT_ACCEPTED,
    RouteStatus.OK,
    TravelMode.DRIVING,
    navigationController,
    navigationViewController,
    targetDestination,
  ]);

  // Limpieza al desmontar la pantalla de inicio
  useEffect(() => {
    return () => {
      if (isSessionInitializedRef.current) {
        void navigationController.stopGuidance().catch(() => {});
        void navigationController.clearDestinations().catch(() => {});
      }
    };
  }, [navigationController]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    try {
      await navigationController.setAudioGuidanceSettings({
        guidanceMode: nextMuted
          ? AudioGuidanceMode.SILENT
          : AudioGuidanceMode.VOICE_ALERTS_AND_GUIDANCE,
        vibrationEnabled: !nextMuted,
        bluetoothAudioEnabled: !nextMuted,
      });
    } catch {
      setIsMuted(!nextMuted);
    }
  }, [
    AudioGuidanceMode.SILENT,
    AudioGuidanceMode.VOICE_ALERTS_AND_GUIDANCE,
    isMuted,
    navigationController,
  ]);

  const recenterNavigation = useCallback(async () => {
    try {
      await navViewControllerRef.current?.setFollowingPerspective(
        CameraPerspective.TILTED
      );
    } catch {
      // No-op
    }
  }, [CameraPerspective.TILTED]);

  const showOverview = useCallback(() => {
    try {
      navViewControllerRef.current?.showRouteOverview();
    } catch {
      // No-op
    }
  }, []);

  return {
    isNavigating,
    isInitializing,
    isMuted,
    activeDestinationPhase: targetDestination?.phase ?? null,
    remainingTimeAndDistance,
    navigationError,
    toggleMute,
    recenterNavigation,
    showOverview,
  };
}
