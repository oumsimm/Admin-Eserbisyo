import { useState, useEffect } from 'react';
import { Platform } from '../utils/platform';

// Web-compatible mock for expo-barcode-scanner
const mockBarCodeScanner = {
  Constants: {
    BarCodeType: {
      qr: 'qr',
      pdf417: 'pdf417',
      aztec: 'aztec',
      codabar: 'codabar',
      code39: 'code39',
      code93: 'code93',
      code128: 'code128',
      code138: 'code138',
      code39mod43: 'code39mod43',
      datamatrix: 'datamatrix',
      ean13: 'ean13',
      ean8: 'ean8',
      itf14: 'itf14',
      maxicode: 'maxicode',
      rss14: 'rss14',
      rssexpanded: 'rssexpanded',
      upc_a: 'upc_a',
      upc_e: 'upc_e',
      upc_ean: 'upc_ean',
    },
    Type: {
      front: 'front',
      back: 'back',
    },
    FlashMode: {
      off: 'off',
      on: 'on',
      auto: 'auto',
      torch: 'torch',
    },
    TorchMode: {
      off: 'off',
      on: 'on',
    },
  },
  // Mock component for web
  default: function MockBarCodeScanner({ onBarCodeScanned, style, ...props }) {
    return null; // Return null for web builds
  }
};

export const useQRScanner = () => {
  const [BarCodeScanner, setBarCodeScanner] = useState(null);
  const [BarCodeScannerConstants, setBarCodeScannerConstants] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadScanner = async () => {
      // Use mock for web platform
      if (Platform.OS === 'web') {
        setBarCodeScanner(() => mockBarCodeScanner.default);
        setBarCodeScannerConstants(mockBarCodeScanner.Constants);
        setIsLoaded(true);
        return;
      }

      try {
        const barcodeScanner = await import('expo-barcode-scanner');
        setBarCodeScanner(() => barcodeScanner.BarCodeScanner);
        setBarCodeScannerConstants(barcodeScanner.Constants);
        setIsLoaded(true);
      } catch (err) {
        console.warn('expo-barcode-scanner not available:', err);
        // Fallback to mock if import fails
        setBarCodeScanner(() => mockBarCodeScanner.default);
        setBarCodeScannerConstants(mockBarCodeScanner.Constants);
        setError('QR Scanner not available on this device');
        setIsLoaded(true);
      }
    };

    loadScanner();
  }, []);

  return {
    BarCodeScanner,
    BarCodeScannerConstants,
    isLoaded,
    error,
    isWeb: Platform.OS === 'web'
  };
};
