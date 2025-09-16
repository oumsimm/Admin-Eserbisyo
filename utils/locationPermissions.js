// Location Permission Handler
// Provides secure and user-friendly location permission management

import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

export const LocationPermissionStatus = {
  GRANTED: 'granted',
  DENIED: 'denied',
  RESTRICTED: 'restricted',
  UNDETERMINED: 'undetermined'
};

export const requestLocationPermission = async () => {
  try {
    // Check if location services are enabled
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      Alert.alert(
        'Location Services Disabled',
        'Please enable location services in your device settings to use map features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Location.openSettingsAsync() }
        ]
      );
      return { success: false, status: LocationPermissionStatus.RESTRICTED };
    }

    // Request foreground location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status === 'granted') {
      return { success: true, status: LocationPermissionStatus.GRANTED };
    } else {
      // Show explanation for why we need location
      Alert.alert(
        'Location Permission Required',
        'This app needs location access to show nearby events and provide directions. Your location data is never shared with third parties.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Grant Permission', 
            onPress: async () => {
              const { status: retryStatus } = await Location.requestForegroundPermissionsAsync();
              if (retryStatus === 'granted') {
                return { success: true, status: LocationPermissionStatus.GRANTED };
              }
              return { success: false, status: LocationPermissionStatus.DENIED };
            }
          }
        ]
      );
      return { success: false, status: LocationPermissionStatus.DENIED };
    }
  } catch (error) {
    console.error('Location permission error:', error);
    return { success: false, status: LocationPermissionStatus.RESTRICTED, error: error.message };
  }
};

export const checkLocationPermission = async () => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return {
      success: status === 'granted',
      status: status === 'granted' ? LocationPermissionStatus.GRANTED : LocationPermissionStatus.DENIED
    };
  } catch (error) {
    console.error('Check location permission error:', error);
    return { success: false, status: LocationPermissionStatus.RESTRICTED, error: error.message };
  }
};

export const getCurrentLocation = async (options = {}) => {
  try {
    const permission = await checkLocationPermission();
    if (!permission.success) {
      const requestResult = await requestLocationPermission();
      if (!requestResult.success) {
        return { success: false, error: 'Location permission denied' };
      }
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000,
      ...options
    });

    return {
      success: true,
      location: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp
      }
    };
  } catch (error) {
    console.error('Get current location error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to get current location' 
    };
  }
};

export const watchLocation = async (callback, options = {}) => {
  try {
    const permission = await checkLocationPermission();
    if (!permission.success) {
      const requestResult = await requestLocationPermission();
      if (!requestResult.success) {
        return { success: false, error: 'Location permission denied' };
      }
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
        ...options
      },
      (location) => {
        callback({
          success: true,
          location: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp
          }
        });
      }
    );

    return { success: true, subscription };
  } catch (error) {
    console.error('Watch location error:', error);
    return { success: false, error: error.message };
  }
};

export const stopWatchingLocation = (subscription) => {
  if (subscription && typeof subscription.remove === 'function') {
    subscription.remove();
  }
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getLocationAccuracyText = (accuracy) => {
  if (accuracy < 10) return 'Very High';
  if (accuracy < 50) return 'High';
  if (accuracy < 100) return 'Medium';
  if (accuracy < 500) return 'Low';
  return 'Very Low';
};
