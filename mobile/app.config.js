// Anahtarlar ortam değişkeninden okunur, repoya girmez.
// Yerel: mobile/.env dosyası. Build: eas secret:create ile tanımlanır.
import 'dotenv/config';

export default {
  expo: {
    name: 'Komşuda',
    slug: 'komsuda',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'komsuda',
    userInterfaceStyle: 'light',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#F2F4F1',
    },
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.fbural.komsuda',
      versionCode: 2,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1F6F4A',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'POST_NOTIFICATIONS',
      ],
    },
    plugins: [
      '@maplibre/maplibre-react-native',
      [
        'expo-image-picker',
        {
          photosPermission: 'Ürün fotoğrafı paylaşabilmen için galerine erişim izni gerekiyor.',
          cameraPermission: 'Ürün fotoğrafı çekebilmen için kamera izni gerekiyor.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Komşuda, yakınındaki komşuların acil ihtiyaç isteklerini sana bildirebilmek için konumunu kullanır.',
          locationWhenInUsePermission:
            'Komşuda, yakınındaki istekleri haritada gösterebilmek için konumunu kullanır.',
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#1F6F4A',
          sounds: ['./assets/sounds/zil.wav', './assets/sounds/zil_acil.wav'],
        },
      ],
    ],
    extra: {
      apiUrl: process.env.API_URL || 'https://komsuda-backend.onrender.com',
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};
