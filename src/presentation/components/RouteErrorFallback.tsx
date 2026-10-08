import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './ui/Button';

interface RouteErrorFallbackProps {
  onRetry: () => void;
  onGoHome: () => void;
}

export function RouteErrorFallback({ onRetry, onGoHome }: RouteErrorFallbackProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 items-center justify-center gap-4 bg-obsidian px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Ionicons name="warning-outline" size={48} color="#D4AF37" />
      <Text className="text-center font-montserrat-bold text-2xl text-gold">
        Algo no salió como esperábamos
      </Text>
      <Text className="text-center font-montserrat text-sm text-platinum opacity-80 mb-4">
        Ocurrió un inconveniente al cargar la pantalla. Podés reintentar o regresar al inicio.
      </Text>
      <View className="w-full gap-3">
        <Button label="Reintentar" variant="primary" onPress={onRetry} />
        <Button label="Ir al inicio" variant="secondary" onPress={onGoHome} />
      </View>
    </View>
  );
}
