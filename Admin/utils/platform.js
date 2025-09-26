// Platform detection utility for web compatibility
// This avoids importing react-native which causes webpack issues

export const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 'native',
  isWeb: typeof window !== 'undefined',
  isNative: typeof window === 'undefined'
};

export const isWeb = () => Platform.isWeb;
export const isNative = () => Platform.isNative;
