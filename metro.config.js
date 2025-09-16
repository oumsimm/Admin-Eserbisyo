const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration optimized for Expo Go
 * https://docs.expo.dev/guides/customizing-metro/
 */
const config = getDefaultConfig(__dirname);

// Add support for additional source extensions
config.resolver.sourceExts.push('cjs');

// Keep package exports disabled for better Expo Go compatibility
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
