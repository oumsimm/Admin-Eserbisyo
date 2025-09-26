import React, { createContext, useContext, useEffect } from 'react';
import { useUser } from './UserContext';
import qrService from '../services/qrService';

const QRContext = createContext();

export const QRProvider = ({ children }) => {
  const { userData } = useUser();

  // Auto-generate QR when user data changes
  useEffect(() => {
    if (userData && userData.uid) {
      handleUserDataChange();
    }
  }, [
    userData?.name,
    userData?.firstName,
    userData?.lastName,
    userData?.address,
    userData?.age,
    userData?.mobile,
    userData?.phone
  ]);

  const handleUserDataChange = async () => {
    try {
      // Invalidate old QR codes
      await qrService.invalidateOldQRCodes(userData.uid);
      
      // Generate new QR code automatically
      const result = await qrService.generateUserQR(userData);
      
      if (result.success) {
        console.log('QR code auto-generated after profile update');
      } else {
        console.error('Failed to auto-generate QR:', result.error);
      }
    } catch (error) {
      console.error('Error in auto QR generation:', error);
    }
  };

  return (
    <QRContext.Provider value={{ handleUserDataChange }}>
      {children}
    </QRContext.Provider>
  );
};

export const useQR = () => {
  const context = useContext(QRContext);
  if (!context) {
    throw new Error('useQR must be used within QRProvider');
  }
  return context;
};