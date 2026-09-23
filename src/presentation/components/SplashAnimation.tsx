import React, { useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useFonts, Montserrat_700Bold, Montserrat_400Regular } from '@expo-google-fonts/montserrat';

const logoSrc = require('@/assets/images/transferblack/logo_transferblack_sinfodo.png');

interface SplashAnimationProps {
  onAnimationEnd: () => void;
}

export const SplashAnimation = ({ onAnimationEnd }: SplashAnimationProps) => {
  const [fontsLoaded] = useFonts({
    Montserrat_700Bold,
    Montserrat_400Regular,
  });

  // Animaciones independientes para crear una secuencia cinematográfica
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(1.1); // Efecto sutil de zoom in en el fondo

  const lineScaleX = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(15);

  useEffect(() => {
    if (!fontsLoaded) return;

    // 0. El logo aparece como una marca de agua muy sutil de fondo y hace un zoom in ultra lento
    logoOpacity.value = withTiming(0.06, { duration: 2500, easing: Easing.out(Easing.ease) });
    logoScale.value = withTiming(1.3, { duration: 4000, easing: Easing.out(Easing.ease) });

    // 1. Una línea fina y elegante se expande desde el centro
    lineScaleX.value = withDelay(500, withTiming(1, { duration: 1000, easing: Easing.out(Easing.exp) }));

    // 2. El título principal aparece suavemente emergiendo hacia arriba
    titleOpacity.value = withDelay(900, withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }));
    titleTranslateY.value = withDelay(900, withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }));

    // 3. El subtítulo "DRIVER" aparece más lento y con mucho espaciado
    subtitleOpacity.value = withDelay(1300, withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) }));
    subtitleTranslateY.value = withDelay(1300, withTiming(0, { duration: 1200, easing: Easing.out(Easing.ease) }));

    // Cierra la intro
    const timeout = setTimeout(() => {
      onAnimationEnd();
    }, 4000);

    return () => clearTimeout(timeout);
  }, [fontsLoaded, onAnimationEnd]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineScaleX.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  if (!fontsLoaded) {
    return <View className="flex-1 bg-obsidian" />;
  }

  return (
    <View className="flex-1 bg-obsidian justify-center items-center px-8">
      
      {/* Marca de agua de fondo (Logo) */}
      <Animated.Image 
        source={logoSrc}
        style={[StyleSheet.absoluteFill, styles.watermark, logoStyle]}
        resizeMode="contain"
      />

      {/* Título Principal */}
      <Animated.Text 
        className="font-montserrat-bold text-[44px] text-gold text-center uppercase tracking-widest mb-6"
        style={[titleStyle, styles.glow]}
      >
        TRANSFER{'\n'}BLACK
      </Animated.Text>

      {/* Divisor Elegante */}
      <Animated.View 
        className="h-[1px] w-2/3 bg-gold opacity-60 mb-6"
        style={[lineStyle, styles.glow]}
      />

      {/* Subtítulo Premium */}
      <Animated.Text 
        className="font-montserrat text-platinum uppercase"
        style={[subtitleStyle, styles.subtitleSpacing]}
      >
        Driver
      </Animated.Text>

    </View>
  );
};

const styles = StyleSheet.create({
  watermark: {
    width: '100%',
    height: '100%',
    tintColor: '#D4AF37', // Tinte dorado para que haga match perfecto con el look
  },
  glow: {
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  subtitleSpacing: {
    fontSize: 14,
    letterSpacing: 12, // Letter spacing extremo para el look VIP
  }
});
