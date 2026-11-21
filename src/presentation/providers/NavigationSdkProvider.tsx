import React, { type ReactNode } from 'react';
import { getGoogleNavigationSdk } from '@/core/navigation/googleNavigationSdk';

interface NavigationSdkProviderProps {
  children: ReactNode;
}

const TERMS_DIALOG_OPTIONS = {
  title: 'Términos de Navegación',
  companyName: 'TransferBlack',
  uiParams: {
    backgroundColor: '#12131A',
    titleColor: '#D4AF37',
    mainTextColor: '#E4E4E5',
    acceptButtonTextColor: '#D4AF37',
    cancelButtonTextColor: '#A1A1AA',
  },
};

/**
 * Envuelve el árbol autenticado con `NavigationProvider` del Google Navigation SDK oficial.
 * En Expo Go o entornos sin módulo nativo renderiza los children directamente sin crashear.
 */
export const NavigationSdkProvider: React.FC<NavigationSdkProviderProps> = ({ children }) => {
  const sdk = getGoogleNavigationSdk();

  if (!sdk) {
    return <>{children}</>;
  }

  const { NavigationProvider, TaskRemovedBehavior } = sdk;

  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={TERMS_DIALOG_OPTIONS}
      taskRemovedBehavior={TaskRemovedBehavior.CONTINUE_SERVICE}
    >
      {children}
    </NavigationProvider>
  );
};
