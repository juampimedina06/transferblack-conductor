import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

  const plugins = [...(config.plugins ?? [])];

  const hasMapsPlugin = plugins.some((p) =>
    Array.isArray(p) ? p[0] === 'react-native-maps' : p === 'react-native-maps'
  );

  if (!hasMapsPlugin) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
        iosGoogleMapsApiKey: googleMapsApiKey,
      },
    ]);
  }

  return {
    ...config,
    name: config.name ?? 'Transferblack Conductor',
    slug: config.slug ?? 'transferblack-driver',
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier ?? 'com.transferblack.driver',
      config: {
        ...config.ios?.config,
        ...(googleMapsApiKey
          ? {
              googleMaps: {
                apiKey: googleMapsApiKey,
              },
            }
          : {}),
      },
    },
    android: {
      ...config.android,
      package: config.android?.package ?? 'com.transferblack.driver',
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
    plugins,
  };
};
