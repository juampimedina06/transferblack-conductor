import {
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    useFonts,
} from "@expo-google-fonts/montserrat";
import * as SplashScreen from "expo-splash-screen";
import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryProvider } from "../presentation/providers/QueryProvider";
import { usePushNotifications } from "../presentation/hooks/usePushNotifications";
import { ensureDefaultNotificationChannels } from "../core/notifications/notification-channel";
import { RouteErrorFallback } from "../presentation/components/RouteErrorFallback";
import "../global.css";

// Mantiene el splash nativo hasta que las fuentes e inicialización estén listas
void SplashScreen.preventAutoHideAsync();

// Pre-configura los canales de notificación en Android sin bloquear render
void ensureDefaultNotificationChannels();

function PushNotificationRoot() {
    usePushNotifications();
    return null;
}

const Layout = () => {
    const [fontsLoaded, fontError] = useFonts({
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
    });

    const fontsReady = fontsLoaded || fontError !== null;

    useEffect(() => {
        if (fontsReady) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [fontsReady]);

    if (!fontsReady) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <QueryProvider>
                <PushNotificationRoot />
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                />
            </QueryProvider>
        </GestureHandlerRootView>
    );
};

export default Layout;

/**
 * ErrorBoundary de nivel raíz para evitar que cualquier excepción de render
 * o hook no atrapado cierre el proceso nativo de la aplicación en Release.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
    useEffect(() => {
        console.error('Error de render en la raíz de la app:', error);
    }, [error]);

    return (
        <RouteErrorFallback
            onRetry={() => void retry()}
            onGoHome={() => router.replace('/auth/login' as any)}
        />
    );
}