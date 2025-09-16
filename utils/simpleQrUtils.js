/**
 * Simple QR code utilities without complex dependencies
 * Fallback for basic QR code functionality
 */

/**
 * Generate a simple user QR code
 * @param {Object} user - User object
 * @returns {string} - QR code data string
 */
export const generateSimpleUserQR = (user) => {
  const userData = {
    type: 'USER_PROFILE',
    userId: user.id || 'unknown',
    name: user.name || 'Unknown User',
    email: user.email || '',
    timestamp: Date.now(),
    appName: 'E-SERBISYO'
  };
  
  return JSON.stringify(userData);
};

/**
 * Generate event QR code
 * @param {Object} event - Event object
 * @returns {string} - QR code data string
 */
export const generateEventQR = (event) => {
  const eventData = {
    type: 'EVENT_INFO',
    eventId: event.id || 'unknown',
    eventTitle: event.title || 'Unknown Event',
    eventDate: event.date || '',
    location: event.location || '',
    points: event.points || 0,
    timestamp: Date.now(),
    appName: 'E-SERBISYO'
  };
  
  return JSON.stringify(eventData);
};

/**
 * Generate a URL-based QR code (simplest approach)
 * @param {string} userId - User ID
 * @returns {string} - Simple URL format
 */
export const generateUserURLQR = (userId) => {
  return `eserbisyo://user/${userId}`;
};

/**
 * Parse QR code data
 * @param {string} qrData - Scanned QR code data
 * @returns {Object|null} - Parsed data or null
 */
export const parseQRData = (qrData) => {
  try {
    // Handle URL format
    if (qrData.startsWith('eserbisyo://')) {
      const parts = qrData.split('/');
      if (parts[2] === 'user' && parts[3]) {
        return {
          type: 'SIMPLE_USER',
          userId: parts[3]
        };
      }
    }
    
    // Handle JSON format
    const parsedData = JSON.parse(qrData);
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
 * Validate QR code data
 * @param {Object} qrData - Parsed QR data
 * @returns {boolean} - True if valid
 */
export const validateQRData = (qrData) => {
  if (!qrData) return false;
  
  switch (qrData.type) {
    case 'USER_PROFILE':
      return !!(qrData.userId && qrData.name);
    case 'EVENT_INFO':
      return !!(qrData.eventId && qrData.eventTitle);
    case 'SIMPLE_USER':
      return !!(qrData.userId);
    default:
      return false;
  }
};
