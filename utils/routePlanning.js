// Route Planning Utility
// Provides route calculation and navigation features

export const RouteMode = {
  DRIVING: 'driving',
  WALKING: 'walking',
  TRANSIT: 'transit',
  BICYCLING: 'bicycling'
};

export const calculateRoute = async (origin, destination, mode = RouteMode.DRIVING) => {
  try {
    // For now, we'll use a simple straight-line route
    // In production, integrate with Google Directions API or similar
    const route = generateStraightLineRoute(origin, destination);
    
    return {
      success: true,
      route: {
        coordinates: route.coordinates,
        distance: route.distance,
        duration: route.duration,
        mode: mode,
        steps: route.steps
      }
    };
  } catch (error) {
    console.error('Route calculation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate route'
    };
  }
};

const generateStraightLineRoute = (origin, destination) => {
  const coordinates = [origin, destination];
  const distance = calculateDistance(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );
  
  // Estimate duration based on mode (rough estimates)
  const duration = distance * 2; // 2 minutes per km average
  
  return {
    coordinates,
    distance: Math.round(distance * 1000), // Convert to meters
    duration: Math.round(duration), // Duration in minutes
    steps: [
      {
        instruction: `Head to ${destination.latitude.toFixed(4)}, ${destination.longitude.toFixed(4)}`,
        distance: Math.round(distance * 1000),
        duration: Math.round(duration)
      }
    ]
  };
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

export const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
};

export const formatDuration = (duration) => {
  if (duration < 60) {
    return `${Math.round(duration)}min`;
  } else {
    const hours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
};

export const getRouteColor = (mode) => {
  const colors = {
    [RouteMode.DRIVING]: '#3b82f6',
    [RouteMode.WALKING]: '#10b981',
    [RouteMode.TRANSIT]: '#8b5cf6',
    [RouteMode.BICYCLING]: '#f59e0b'
  };
  return colors[mode] || colors[RouteMode.DRIVING];
};

export const getRouteIcon = (mode) => {
  const icons = {
    [RouteMode.DRIVING]: 'car',
    [RouteMode.WALKING]: 'walk',
    [RouteMode.TRANSIT]: 'bus',
    [RouteMode.BICYCLING]: 'bicycle'
  };
  return icons[mode] || icons[RouteMode.DRIVING];
};

export const optimizeRoute = (coordinates, maxPoints = 100) => {
  if (coordinates.length <= maxPoints) return coordinates;
  
  // Simple optimization: keep every nth point
  const step = Math.ceil(coordinates.length / maxPoints);
  return coordinates.filter((_, index) => index % step === 0);
};

export const getBoundingBox = (coordinates) => {
  if (!coordinates || coordinates.length === 0) return null;
  
  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLon = coordinates[0].longitude;
  let maxLon = coordinates[0].longitude;
  
  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLon = Math.min(minLon, coord.longitude);
    maxLon = Math.max(maxLon, coord.longitude);
  });
  
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    center: {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2
    },
    span: {
      latitudeDelta: maxLat - minLat,
      longitudeDelta: maxLon - minLon
    }
  };
};
