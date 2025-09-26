/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    // Exclude React Native modules from web builds to prevent JSX parsing errors
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'expo-barcode-scanner': require.resolve('./utils/barcodeScannerMock.js'),
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'expo-barcode-scanner': false,
        'react-native': false,
        'react-native-web': false,
        'expo-camera': false,
        'expo-av': false,
        'expo-location': false,
        'expo-file-system': false,
        'expo-media-library': false,
        'expo-sharing': false,
        'expo-haptics': false,
        'expo-image-picker': false,
        'expo-image-manipulator': false,
        'expo-blur': false,
        'expo-linear-gradient': false,
        'expo-linking': false,
        'expo-web-browser': false,
        'expo-constants': false,
        'expo-crypto': false,
        'expo-font': false,
        'expo-image': false,
        'expo-splash-screen': false,
        'expo-status-bar': false,
        'expo-symbols': false,
        'expo-system-ui': false,
        'expo-auth-session': false,
        'react-native-maps': false,
        'react-native-svg': false,
        'react-native-webview': false,
        'react-native-gesture-handler': false,
        'react-native-reanimated': false,
        'react-native-safe-area-context': false,
        'react-native-screens': false,
        'react-native-modal': false,
        'react-native-qrcode-svg': false,
        'react-native-chart-kit': false,
        'react-native-toast-message': false,
        'react-native-clipboard': false,
        'jsqr': false,
        '@react-native-async-storage/async-storage': false,
        '@react-navigation/native': false,
        '@react-navigation/stack': false,
        '@react-navigation/bottom-tabs': false,
        '@react-navigation/elements': false,
        '@gorhom/bottom-sheet': false,
        '@react-native-clipboard/clipboard': false,
      };
    }

    return config;
  },
}

module.exports = nextConfig;