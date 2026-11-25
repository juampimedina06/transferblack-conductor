const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
  withMainApplication,
} = require('expo/config-plugins');

/**
 * Config Plugin completo para la burbuja flotante / overlay estilo DiDi en Android:
 * 1. Declara permiso SYSTEM_ALERT_WINDOW en AndroidManifest.xml.
 * 2. Configura android:showWhenLocked="true" y android:turnScreenOn="true" en MainActivity.
 * 3. Inyecta setShowWhenLocked(true) y setTurnScreenOn(true) en MainActivity.kt.
 * 4. Registra DriverOverlayPackage() en MainApplication.kt.
 * 5. Copia DriverOverlayModule.kt y DriverOverlayPackage.kt desde plugins/android/ hacia android/ en prebuild/EAS.
 */
const withDriverOverlayManifest = (config) => {
  return withAndroidManifest(config, (manifestConfig) => {
    const androidManifest = manifestConfig.modResults;

    AndroidConfig.Permissions.ensurePermissions(androidManifest, [
      'android.permission.SYSTEM_ALERT_WINDOW',
    ]);

    const mainActivity = AndroidConfig.Manifest.getMainActivity(androidManifest);
    if (mainActivity) {
      mainActivity.$ = mainActivity.$ || {};
      mainActivity.$['android:showWhenLocked'] = 'true';
      mainActivity.$['android:turnScreenOn'] = 'true';
    }

    return manifestConfig;
  });
};

const withDriverOverlayMainActivity = (config) => {
  return withMainActivity(config, (activityConfig) => {
    let contents = activityConfig.modResults.contents;
    if (!contents.includes('setShowWhenLocked(true)')) {
      contents = contents.replace(
        'super.onCreate(null)',
        `super.onCreate(null)\n    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {\n      setShowWhenLocked(true)\n      setTurnScreenOn(true)\n    }`
      );
      activityConfig.modResults.contents = contents;
    }
    return activityConfig;
  });
};

const withDriverOverlayMainApplication = (config) => {
  return withMainApplication(config, (appConfig) => {
    let contents = appConfig.modResults.contents;
    if (!contents.includes('DriverOverlayPackage')) {
      contents = contents.replace(
        'PackageList(this).packages.apply {',
        'PackageList(this).packages.apply {\n          add(com.transferblack.driver.overlay.DriverOverlayPackage())'
      );
      appConfig.modResults.contents = contents;
    }
    return appConfig;
  });
};

const withDriverOverlayKotlinFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformRoot = modConfig.modRequest.platformProjectRoot;
      const sourceDir = path.join(projectRoot, 'plugins', 'android');
      const targetDir = path.join(
        platformRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'transferblack',
        'driver',
        'overlay'
      );

      fs.mkdirSync(targetDir, { recursive: true });

      for (const fileName of ['DriverOverlayModule.kt', 'DriverOverlayPackage.kt']) {
        const srcFile = path.join(sourceDir, fileName);
        const destFile = path.join(targetDir, fileName);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }

      const logoSrc = path.join(
        projectRoot,
        'assets',
        'images',
        'transferblack',
        'logo_transferblack_sinfodo.png'
      );
      const drawableDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      if (fs.existsSync(logoSrc)) {
        fs.copyFileSync(logoSrc, path.join(drawableDir, 'tb_floating_bubble_logo.png'));
      }

      const soundsSourceDir = path.join(projectRoot, 'assets', 'sounds');
      const rawDir = path.join(platformRoot, 'app', 'src', 'main', 'res', 'raw');
      fs.mkdirSync(rawDir, { recursive: true });
      for (const soundFile of [
        'tb_offer_black_pulse.wav',
        'tb_offer_executive_sonar.wav',
        'tb_offer_gold_chord.wav',
        'tb_offer_turbo_dispatch.wav',
        'tb_offer_transfer_voice.wav',
        'tb_offer_transfer_black_male.wav',
      ]) {
        const srcSound = path.join(soundsSourceDir, soundFile);
        if (fs.existsSync(srcSound)) {
          fs.copyFileSync(srcSound, path.join(rawDir, soundFile));
        }
      }

      return modConfig;
    },
  ]);
};

const withDriverOverlay = (config) => {
  config = withDriverOverlayManifest(config);
  config = withDriverOverlayMainActivity(config);
  config = withDriverOverlayMainApplication(config);
  config = withDriverOverlayKotlinFiles(config);
  return config;
};

module.exports = withDriverOverlay;
