import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.fiscalizacionapp',
  appName: 'fiscalizacionApp',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    FirebaseAuthentication: {
      // Use JS SDK in app; plugin handles native UI
      skipNativeAuth: true,
      providers: ['google.com'],
      // Optionally set a custom authDomain if needed on native
      // authDomain: 'YOUR_AUTH_DOMAIN',
    },
  },
};

export default config;
