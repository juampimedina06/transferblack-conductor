import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TripOfferTheme } from '../theme/tripOfferTheme';

export type TripStepIndex = 0 | 1 | 2 | 3;

export interface ProgressStepperProps {
  theme: TripOfferTheme;
  currentStep: TripStepIndex; // 0: En camino, 1: Llegué, 2: En viaje, 3: Finalizado
}

const STEP_LABELS = ['En camino', 'Llegué', 'En viaje', 'Finalizado'] as const;

/**
 * Stepper continuo de 4 pasos para progreso de viaje:
 * - Línea fina con marcadores concentricos
 * - Resalte dinámico en acento Gold/Emerald según estado
 * - Sin cajas anidadas ni bordes pesados
 */
export const ProgressStepper: React.FC<ProgressStepperProps> = React.memo(({
  theme,
  currentStep,
}) => {
  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${currentStep + 1} de 4: ${STEP_LABELS[currentStep]}`}
      accessibilityValue={{ min: 1, max: 4, now: currentStep + 1 }}
    >
      <View style={styles.trackContainer}>
        {STEP_LABELS.map((label, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const isPending = idx > currentStep;

          const dotColor = isActive
            ? theme.accent
            : isCompleted
              ? theme.cashAccent
              : theme.innerSurfaceBorder;

          const labelColor = isActive
            ? theme.accent
            : isCompleted
              ? theme.textSecondary
              : theme.textSubtle;

          return (
            <React.Fragment key={label}>
              {/* Connector line before (if not first) */}
              {idx > 0 && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor: idx <= currentStep
                        ? theme.cashAccent
                        : theme.innerSurfaceBorder,
                      opacity: idx <= currentStep ? 0.9 : 0.4,
                    },
                  ]}
                />
              )}

              {/* Step item */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: dotColor,
                      borderColor: isActive
                        ? theme.accent
                        : 'transparent',
                      transform: [{ scale: isActive ? 1.25 : 1 }],
                      shadowColor: isActive ? theme.accent : undefined,
                      shadowOpacity: isActive ? 0.8 : 0,
                      shadowRadius: isActive ? 4 : 0,
                    },
                  ]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.stepLabel,
                    {
                      color: labelColor,
                      fontFamily: isActive ? 'Montserrat_700Bold' : 'Montserrat_500Medium',
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
});

ProgressStepper.displayName = 'ProgressStepper';

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    width: '100%',
  },
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  line: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 4,
    marginBottom: 16,
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 54,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
    elevation: 2,
  },
  stepLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
