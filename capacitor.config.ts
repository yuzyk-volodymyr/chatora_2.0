import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatora.app',
  appName: 'Chatora',
  webDir: '.output/public',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000, // Заставка будет висеть ровно 3 секунды
      launchAutoHide: true,
      backgroundColor: "#0a0a0a",
      androidScaleType: "CENTER_INSIDE", // Вписывает картинку целиком, не обрезая и не сплющивая
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;