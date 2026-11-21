import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { PermissionStatus } from '../interface/permission.interface';
import { requestBackgroundLocationDisclosure } from '../../../presentation/location/store/useBackgroundLocationDisclosureStore';

const mapPermissionStatus = (status: string): PermissionStatus => {
  switch (status) {
    case 'granted':
      return PermissionStatus.GRANTED;
    case 'denied':
      return PermissionStatus.DENIED;
    default:
      return PermissionStatus.UNDETERMINED;
  }
};

const showPermissionAlert = (): void => {
  Alert.alert(
    'Permiso de ubicación requerido',
    'TransferBlack necesita acceso a tu ubicación para mostrar el mapa y asignarte viajes.',
    [
      {
        text: 'Abrir ajustes',
        onPress: () => {
          void Linking.openSettings();
        },
      },
      {
        text: 'Cancelar',
        style: 'destructive',
      },
    ]
  );
};

const showBackgroundPermissionDeniedAlert = (): void => {
  Alert.alert(
    'Ubicación en segundo plano requerida',
    'Para recibir ofertas de viaje y mantener el seguimiento activo cuando minimices la aplicación, habilitá el acceso a tu ubicación "Todo el tiempo" en los ajustes.',
    [
      {
        text: 'Abrir ajustes',
        onPress: () => {
          void Linking.openSettings();
        },
      },
      {
        text: 'Cancelar',
        style: 'cancel',
      },
    ]
  );
};

const promptBackgroundPermissionRationale = (): Promise<boolean> => {
  return requestBackgroundLocationDisclosure();
};

export const requestLocationPermission = async (): Promise<PermissionStatus> => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    showPermissionAlert();
    return PermissionStatus.DENIED;
  }

  return PermissionStatus.GRANTED;
};

export const checkLocationPermission = async (): Promise<PermissionStatus> => {
  const { status } = await Location.getForegroundPermissionsAsync();
  return mapPermissionStatus(status);
};

export const checkBackgroundLocationPermission = async (): Promise<PermissionStatus> => {
  const { status } = await Location.getBackgroundPermissionsAsync();
  return mapPermissionStatus(status);
};

export const requestBackgroundLocationPermission = async (): Promise<PermissionStatus> => {
  try {
    let foregroundStatus = await checkLocationPermission();
    if (foregroundStatus !== PermissionStatus.GRANTED) {
      foregroundStatus = await requestLocationPermission();
    }

    if (foregroundStatus !== PermissionStatus.GRANTED) {
      return PermissionStatus.DENIED;
    }

    const { status: currentBackgroundStatus } = await Location.getBackgroundPermissionsAsync();
    if (currentBackgroundStatus === 'granted') {
      return PermissionStatus.GRANTED;
    }

    const shouldRequest = await promptBackgroundPermissionRationale();
    if (!shouldRequest) {
      return PermissionStatus.DENIED;
    }

    const { status: requestedBackgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (requestedBackgroundStatus !== 'granted') {
      showBackgroundPermissionDeniedAlert();
      return PermissionStatus.DENIED;
    }

    return PermissionStatus.GRANTED;
  } catch {
    return PermissionStatus.DENIED;
  }
};
