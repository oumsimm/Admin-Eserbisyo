// utils/barcodeScannerMock.js
module.exports = {
    BarCodeScanner: {
      scan: async () => ({
        data: 'mocked-barcode-123',
        type: 'qr',
      }),
      requestPermissionsAsync: async () => ({ status: 'granted' }),
      getPermissionsAsync: async () => ({ status: 'granted' }),
    },
  };