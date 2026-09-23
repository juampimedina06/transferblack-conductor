import { useAuthStore } from '@/presentation/auth/store/useAuthStore';
import { Button } from '@/presentation/components/ui/Button';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

const DocumentacionScreen = () => {
    const logout = useAuthStore((state) => state.logout);

    const handleLogout = async (): Promise<void> => {
        await logout();
        router.replace('/auth/login' as any);
    };

    return (
        <View className="flex-1 bg-obsidian items-center justify-center px-6">
            <Text className="text-xl font-montserrat-semibold text-platinum mb-4">Aca van las documentaciones</Text>
            <Button onPress={handleLogout} label="Cerrar sesión" />
        </View>
    );
};

export default DocumentacionScreen