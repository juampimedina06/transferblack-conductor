import {
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    useFonts
} from "@expo-google-fonts/montserrat";
import { SplashScreen, Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryProvider } from "../presentation/providers/QueryProvider";
import { usePushNotifications } from "../presentation/hooks/usePushNotifications";
import "../global.css";

SplashScreen.preventAutoHideAsync();

function PushNotificationRoot() {
    usePushNotifications();
    return null;
}

const Layout = () => {
    const [fontsLoaded, error] = useFonts({
        Montserrat_400Regular,
        Montserrat_500Medium,
        Montserrat_600SemiBold,
        Montserrat_700Bold,
    });


    if (!fontsLoaded && !error) {
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