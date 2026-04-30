import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wingman.app',
  appName: 'Wingman',
  webDir: 'capacitor-web',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://app.example.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
