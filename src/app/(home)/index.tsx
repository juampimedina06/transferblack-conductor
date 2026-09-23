import { router } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from '../../presentation/auth/store/useAuthStore';
import { Button } from '../../presentation/components/ui/Button';

const HomeScreen = (): React.JSX.Element => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.replace('/auth/login' as any);
  };

  return (
    <View className="flex-1 bg-obsidian items-center justify-center px-6">
      <Text className="text-2xl font-montserrat-bold text-platinum mb-2">
        Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
      </Text>
      <Text className="text-ash font-montserrat text-sm mb-8 text-center">
        Panel de Conductor
      </Text>

      <View className="w-full max-w-xs">
        <Button
          label="Cerrar sesión"
          variant="outline"
          onPress={handleLogout}
        />
      </View>
    </View>
  );
};

export default HomeScreen;