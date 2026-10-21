import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatora.app',
  appName: 'Chatora',
  webDir: '.output/public', // Убедитесь, что путь совпадает с тем, куда Vite собирает проект
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000, // Сколько миллисекунд показывать заставку (2000 = 2 секунды)
      launchAutoHide: true,     // Автоматически скрывать заставку
      backgroundColor: "#0a0a0a", // Темный цвет фона (как в вашем приложении)
      androidScaleType: "CENTER_CROP", // Масштабирование картинки (по центру, с обрезкой краев)
      showSpinner: false,       // Не показывать стандартный крутящийся индикатор загрузки
      splashFullScreen: true,   // Показывать на весь экран
      splashImmersive: true     // Скрывать системные панели (статус-бар и кнопки навигации)
    }
  }
};

export default config;