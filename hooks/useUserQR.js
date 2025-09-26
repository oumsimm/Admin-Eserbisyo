import { useState, useEffect, useCallback } from 'react';
import qrService from '../services/qrService';

export function useUserQR(user) {
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateQR = useCallback(async (forceNew = false) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      if (forceNew) {
        await qrService.invalidateOldQRCodes(user.id || user.uid);
      }

      let currentQR = await qrService.getCurrentQR(user.id || user.uid);
      
      if (!currentQR || forceNew) {
        const result = await qrService.generateUserQR(user);
        if (result.success) {
          currentQR = result.data;
        } else {
          throw new Error(result.error);
        }
      }

      setQrData(currentQR);
      return currentQR;
    } catch (err) {
      console.error('Error in useUserQR:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  const refreshQR = useCallback(() => {
    return generateQR(true);
  }, [generateQR]);

  return {
    qrData,
    qrValue: qrData ? JSON.stringify(qrData) : null,
    isLoading,
    error,
    generateQR,
    refreshQR
  };
}
