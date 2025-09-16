import Toast from 'react-native-toast-message';
import { Platform } from 'react-native';

class ErrorService {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  // Log error for debugging
  logError(error, context = 'Unknown', severity = 'error') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error?.message || error?.toString() || 'Unknown error',
      stack: error?.stack,
      context,
      severity,
      platform: Platform.OS,
      version: Platform.Version,
    };

    this.errorLog.push(errorEntry);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console in development
    if (__DEV__) {
      console.error(`[${context}] ${errorEntry.error}`, error);
    }

    return errorEntry;
  }

  // Show user-friendly error message
  showError(title = 'Error', message = 'Something went wrong', type = 'error') {
    Toast.show({
      type,
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  }

  // Handle Firebase errors
  handleFirebaseError(error, context = 'Firebase') {
    let userMessage = 'Something went wrong. Please try again.';
    let title = 'Error';

    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          userMessage = 'User account not found.';
          title = 'Authentication Error';
          break;
        case 'auth/wrong-password':
          userMessage = 'Incorrect password. Please try again.';
          title = 'Authentication Error';
          break;
        case 'auth/email-already-in-use':
          userMessage = 'An account with this email already exists.';
          title = 'Registration Error';
          break;
        case 'auth/weak-password':
          userMessage = 'Password is too weak. Please choose a stronger password.';
          title = 'Registration Error';
          break;
        case 'auth/invalid-email':
          userMessage = 'Please enter a valid email address.';
          title = 'Input Error';
          break;
        case 'permission-denied':
          userMessage = 'You don\'t have permission to perform this action.';
          title = 'Permission Denied';
          break;
        case 'unavailable':
          userMessage = 'Service is currently unavailable. Please try again later.';
          title = 'Service Unavailable';
          break;
        case 'deadline-exceeded':
          userMessage = 'Request timed out. Please check your connection and try again.';
          title = 'Timeout Error';
          break;
        default:
          userMessage = 'An unexpected error occurred. Please try again.';
      }
    } else if (error?.message) {
      userMessage = error.message;
    }

    this.logError(error, context, 'error');
    this.showError(title, userMessage, 'error');

    return {
      success: false,
      message: userMessage,
      error: error,
    };
  }

  // Handle network errors
  handleNetworkError(error, context = 'Network') {
    let userMessage = 'Network error. Please check your connection.';
    let title = 'Connection Error';

    if (error?.message?.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
      title = 'Timeout Error';
    } else if (error?.message?.includes('offline')) {
      userMessage = 'You appear to be offline. Please check your connection.';
      title = 'Offline Error';
    }

    this.logError(error, context, 'error');
    this.showError(title, userMessage, 'error');

    return {
      success: false,
      message: userMessage,
      error: error,
    };
  }

  // Handle validation errors
  handleValidationError(errors, context = 'Validation') {
    const errorMessages = Object.values(errors).filter(Boolean);
    const userMessage = errorMessages.length > 0 
      ? errorMessages[0] 
      : 'Please check your input and try again.';

    this.logError({ message: userMessage, errors }, context, 'warning');
    this.showError('Validation Error', userMessage, 'error');

    return {
      success: false,
      message: userMessage,
      errors: errors,
    };
  }

  // Handle location errors
  handleLocationError(error, context = 'Location') {
    let userMessage = 'Unable to get your location.';
    let title = 'Location Error';

    if (error?.code === 'PERMISSION_DENIED') {
      userMessage = 'Location permission denied. Please enable location services in settings.';
      title = 'Permission Required';
    } else if (error?.code === 'LOCATION_UNAVAILABLE') {
      userMessage = 'Location service is unavailable. Please try again later.';
    } else if (error?.code === 'TIMEOUT') {
      userMessage = 'Location request timed out. Please try again.';
      title = 'Timeout Error';
    }

    this.logError(error, context, 'error');
    this.showError(title, userMessage, 'error');

    return {
      success: false,
      message: userMessage,
      error: error,
    };
  }

  // Handle map errors
  handleMapError(error, context = 'Map') {
    let userMessage = 'Unable to load map.';
    let title = 'Map Error';

    if (error?.message?.includes('API key')) {
      userMessage = 'Map service configuration error. Please contact support.';
      title = 'Configuration Error';
    } else if (error?.message?.includes('network')) {
      userMessage = 'Network error. Please check your connection and try again.';
      title = 'Connection Error';
    }

    this.logError(error, context, 'error');
    this.showError(title, userMessage, 'error');

    return {
      success: false,
      message: userMessage,
      error: error,
    };
  }

  // Show success message
  showSuccess(title = 'Success', message = 'Operation completed successfully') {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  }

  // Show info message
  showInfo(title = 'Info', message = 'Information') {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
      autoHide: true,
      topOffset: 60,
    });
  }

  // Show warning message
  showWarning(title = 'Warning', message = 'Warning message') {
    Toast.show({
      type: 'warning',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
      autoHide: true,
      topOffset: 60,
    });
  }

  // Get error log for debugging
  getErrorLog() {
    return [...this.errorLog];
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }

  // Export error log
  exportErrorLog() {
    return JSON.stringify(this.errorLog, null, 2);
  }

  // Check if error is retryable
  isRetryableError(error) {
    const retryableCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'aborted',
      'out-of-range',
      'data-loss',
    ];

    if (error?.code && retryableCodes.includes(error.code)) {
      return true;
    }

    // Network errors are generally retryable
    if (error?.message?.includes('network') || error?.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

  // Get retry delay based on error type
  getRetryDelay(error, attempt = 1) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return delay + jitter;
  }
}

const errorService = new ErrorService();
export default errorService;
