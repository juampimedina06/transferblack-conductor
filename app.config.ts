import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey =
    process.env.NAVIGATION_SDK_KEY ?? process.env.VITE_GOOGLE_MAPS_API_KEY;

  return {
    ...config,
    name: config.name ?? 'Transferblack Conductor',
    slug: config.slug ?? 'transferblack-driver',
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.transferblack.driver',
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'com.transferblack.driver',
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
      config: {
        ...config.android?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
  };
};
