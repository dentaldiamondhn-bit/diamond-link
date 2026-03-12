import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.diamondlink.app',
  appName: 'Diamond Link',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['*']
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'notification_icon',
      iconColor: '#14b8a6',
      sound: 'default'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    AppLauncher: {
      enabled: true
    }
  }
};

export default config;
