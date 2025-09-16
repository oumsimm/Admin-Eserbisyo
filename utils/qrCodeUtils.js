import { digestStringAsync, CryptoDigestAlgorithm, CryptoEncoding } from 'expo-crypto';

/**
 * Generate a unique QR code data string for a user
 * @param {Object} user - User object containing id, name, email
 * @returns {Promise<string>} - Unique QR code data string
 */
export const generateUserQRData = async (user) => {
  // Create a unique identifier combining user data
  const timestamp = Date.now();
  const userString = `${user.id}-${user.email}-${user.name}-${timestamp}`;
  
  // Create a hash for security (optional)
  const hash = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    userString,
    { encoding: CryptoEncoding.HEX }
  );
  
  // Create QR data object
  const qrData = {
    type: 'USER_PROFILE',
    userId: user.id,
    name: user.name,
    email: user.email,
    hash: hash.substring(0, 16), // First 16 characters of hash
    timestamp: timestamp,
    appName: 'E-SERBISYO'
  };
  
  return JSON.stringify(qrData);
};

/**
 * Generate event check-in QR code data
 * @param {Object} event - Event object
 * @param {Object} user - User object
 * @returns {string} - Event check-in QR code data
 */
export const generateEventCheckInQRData = (event, user) => {
  const qrData = {
    type: 'EVENT_CHECKIN',
    eventId: event.id,
    eventTitle: event.title,
    userId: user.id,
    userName: user.name,
    timestamp: Date.now(),
    appName: 'E-SERBISYO'
  };
  
  return JSON.stringify(qrData);
};

/**
 * Generate a simple user ID QR code for quick profile access
 * @param {string} userId - User ID
 * @returns {string} - Simple QR code data
 */
export const generateSimpleUserQR = (userId) => {
  return `eserbisyo://user/${userId}`;
};

/**
 * Parse QR code data to extract information
 * @param {string} qrData - Scanned QR code data
 * @returns {Object|null} - Parsed QR data object or null if invalid
 */
export const parseQRData = (qrData) => {
  try {
    // Check if it's a simple URL format
    if (qrData.startsWith('eserbisyo://')) {
      const parts = qrData.split('/');
      if (parts[2] === 'user' && parts[3]) {
        return {
          type: 'SIMPLE_USER',
          userId: parts[3]
        };
      }
    }
    
    // Try to parse as JSON
    const parsedData = JSON.parse(qrData);
    
    // Validate that it's from our app
    if (parsedData.appName === 'E-SERBISYO') {
      return parsedData;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing QR data:', error);
    return null;
  }
};

/**
 * Validate QR code data integrity
 * @param {Object} qrData - Parsed QR code data
 * @returns {boolean} - True if valid
 */
export const validateQRData = (qrData) => {
  if (!qrData) return false;
  
  // Check if it has required fields based on type
  switch (qrData.type) {
    case 'USER_PROFILE':
      return !!(qrData.userId && qrData.name && qrData.email && qrData.hash);
    case 'EVENT_CHECKIN':
      return !!(qrData.eventId && qrData.userId && qrData.eventTitle);
    case 'SIMPLE_USER':
      return !!(qrData.userId);
    default:
      return false;
  }
};

/**
 * Generate a dynamic QR code that includes current timestamp for security
 * @param {Object} user - User object
 * @returns {Promise<string>} - Dynamic QR code data
 */
export const generateDynamicUserQR = async (user) => {
  const currentTime = new Date();
  const qrData = {
    type: 'DYNAMIC_USER',
    userId: user.id,
    name: user.name,
    email: user.email,
    timestamp: currentTime.getTime(),
    expiresAt: currentTime.getTime() + (24 * 60 * 60 * 1000), // Expires in 24 hours
    appName: 'E-SERBISYO'
  };
  
  return JSON.stringify(qrData);
};

/**
 * Check if a dynamic QR code is still valid
 * @param {Object} qrData - Parsed QR code data
 * @returns {boolean} - True if still valid
 */
export const isDynamicQRValid = (qrData) => {
  if (qrData.type !== 'DYNAMIC_USER' || !qrData.expiresAt) {
    return true; // Non-dynamic QR codes don't expire
  }
  
  return Date.now() < qrData.expiresAt;
};
