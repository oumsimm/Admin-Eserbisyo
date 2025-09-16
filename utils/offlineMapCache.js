// Offline Map Caching Utility
// Provides offline map data caching and management

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  MAP_DATA: 'offline_map_data',
  EVENTS: 'offline_events',
  INCIDENTS: 'offline_incidents',
  CENTERS: 'offline_centers',
  CACHE_TIMESTAMP: 'cache_timestamp',
  CACHE_VERSION: 'cache_version'
};

const CACHE_VERSION = '1.0.0';
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

export const CacheStatus = {
  VALID: 'valid',
  EXPIRED: 'expired',
  MISSING: 'missing',
  ERROR: 'error'
};

export const checkCacheStatus = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    const version = await AsyncStorage.getItem(CACHE_KEYS.CACHE_VERSION);
    
    if (!timestamp || !version) {
      return { status: CacheStatus.MISSING, version: null, age: null };
    }
    
    if (version !== CACHE_VERSION) {
      return { status: CacheStatus.EXPIRED, version, age: null };
    }
    
    const cacheTime = parseInt(timestamp);
    const now = Date.now();
    const ageHours = (now - cacheTime) / (1000 * 60 * 60);
    
    if (ageHours > CACHE_EXPIRY_HOURS) {
      return { status: CacheStatus.EXPIRED, version, age: ageHours };
    }
    
    return { status: CacheStatus.VALID, version, age: ageHours };
  } catch (error) {
    console.error('Cache status check error:', error);
    return { status: CacheStatus.ERROR, version: null, age: null, error: error.message };
  }
};

export const saveMapData = async (data) => {
  try {
    const cacheData = {
      events: data.events || [],
      incidents: data.incidents || [],
      centers: data.centers || [],
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await AsyncStorage.setItem(CACHE_KEYS.MAP_DATA, JSON.stringify(cacheData));
    await AsyncStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, cacheData.timestamp.toString());
    await AsyncStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION);
    
    return { success: true };
  } catch (error) {
    console.error('Save map data error:', error);
    return { success: false, error: error.message };
  }
};

export const loadMapData = async () => {
  try {
    const cacheStatus = await checkCacheStatus();
    
    if (cacheStatus.status !== CacheStatus.VALID) {
      return { success: false, status: cacheStatus.status };
    }
    
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.MAP_DATA);
    if (!cachedData) {
      return { success: false, status: CacheStatus.MISSING };
    }
    
    const data = JSON.parse(cachedData);
    return { success: true, data };
  } catch (error) {
    console.error('Load map data error:', error);
    return { success: false, status: CacheStatus.ERROR, error: error.message };
  }
};

export const clearCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.MAP_DATA,
      CACHE_KEYS.EVENTS,
      CACHE_KEYS.INCIDENTS,
      CACHE_KEYS.CENTERS,
      CACHE_KEYS.CACHE_TIMESTAMP,
      CACHE_KEYS.CACHE_VERSION
    ]);
    
    return { success: true };
  } catch (error) {
    console.error('Clear cache error:', error);
    return { success: false, error: error.message };
  }
};

export const getCacheSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => 
      Object.values(CACHE_KEYS).includes(key)
    );
    
    let totalSize = 0;
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    
    return { success: true, size: totalSize, sizeMB: (totalSize / 1024 / 1024).toFixed(2) };
  } catch (error) {
    console.error('Get cache size error:', error);
    return { success: false, error: error.message };
  }
};

export const saveEvents = async (events) => {
  try {
    const cacheData = {
      events,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await AsyncStorage.setItem(CACHE_KEYS.EVENTS, JSON.stringify(cacheData));
    return { success: true };
  } catch (error) {
    console.error('Save events error:', error);
    return { success: false, error: error.message };
  }
};

export const loadEvents = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.EVENTS);
    if (!cachedData) {
      return { success: false, status: CacheStatus.MISSING };
    }
    
    const data = JSON.parse(cachedData);
    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    
    if (ageHours > CACHE_EXPIRY_HOURS) {
      return { success: false, status: CacheStatus.EXPIRED };
    }
    
    return { success: true, data: data.events };
  } catch (error) {
    console.error('Load events error:', error);
    return { success: false, status: CacheStatus.ERROR, error: error.message };
  }
};

export const saveIncidents = async (incidents) => {
  try {
    const cacheData = {
      incidents,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await AsyncStorage.setItem(CACHE_KEYS.INCIDENTS, JSON.stringify(cacheData));
    return { success: true };
  } catch (error) {
    console.error('Save incidents error:', error);
    return { success: false, error: error.message };
  }
};

export const loadIncidents = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.INCIDENTS);
    if (!cachedData) {
      return { success: false, status: CacheStatus.MISSING };
    }
    
    const data = JSON.parse(cachedData);
    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    
    if (ageHours > CACHE_EXPIRY_HOURS) {
      return { success: false, status: CacheStatus.EXPIRED };
    }
    
    return { success: true, data: data.incidents };
  } catch (error) {
    console.error('Load incidents error:', error);
    return { success: false, status: CacheStatus.ERROR, error: error.message };
  }
};

export const saveCenters = async (centers) => {
  try {
    const cacheData = {
      centers,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await AsyncStorage.setItem(CACHE_KEYS.CENTERS, JSON.stringify(cacheData));
    return { success: true };
  } catch (error) {
    console.error('Save centers error:', error);
    return { success: false, error: error.message };
  }
};

export const loadCenters = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.CENTERS);
    if (!cachedData) {
      return { success: false, status: CacheStatus.MISSING };
    }
    
    const data = JSON.parse(cachedData);
    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    
    if (ageHours > CACHE_EXPIRY_HOURS) {
      return { success: false, status: CacheStatus.EXPIRED };
    }
    
    return { success: true, data: data.centers };
  } catch (error) {
    console.error('Load centers error:', error);
    return { success: false, status: CacheStatus.ERROR, error: error.message };
  }
};

export const isOfflineMode = async () => {
  try {
    // Simple check - if we can't access cache, we're offline
    const cacheStatus = await checkCacheStatus();
    return cacheStatus.status === CacheStatus.VALID;
  } catch (error) {
    return false;
  }
};

export const getOfflineData = async () => {
  try {
    const [eventsResult, incidentsResult, centersResult] = await Promise.all([
      loadEvents(),
      loadIncidents(),
      loadCenters()
    ]);
    
    return {
      success: true,
      data: {
        events: eventsResult.success ? eventsResult.data : [],
        incidents: incidentsResult.success ? incidentsResult.data : [],
        centers: centersResult.success ? centersResult.data : []
      }
    };
  } catch (error) {
    console.error('Get offline data error:', error);
    return { success: false, error: error.message };
  }
};
