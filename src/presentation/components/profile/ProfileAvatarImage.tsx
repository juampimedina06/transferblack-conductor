import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';

interface ProfileAvatarImageProps {
  avatarUrl: string | null | undefined;
  expiresAt?: string | null;
  initials: string;
  initialsClassName?: string;
  fallbackContainerClassName?: string;
  onRefreshUrl?: () => Promise<void>;
}

const EXPIRY_REFRESH_BUFFER_MS = 60_000;

function isExpiringSoon(expiresAt?: string | null): boolean {
  if (!expiresAt) {
    return false;
  }

  const expiryMs = Date.parse(expiresAt);
  if (Number.isNaN(expiryMs)) {
    return false;
  }

  return expiryMs - Date.now() <= EXPIRY_REFRESH_BUFFER_MS;
}

/**
 * Displays a profile photo stored behind a private S3 presigned URL and renews
 * expiring URLs on focus, app foreground, or image load failure without infinite loops.
 */
export const ProfileAvatarImage: React.FC<ProfileAvatarImageProps> = ({
  avatarUrl,
  expiresAt,
  initials,
  initialsClassName = 'text-gold font-montserrat-bold text-3xl',
  fallbackContainerClassName = 'w-full h-full items-center justify-center',
  onRefreshUrl,
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const checkAndRefreshIfExpiring = useCallback(() => {
    if (!onRefreshUrl || !avatarUrl) {
      return;
    }

    if (isExpiringSoon(expiresAt)) {
      void onRefreshUrl().catch(() => undefined);
    }
  }, [avatarUrl, expiresAt, onRefreshUrl]);

  useFocusEffect(
    useCallback(() => {
      checkAndRefreshIfExpiring();
    }, [checkAndRefreshIfExpiring]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkAndRefreshIfExpiring();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkAndRefreshIfExpiring]);

  const handleImageError = () => {
    if (!avatarUrl) {
      return;
    }

    if (failedUrl !== avatarUrl) {
      setFailedUrl(avatarUrl);
      if (onRefreshUrl) {
        void onRefreshUrl().catch(() => undefined);
      }
    }
  };

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        onError={handleImageError}
      />
    );
  }

  return (
    <View className={fallbackContainerClassName}>
      <Text className={initialsClassName}>{initials}</Text>
    </View>
  );
};
