import React, { useCallback, useEffect, useState, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SplashAnimation } from '../components/SplashAnimation';

export const SplashVideoScreen = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishSplash = useCallback(() => {
    if (isNavigating) return;
    setIsNavigating(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Usamos replace para que no se pueda volver atrás al video con el botón back
    router.replace('/auth/login' as any);
  }, [isNavigating, router]);

  // The safety timeout is armed once on mount, so it must not depend on
  // finishSplash: that function closes over isNavigating and would re-arm the
  // timeout on every state change. The ref keeps the latest version.
  const finishSplashRef = useRef(finishSplash);

  useEffect(() => {
    finishSplashRef.current = finishSplash;
  }, [finishSplash]);

  useEffect(() => {
    // Ocultar el splash nativo apenas montamos la animación SVG
    SplashScreen.hideAsync().catch(() => {});

    // Timeout de seguridad en caso de que falle el callback de la animación
    timeoutRef.current = setTimeout(() => {
      finishSplashRef.current();
    }, 6000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <SplashAnimation onAnimationEnd={finishSplash} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background to blend with SVG
  },
});
