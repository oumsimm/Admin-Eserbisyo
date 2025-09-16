// Map Clustering Utility for better performance with many markers
// Implements a simple grid-based clustering algorithm

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

export const createClusters = (markers, region, clusterRadius = 0.1) => {
  if (!markers || markers.length === 0) return [];

  const clusters = [];
  const processed = new Set();

  markers.forEach((marker, index) => {
    if (processed.has(index)) return;

    const cluster = {
      id: `cluster_${index}`,
      latitude: marker.latitude,
      longitude: marker.longitude,
      markers: [marker],
      isCluster: true,
      count: 1,
      type: marker.type || 'event'
    };

    // Find nearby markers to cluster
    markers.forEach((otherMarker, otherIndex) => {
      if (otherIndex === index || processed.has(otherIndex)) return;

      const distance = calculateDistance(
        marker.latitude,
        marker.longitude,
        otherMarker.latitude,
        otherMarker.longitude
      );

      if (distance <= clusterRadius) {
        cluster.markers.push(otherMarker);
        cluster.count++;
        processed.add(otherIndex);
      }
    });

    // Calculate cluster center
    if (cluster.markers.length > 1) {
      const totalLat = cluster.markers.reduce((sum, m) => sum + m.latitude, 0);
      const totalLon = cluster.markers.reduce((sum, m) => sum + m.longitude, 0);
      cluster.latitude = totalLat / cluster.markers.length;
      cluster.longitude = totalLon / cluster.markers.length;
    }

    clusters.push(cluster);
    processed.add(index);
  });

  return clusters;
};

export const getClusterSize = (count) => {
  if (count < 10) return 'small';
  if (count < 50) return 'medium';
  if (count < 100) return 'large';
  return 'xlarge';
};

export const getClusterColor = (type, count) => {
  const colors = {
    event: {
      small: '#3b82f6',
      medium: '#2563eb',
      large: '#1d4ed8',
      xlarge: '#1e40af'
    },
    incident: {
      small: '#ef4444',
      medium: '#dc2626',
      large: '#b91c1c',
      xlarge: '#991b1b'
    },
    center: {
      small: '#10b981',
      medium: '#059669',
      large: '#047857',
      xlarge: '#065f46'
    }
  };

  const size = getClusterSize(count);
  return colors[type]?.[size] || colors.event[size];
};

export const shouldCluster = (markers, region) => {
  if (!markers || markers.length < 10) return false;
  
  // Cluster if we have many markers in a small area
  const regionArea = region.latitudeDelta * region.longitudeDelta;
  return regionArea < 0.01; // Small region with many markers
};

export const filterMarkersByRegion = (markers, region, buffer = 0.01) => {
  if (!markers || markers.length === 0) return [];

  return markers.filter(marker => {
    const latDiff = Math.abs(marker.latitude - region.latitude);
    const lonDiff = Math.abs(marker.longitude - region.longitude);
    
    return latDiff <= region.latitudeDelta + buffer && 
           lonDiff <= region.longitudeDelta + buffer;
  });
};

export const optimizeMarkers = (markers, region, maxMarkers = 100) => {
  if (!markers || markers.length <= maxMarkers) return markers;

  // Sort by distance from center
  const centerLat = region.latitude;
  const centerLon = region.longitude;

  return markers
    .map(marker => ({
      ...marker,
      distance: calculateDistance(
        centerLat,
        centerLon,
        marker.latitude,
        marker.longitude
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxMarkers)
    .map(({ distance, ...marker }) => marker);
};
