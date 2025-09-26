// services/qrService.js
import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

class QRService {
  constructor() {
    this.QR_STORAGE_KEY = 'user_qr_codes';
    this.CURRENT_QR_KEY = 'current_qr_code';
  }

  /**
   * Generate a new QR code for a user
   */
  async generateUserQR(user) {
    try {
      const payload = {
        userId: user.id || user.uid,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        address: user.address || '',
        age: user.age || null,
        mobile: user.mobile || user.phone || '',
        timestamp: new Date().toISOString(),
        nonce: uuidv4(),
        version: '1.0' // For future compatibility
      };

      const stringPayload = JSON.stringify(payload);
      
      // Create signature using SHA256
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        stringPayload + (user.secretKey || 'default_secret')
      );

      const qrData = {
        payload,
        signature,
        generatedAt: new Date().toISOString()
      };

      // Store the QR code
      await this.storeQRCode(user.id || user.uid, qrData);

      return {
        success: true,
        qrValue: JSON.stringify(qrData),
        data: qrData
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store QR code in AsyncStorage
   */
  async storeQRCode(userId, qrData) {
    try {
      // Store current QR
      await AsyncStorage.setItem(`${this.CURRENT_QR_KEY}_${userId}`, JSON.stringify(qrData));

      // Store in history for audit trail
      const existingCodes = await this.getQRHistory(userId);
      const updatedHistory = [...existingCodes, qrData].slice(-10); // Keep last 10
      
      await AsyncStorage.setItem(`${this.QR_STORAGE_KEY}_${userId}`, JSON.stringify(updatedHistory));
      
      return true;
    } catch (error) {
      console.error('Error storing QR code:', error);
      return false;
    }
  }

  /**
   * Get current valid QR code for user
   */
  async getCurrentQR(userId) {
    try {
      const stored = await AsyncStorage.getItem(`${this.CURRENT_QR_KEY}_${userId}`);
      if (!stored) return null;

      const qrData = JSON.parse(stored);
      
      // Check if QR is still valid (not older than 24 hours)
      const generatedAt = new Date(qrData.generatedAt);
      const now = new Date();
      const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        // QR expired, return null to trigger regeneration
        return null;
      }

      return qrData;
    } catch (error) {
      console.error('Error getting current QR:', error);
      return null;
    }
  }

  /**
   * Get QR code history
   */
  async getQRHistory(userId) {
    try {
      const stored = await AsyncStorage.getItem(`${this.QR_STORAGE_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting QR history:', error);
      return [];
    }
  }

  /**
   * Validate QR code signature
   */
  async validateQR(qrString, secretKey = 'default_secret') {
    try {
      const qrData = JSON.parse(qrString);
      const { payload, signature } = qrData;
      
      if (!payload || !signature) {
        return { valid: false, error: 'Invalid QR format' };
      }

      // Recreate signature
      const stringPayload = JSON.stringify(payload);
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        stringPayload + secretKey
      );

      const isValid = signature === expectedSignature;
      
      // Check timestamp validity (not older than 24 hours)
      const timestamp = new Date(payload.timestamp);
      const now = new Date();
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        return { valid: false, error: 'QR code expired' };
      }

      return {
        valid: isValid,
        payload: isValid ? payload : null,
        error: isValid ? null : 'Invalid signature'
      };
    } catch (error) {
      return { valid: false, error: 'Invalid QR data format' };
    }
  }

  /**
   * Invalidate old QR codes when profile is updated
   */
  async invalidateOldQRCodes(userId) {
    try {
      await AsyncStorage.removeItem(`${this.CURRENT_QR_KEY}_${userId}`);
      return true;
    } catch (error) {
      console.error('Error invalidating QR codes:', error);
      return false;
    }
  }
}

export default new QRService();