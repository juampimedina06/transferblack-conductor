import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';
import { PermissionStatus } from '../interface/permission.interface';

const showPermissionAlert = (): void => {
  Alert.alert(
    'Permiso de ubicación requerido',
    'TransferBlack necesita acceso a tu ubicación para mostrar el mapa y asignarte viajes.',
    [
      {
        text: 'Abrir ajustes',
        onPress: () => {
          Linking.openSettings();
        },
      },
      {
        text: 'Cancelar',
        style: 'destructive',
      },
    ]
  );
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

  switch (status) {
    case 'granted':
      return PermissionStatus.GRANTED;
    case 'denied':
      return PermissionStatus.DENIED;
    default:
      return PermissionStatus.UNDETERMINED;
  }
};
