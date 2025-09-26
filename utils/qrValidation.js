import qrService from '../services/qrService';

export const validateScannedQR = async (qrString) => {
  try {
    const validation = await qrService.validateQR(qrString);
    
    if (!validation.valid) {
      return {
        valid: false,
        error: validation.error,
        data: null
      };
    }

    // Additional validation rules
    const { payload } = validation;
    
    // Check required fields
    const requiredFields = ['userId', 'name', 'timestamp', 'nonce'];
    for (const field of requiredFields) {
      if (!payload[field]) {
        return {
          valid: false,
          error: `Missing required field: ${field}`,
          data: null
        };
      }
    }

    // Check timestamp format
    const timestamp = new Date(payload.timestamp);
    if (isNaN(timestamp.getTime())) {
      return {
        valid: false,
        error: 'Invalid timestamp format',
        data: null
      };
    }

    return {
      valid: true,
      error: null,
      data: payload
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid QR code format',
      data: null
    };
  }
};

export const extractUserInfoFromQR = (qrData) => {
  if (!qrData || !qrData.payload) return null;

  const { payload } = qrData;
  
  return {
    userId: payload.userId,
    name: payload.name,
    address: payload.address,
    age: payload.age,
    mobile: payload.mobile,
    generatedAt: new Date(payload.timestamp),
    nonce: payload.nonce
  };
};
