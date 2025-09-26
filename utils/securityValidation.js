// utils/securityValidation.js - Security and validation utilities for QR point awarding

import CryptoJS from 'crypto-js';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

// Security constants
const QR_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_QR_ENCRYPTION_KEY || 'default-key-change-in-production';
const MAX_QR_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SCANS_PER_MINUTE = 10;

/**
 * QR Code Security and Validation Class
 */
export class QRSecurityValidator {
  constructor() {
    this.scanAttempts = new Map(); // Store scan attempts for rate limiting
    this.auditLog = [];
  }

  /**
   * Validate admin permissions and authentication
   */
  async validateAdminAuth(user) {
    try {
      if (!user || !user.uid) {
        throw new Error('User not authenticated');
      }

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User record not found');
      }

      const userData = userDoc.data();
      if (!userData.isAdmin && !userData.roles?.includes('admin')) {
        throw new Error('Insufficient permissions - Admin access required');
      }

      // Check if admin account is active
      if (userData.status === 'disabled' || userData.status === 'suspended') {
        throw new Error('Admin account is disabled');
      }

      // Log admin action
      await this.logAdminAction({
        adminId: user.uid,
        action: 'qr_scan_initiated',
        timestamp: new Date().toISOString(),
        ip: this.getClientIP(),
        userAgent: navigator.userAgent
      });

      return {
        isValid: true,
        adminData: userData
      };
    } catch (error) {
      console.error('Admin auth validation failed:', error);
      
      // Log failed auth attempt
      await this.logSecurityEvent({
        type: 'admin_auth_failed',
        userId: user?.uid,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate and decrypt QR code data
   */
  validateQRCode(qrData) {
    try {
      if (!qrData || typeof qrData !== 'string') {
        throw new Error('Invalid QR code format');
      }

      // Try to parse as encrypted JSON first
      let userData;
      try {
        const decryptedData = this.decryptQRData(qrData);
        userData = JSON.parse(decryptedData);
      } catch {
        // If decryption fails, try as plain JSON
        try {
          userData = JSON.parse(qrData);
        } catch {
          // If JSON parsing fails, treat as plain user ID
          userData = {
            userId: qrData.trim(),
            timestamp: Date.now(),
            type: 'simple_id'
          };
        }
      }

      // Validate required fields
      if (!userData.userId) {
        throw new Error('User ID not found in QR code');
      }

      // Validate timestamp if present (anti-replay protection)
      if (userData.timestamp) {
        const qrAge = Date.now() - userData.timestamp;
        if (qrAge > MAX_QR_AGE) {
          throw new Error('QR code has expired');
        }
      }

      // Validate QR code signature if present
      if (userData.signature) {
        const isValidSignature = this.validateQRSignature(userData);
        if (!isValidSignature) {
          throw new Error('QR code signature is invalid - possible tampering detected');
        }
      }

      // Sanitize user ID
      userData.userId = this.sanitizeUserId(userData.userId);

      return {
        isValid: true,
        userData: userData
      };
    } catch (error) {
      console.error('QR code validation failed:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Decrypt QR code data
   */
  decryptQRData(encryptedData) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, QR_ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt QR code data');
    }
  }

  /**
   * Validate QR code digital signature
   */
  validateQRSignature(userData) {
    try {
      if (!userData.signature) {
        return false;
      }

      // Create signature string from user data (excluding the signature itself)
      const { signature, ...dataToSign } = userData;
      const signatureString = this.createSignatureString(dataToSign);
      
      // Generate expected signature
      const expectedSignature = CryptoJS.HmacSHA256(signatureString, QR_ENCRYPTION_KEY).toString();
      
      return signature === expectedSignature;
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Create signature string from data object
   */
  createSignatureString(data) {
    return Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('&');
  }

  /**
   * Sanitize user ID to prevent injection attacks
   */
  sanitizeUserId(userId) {
    if (typeof userId !== 'string') {
      throw new Error('Invalid user ID format');
    }

    // Remove any potentially harmful characters
    const sanitized = userId
      .trim()
      .replace(/[<>\"']/g, '') // Remove XSS characters
      .replace(/[{}]/g, '') // Remove potential code injection
      .substring(0, 255); // Limit length

    if (sanitized.length < 3) {
      throw new Error('User ID too short');
    }

    return sanitized;
  }

  /**
   * Check rate limiting for QR scans
   */
  checkRateLimit(adminId, clientIP) {
    const now = Date.now();
    const key = `${adminId}_${clientIP}`;
    
    // Clean old entries
    this.cleanupRateLimit(now);
    
    // Get current attempts for this admin/IP combo
    if (!this.scanAttempts.has(key)) {
      this.scanAttempts.set(key, []);
    }
    
    const attempts = this.scanAttempts.get(key);
    const recentAttempts = attempts.filter(timestamp => 
      now - timestamp < RATE_LIMIT_WINDOW
    );
    
    if (recentAttempts.length >= MAX_SCANS_PER_MINUTE) {
      return {
        allowed: false,
        error: `Rate limit exceeded. Maximum ${MAX_SCANS_PER_MINUTE} scans per minute.`,
        retryAfter: RATE_LIMIT_WINDOW - (now - Math.min(...recentAttempts))
      };
    }
    
    // Add current attempt
    attempts.push(now);
    this.scanAttempts.set(key, attempts);
    
    return {
      allowed: true,
      remainingAttempts: MAX_SCANS_PER_MINUTE - recentAttempts.length - 1
    };
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimit(currentTime) {
    for (const [key, attempts] of this.scanAttempts.entries()) {
      const recentAttempts = attempts.filter(timestamp => 
        currentTime - timestamp < RATE_LIMIT_WINDOW
      );
      
      if (recentAttempts.length === 0) {
        this.scanAttempts.delete(key);
      } else {
        this.scanAttempts.set(key, recentAttempts);
      }
    }
  }

  /**
   * Validate user exists and is eligible for points
   */
  async validateUser(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found in system');
      }

      const userData = userDoc.data();
      
      // Check if user account is active
      if (userData.status === 'disabled' || userData.status === 'banned') {
        throw new Error('User account is disabled');
      }

      // Check if user has been deleted or is inactive
      if (userData.deleted || userData.inactive) {
        throw new Error('User account is inactive');
      }

      return {
        isValid: true,
        userData: userData
      };
    } catch (error) {
      console.error('User validation failed:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Check for duplicate point awards
   */
  async checkDuplicateAwards(userId, eventIds, adminId) {
    try {
      const duplicates = [];
      
      for (const eventId of eventIds) {
        // Check if points already awarded for this user/event combination
        const awardQuery = query(
          collection(db, 'pointAwards'),
          where('userId', '==', userId),
          where('eventId', '==', eventId)
        );
        
        const awardSnapshot = await getDocs(awardQuery);
        
        if (!awardSnapshot.empty) {
          const existingAward = awardSnapshot.docs[0].data();
          duplicates.push({
            eventId,
            previousAward: existingAward,
            awardedBy: existingAward.awardedBy,
            awardedAt: existingAward.awardedAt?.toDate?.() || new Date(existingAward.awardedAt)
          });
        }
      }

      if (duplicates.length > 0) {
        // Log potential duplicate attempt
        await this.logSecurityEvent({
          type: 'duplicate_award_attempt',
          adminId,
          userId,
          eventIds,
          duplicates: duplicates.map(d => ({
            eventId: d.eventId,
            previousAwardedBy: d.awardedBy
          })),
          timestamp: new Date().toISOString()
        });

        return {
          hasDuplicates: true,
          duplicates,
          error: `Points already awarded for ${duplicates.length} event(s)`
        };
      }

      return {
        hasDuplicates: false,
        duplicates: []
      };
    } catch (error) {
      console.error('Duplicate check failed:', error);
      return {
        hasDuplicates: false,
        error: error.message
      };
    }
  }

  /**
   * Validate events are eligible for point awarding
   */
  async validateEvents(eventIds) {
    try {
      const invalidEvents = [];
      const validEvents = [];
      
      for (const eventId of eventIds) {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        
        if (!eventDoc.exists()) {
          invalidEvents.push({
            eventId,
            reason: 'Event not found'
          });
          continue;
        }

        const eventData = eventDoc.data();
        
        // Check if event is completed
        if (eventData.status !== 'completed') {
          invalidEvents.push({
            eventId,
            reason: `Event status is '${eventData.status}', not 'completed'`
          });
          continue;
        }

        // Check if event allows point awards
        if (eventData.pointAwardsDisabled) {
          invalidEvents.push({
            eventId,
            reason: 'Point awards are disabled for this event'
          });
          continue;
        }

        // Check if event has points to award
        if (!eventData.points || eventData.points <= 0) {
          invalidEvents.push({
            eventId,
            reason: 'Event has no points to award'
          });
          continue;
        }

        // Check event date restrictions if any
        if (eventData.pointAwardDeadline) {
          const deadline = new Date(eventData.pointAwardDeadline);
          if (new Date() > deadline) {
            invalidEvents.push({
              eventId,
              reason: 'Point award deadline has passed'
            });
            continue;
          }
        }

        validEvents.push({
          eventId,
          eventData
        });
      }

      return {
        isValid: invalidEvents.length === 0,
        validEvents,
        invalidEvents,
        error: invalidEvents.length > 0 ? 
          `${invalidEvents.length} event(s) are not eligible for point awards` : null
      };
    } catch (error) {
      console.error('Event validation failed:', error);
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Log admin actions for audit trail
   */
  async logAdminAction(actionData) {
    try {
      await addDoc(collection(db, 'adminAuditLog'), {
        ...actionData,
        timestamp: serverTimestamp(),
        type: 'admin_action'
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventData) {
    try {
      await addDoc(collection(db, 'securityLog'), {
        ...eventData,
        timestamp: serverTimestamp(),
        severity: this.getEventSeverity(eventData.type),
        source: 'qr_point_award_system'
      });

      // Also store in memory for immediate access
      this.auditLog.push({
        ...eventData,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 events in memory
      if (this.auditLog.length > 100) {
        this.auditLog = this.auditLog.slice(-100);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Determine severity level for security events
   */
  getEventSeverity(eventType) {
    const severityMap = {
      'admin_auth_failed': 'high',
      'invalid_qr_signature': 'high',
      'rate_limit_exceeded': 'medium',
      'duplicate_award_attempt': 'medium',
      'invalid_qr_format': 'low',
      'user_not_found': 'low',
      'event_not_eligible': 'low'
    };

    return severityMap[eventType] || 'low';
  }

  /**
   * Get client IP address (browser environment)
   */
  getClientIP() {
    // In a real application, this would be handled server-side
    // This is a simplified version for demo purposes
    return 'client-ip-placeholder';
  }

  /**
   * Generate secure QR code data for users
   */
  generateSecureQRData(userData) {
    try {
      const qrData = {
        userId: userData.id,
        displayName: userData.displayName,
        email: userData.email,
        timestamp: Date.now(),
        version: '1.0',
        type: 'user_qr'
      };

      // Add signature
      qrData.signature = CryptoJS.HmacSHA256(
        this.createSignatureString(qrData),
        QR_ENCRYPTION_KEY
      ).toString();

      // Encrypt the data
      const jsonString = JSON.stringify(qrData);
      const encrypted = CryptoJS.AES.encrypt(jsonString, QR_ENCRYPTION_KEY).toString();

      return {
        success: true,
        qrData: encrypted,
        plainData: qrData // For debugging, remove in production
      };
    } catch (error) {
      console.error('Failed to generate secure QR data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Comprehensive validation for point award process
   */
  async validatePointAwardProcess(adminUser, qrData, selectedEventIds) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      data: {}
    };

    try {
      // 1. Validate admin authentication
      const adminValidation = await this.validateAdminAuth(adminUser);
      if (!adminValidation.isValid) {
        validationResults.errors.push(`Admin validation failed: ${adminValidation.error}`);
        validationResults.isValid = false;
      } else {
        validationResults.data.adminData = adminValidation.adminData;
      }

      // 2. Check rate limits
      const rateLimitCheck = this.checkRateLimit(adminUser.uid, this.getClientIP());
      if (!rateLimitCheck.allowed) {
        validationResults.errors.push(`Rate limit exceeded: ${rateLimitCheck.error}`);
        validationResults.isValid = false;
        validationResults.data.retryAfter = rateLimitCheck.retryAfter;
      }

      // 3. Validate QR code
      const qrValidation = this.validateQRCode(qrData);
      if (!qrValidation.isValid) {
        validationResults.errors.push(`QR validation failed: ${qrValidation.error}`);
        validationResults.isValid = false;
      } else {
        validationResults.data.userData = qrValidation.userData;
      }

      // 4. Validate user (if QR validation passed)
      if (qrValidation.isValid) {
        const userValidation = await this.validateUser(qrValidation.userData.userId);
        if (!userValidation.isValid) {
          validationResults.errors.push(`User validation failed: ${userValidation.error}`);
          validationResults.isValid = false;
        } else {
          validationResults.data.userDetails = userValidation.userData;
        }
      }

      // 5. Validate events
      const eventValidation = await this.validateEvents(selectedEventIds);
      if (!eventValidation.isValid) {
        validationResults.errors.push(`Event validation failed: ${eventValidation.error}`);
        validationResults.isValid = false;
        validationResults.data.invalidEvents = eventValidation.invalidEvents;
      } else {
        validationResults.data.validEvents = eventValidation.validEvents;
      }

      // 6. Check for duplicate awards (if user and events are valid)
      if (qrValidation.isValid && eventValidation.isValid) {
        const duplicateCheck = await this.checkDuplicateAwards(
          qrValidation.userData.userId,
          selectedEventIds,
          adminUser.uid
        );
        
        if (duplicateCheck.hasDuplicates) {
          validationResults.warnings.push(`Duplicate awards detected: ${duplicateCheck.error}`);
          validationResults.data.duplicates = duplicateCheck.duplicates;
          // Note: This is a warning, not an error, admin can choose to override
        }
      }

      // 7. Calculate total points to be awarded
      if (eventValidation.isValid) {
        const totalPoints = eventValidation.validEvents.reduce(
          (sum, event) => sum + (event.eventData.points || 0),
          0
        );
        validationResults.data.totalPoints = totalPoints;
      }

      // Log validation attempt
      await this.logAdminAction({
        adminId: adminUser.uid,
        action: 'point_award_validation',
        userId: qrValidation.userData?.userId,
        eventIds: selectedEventIds,
        validationResult: validationResults.isValid ? 'passed' : 'failed',
        errors: validationResults.errors,
        warnings: validationResults.warnings
      });

    } catch (error) {
      console.error('Validation process failed:', error);
      validationResults.errors.push(`Validation process error: ${error.message}`);
      validationResults.isValid = false;
    }

    return validationResults;
  }

  /**
   * Get audit log for admin review
   */
  getAuditLog(limit = 50) {
    return this.auditLog.slice(-limit);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.scanAttempts.clear();
    this.auditLog.length = 0;
  }
}

/**
 * Utility functions for QR code generation and validation
 */
export const QRUtils = {
  /**
   * Generate QR code URL for user
   */
  generateUserQRURL(userData, baseURL = 'https://yourapp.com') {
    const validator = new QRSecurityValidator();
    const secureData = validator.generateSecureQRData(userData);
    
    if (!secureData.success) {
      throw new Error('Failed to generate secure QR data');
    }
    
    return `${baseURL}/qr/${encodeURIComponent(secureData.qrData)}`;
  },

  /**
   * Create QR code data for simple user ID (less secure but simpler)
   */
  createSimpleQRData(userId) {
    return {
      userId: userId,
      timestamp: Date.now(),
      type: 'simple_user_qr',
      version: '1.0'
    };
  },

  /**
   * Validate QR code format before processing
   */
  isValidQRFormat(qrData) {
    if (!qrData || typeof qrData !== 'string') {
      return false;
    }

    // Check for minimum length
    if (qrData.length < 3) {
      return false;
    }

    // Check for common QR code patterns
    if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
      return true; // URL format
    }

    try {
      JSON.parse(qrData);
      return true; // JSON format
    } catch {
      // Could be plain text user ID
      return /^[a-zA-Z0-9_@.-]+$/.test(qrData);
    }
  },

  /**
   * Extract user ID from various QR code formats
   */
  extractUserID(qrData) {
    try {
      // Try JSON first
      const parsed = JSON.parse(qrData);
      return parsed.userId || parsed.id || parsed.user_id;
    } catch {
      // If not JSON, treat as plain user ID
      return qrData.trim();
    }
  }
};

/**
 * Error classes for better error handling
 */
export class QRValidationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'QRValidationError';
    this.code = code;
    this.details = details;
  }
}

export class SecurityError extends Error {
  constructor(message, severity = 'medium', details = {}) {
    super(message);
    this.name = 'SecurityError';
    this.severity = severity;
    this.details = details;
  }
}

export class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Export default instance for immediate use
export const qrValidator = new QRSecurityValidator();