import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Asset } from 'expo-asset';
import { useNavigation } from '@react-navigation/native';
import ProfileHeader from '../components/ProfileHeader';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import eventService from '../services/eventService';
import incidentsService from '../services/incidentsService';
import evacuationService from '../services/evacuationService';

// Import utilities
import { 
  createClusters, 
  shouldCluster, 
  filterMarkersByRegion, 
  optimizeMarkers,
  getClusterColor,
  getClusterSize 
} from '../utils/mapClustering';
import { 
  requestLocationPermission, 
  getCurrentLocation, 
  watchLocation,
  stopWatchingLocation 
} from '../utils/locationPermissions';
// routing via external Google Maps; internal route planning removed
// Map styles not used in Leaflet variant

const { width, height } = Dimensions.get('window');

const CATEGORIES = [
  'All',
  'community service',
  'sports',
  'education',
  'environment',
  'arts',
  'social',
  'volunteer',
  'cleanup',
  'fundraiser',
];

const MURCIA_REGION = {
  latitude: 10.6050,
  longitude: 123.0417,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const MapScreenEnhanced = () => {
  const navigation = useNavigation();
  const { joinEvent, userData, user } = useUser();
  
  // Core state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(MURCIA_REGION);
  const [baseLayer, setBaseLayer] = useState('osm'); // 'osm' | 'satellite'
  
  // Data state
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [centers, setCenters] = useState([]);
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [clusters, setClusters] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [eventModal, setEventModal] = useState({ visible: false, event: null });
  const [selectedEvent, setSelectedEvent] = useState(null);
  // internal route rendering removed; using external Google Maps app
  const [mapError, setMapError] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('undetermined');
  const [pinpointGifUri, setPinpointGifUri] = useState(null);
  
  // Refs
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setMapError(null);

      // Load events
      try {
      const eventsResult = await eventService.getUpcomingEvents(100);
        if (eventsResult?.success) {
          setEvents(eventsResult.events || []);
        }
      } catch (e) {
        console.warn('Events load failed', e);
      }

      // Load incidents
      try {
        const items = await incidentsService.listIncidents(50);
        setIncidents(Array.isArray(items) ? items : []);
      } catch (e) {
        console.warn('Incidents load failed', e);
      }

      // Load evacuation centers
      try {
        const items = await evacuationService.listCenters();
        setCenters(Array.isArray(items) ? items : []);
      } catch (e) {
        console.warn('Evacuation centers load failed', e);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
      setMapError('Failed to load map data');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load map data'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Request location permission and get current location
  const initializeLocation = useCallback(async () => {
    try {
      setIsLocationLoading(true);
      
      const permission = await requestLocationPermission();
      setPermissionStatus(permission.status);
      
      if (permission.success) {
        const locationResult = await getCurrentLocation();
        if (locationResult.success) {
          setLocation(locationResult.location);
          setMapRegion({
            latitude: locationResult.location.latitude,
            longitude: locationResult.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    } catch (error) {
      console.error('Location initialization error:', error);
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  // Watch location changes
  const startLocationWatching = useCallback(async () => {
    if (permissionStatus !== 'granted') return;

    const watchResult = await watchLocation((result) => {
      if (result.success) {
        setLocation(result.location);
      }
    });

    if (watchResult.success) {
      locationSubscription.current = watchResult.subscription;
    }
  }, [permissionStatus]);

  // Stop location watching
  const stopLocationWatching = useCallback(() => {
    if (locationSubscription.current) {
      stopWatchingLocation(locationSubscription.current);
      locationSubscription.current = null;
    }
  }, []);

  // Filter markers based on category and search
  const filterMarkers = useCallback(() => {
    let filtered = [];

    // Add joined events only (include even without coordinates for card list)
    if (selectedCategory === 'All' || selectedCategory === 'events') {
      const joined = Array.isArray(userData?.joinedEvents) ? userData.joinedEvents : [];
      const joinedIds = new Set(joined.map(e => e?.eventId || e?.id).filter(Boolean));
      const eventMarkers = events
        .filter(event => {
          if (!joinedIds.has(event.id)) return false;
          const matchesSearch = !searchText || 
            (event.title || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (event.location || '').toLowerCase().includes(searchText.toLowerCase());
          return matchesSearch;
        })
        .map(event => ({
          id: event.id,
          latitude: event.coordinates?.latitude ?? 0,
          longitude: event.coordinates?.longitude ?? 0,
          title: event.title,
          type: 'event',
          data: event,
        }));
      filtered = [...filtered, ...eventMarkers];
    }

    // Add incidents
    if (selectedCategory === 'All' || selectedCategory === 'incidents') {
      const incidentMarkers = incidents
        .filter(incident => {
          const matchesSearch = !searchText || 
            incident.title.toLowerCase().includes(searchText.toLowerCase()) ||
            incident.location.toLowerCase().includes(searchText.toLowerCase());
          return matchesSearch;
        })
        .map(incident => ({
          id: incident.id,
          latitude: incident.coordinates?.latitude || 0,
          longitude: incident.coordinates?.longitude || 0,
          title: incident.title,
          type: 'incident',
          data: incident,
        }));
      filtered = [...filtered, ...incidentMarkers];
    }

    // Add evacuation centers
    if (selectedCategory === 'All' || selectedCategory === 'centers') {
      const centerMarkers = centers
        .filter(center => {
          const matchesSearch = !searchText || 
            center.name.toLowerCase().includes(searchText.toLowerCase()) ||
            center.address.toLowerCase().includes(searchText.toLowerCase());
          return matchesSearch;
        })
        .map(center => ({
          id: center.id,
          latitude: center.coordinates?.latitude || 0,
          longitude: center.coordinates?.longitude || 0,
          title: center.name,
          type: 'center',
          data: center,
        }));
      filtered = [...filtered, ...centerMarkers];
    }

    setFilteredMarkers(filtered);
  }, [events, incidents, centers, userData, selectedCategory, searchText]);

  // Create clusters for better performance
  const createMarkerClusters = useCallback(() => {
    if (filteredMarkers.length === 0) {
      setClusters([]);
      return;
    }

    // Exclude event markers from map clustering/rendering (cards still use events)
    const nonEventMarkers = filteredMarkers.filter(m => m.type !== 'event');
    if (nonEventMarkers.length === 0) {
      setClusters([]);
      return;
    }

    const regionMarkers = filterMarkersByRegion(nonEventMarkers, mapRegion);
    const optimizedMarkers = optimizeMarkers(regionMarkers, mapRegion, 100);

    if (shouldCluster(optimizedMarkers, mapRegion)) {
      const newClusters = createClusters(optimizedMarkers, mapRegion);
      setClusters(newClusters);
    } else {
      setClusters(optimizedMarkers.map(marker => ({ ...marker, isCluster: false, count: 1 })));
    }
  }, [filteredMarkers, mapRegion]);

  // Open Google Maps directions to event
  const openGoogleMapsDirections = useCallback(async (event) => {
    try {
      const dest = event?.coordinates;
      if (!dest) {
        Toast.show({ type: 'info', text1: 'No coordinates', text2: 'This event has no map location.' });
        return;
      }
      const lat = Number(dest.latitude);
      const lng = Number(dest.longitude);
      const label = encodeURIComponent(event?.title || 'Destination');
      const scheme = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
      const geo = `geo:0,0?q=${lat},${lng}(${label})`;
      const web = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
      if (await Linking.canOpenURL(scheme)) {
        await Linking.openURL(scheme);
        return;
      }
      if (await Linking.canOpenURL(geo)) {
        await Linking.openURL(geo);
        return;
      }
      await Linking.openURL(web);
    } catch (e) {
      console.error('Open maps failed:', e);
      Toast.show({ type: 'error', text1: 'Maps error', text2: 'Could not open Google Maps.' });
    }
  }, []);

  // Handle marker press
  const handleMarkerPress = useCallback((marker) => {
    if (marker.isCluster) {
      // Zoom to cluster
      const boundingBox = {
        latitude: marker.latitude,
        longitude: marker.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current?.animateToRegion(boundingBox, 1000);
    } else {
      setSelectedEvent(marker.data);
      setEventModal({ visible: true, event: marker.data });
    }
  }, []);

  // Handle region change
  const handleRegionChange = useCallback((region) => {
    setMapRegion(region);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
    initializeLocation();
  }, [loadData, initializeLocation]);

  // Start location watching when permission is granted
  useEffect(() => {
    if (permissionStatus === 'granted') {
      startLocationWatching();
    }
    return () => stopLocationWatching();
  }, [permissionStatus, startLocationWatching, stopLocationWatching]);

  // Filter markers when data or filters change
  useEffect(() => {
    filterMarkers();
  }, [filterMarkers]);

  // Create clusters when filtered markers change
  useEffect(() => {
    createMarkerClusters();
  }, [createMarkerClusters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLocationWatching();
    };
  }, [stopLocationWatching]);

  // Prepare data for Leaflet rendering
  const leafletData = useMemo(() => {
    return clusters.map((item) => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      isCluster: !!item.isCluster,
      count: item.count || 1,
      title: item.title || (item.data?.title ?? ''),
      type: item.type || (item.data?.type ?? 'event'),
      color: getClusterColor(item.type || 'event', item.count || 1),
      raw: item.data || null,
    }));
  }, [clusters]);

  // Build joined events list for cards only
  const joinedEventCards = useMemo(() => {
    const joined = Array.isArray(userData?.joinedEvents) ? userData.joinedEvents : [];
    const joinedIds = new Set(joined.map(e => String(e?.eventId || e?.id)).filter(Boolean));
    const list = events.filter(ev => joinedIds.has(String(ev.id)));
    const filtered = list.filter(ev => {
      if (!searchText) return true;
      const t = (ev.title || '').toLowerCase();
      const loc = (ev.location || '').toLowerCase();
      const q = searchText.toLowerCase();
      return t.includes(q) || loc.includes(q);
    });
    return filtered.map(ev => ({ id: ev.id, data: ev }));
  }, [userData, events, searchText]);

  // Generate Leaflet HTML
  const generateLeafletHTML = () => {
    const zoom = 13;
    const tiles = baseLayer === 'satellite'
      ? `L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
         L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.8 }).addTo(map);`
      : `L.tileLayer('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);`;

    const markersJs = leafletData
      .filter(m => m.type !== 'event')
      .map(m => {
      if (m.isCluster) {
        return `
          (function(){
            const html = '<div style="width:40px;height:40px;border-radius:20px;background:${m.color};display:flex;align-items:center;justify-content:center;border:2px solid white;color:white;font-weight:bold;font-size:12px;">${m.count}</div>';
            const icon = L.divIcon({ html, className: 'cluster-icon', iconSize: [40, 40] });
            const marker = L.marker([${m.latitude}, ${m.longitude}], { icon }).addTo(map);
            marker.on('click', function(){ map.setView([${m.latitude}, ${m.longitude}], Math.min(map.getZoom() + 2, 18)); });
          })();
        `;
      } else {
        const safeTitle = (m.title || '').replace(/'/g, "\\'");
        return `
          (function(){
            const html = '<div style="width:28px;height:28px;border-radius:14px;background:${m.color};display:flex;align-items:center;justify-content:center;border:2px solid white;color:white;font-size:12px;">•</div>';
            const icon = L.divIcon({ html, className: 'event-icon', iconSize: [28, 28] });
            const marker = L.marker([${m.latitude}, ${m.longitude}], { icon }).addTo(map);
            marker.bindPopup('<div style="min-width:160px"><strong>${safeTitle}</strong><br/>${m.type.charAt(0).toUpperCase()+m.type.slice(1)}</div>');
            marker.on('click', function(){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker', id: '${m.id}' })); } });
          })();
        `;
      }
    }).join('\n');

    const userJs = location ? `
      (function(){
        var icon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          shadowSize: [41, 41]
        });
        L.marker([${location?.latitude}, ${location?.longitude}], { icon: icon, zIndexOffset: 1000 }).addTo(map);
      })();
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          .select-hint { position: absolute; left: 8px; right: 8px; top: 8px; z-index: 9999; font-family: system-ui, -apple-system, Arial; }
          .hint-box { background: rgba(0,0,0,0.65); color: #fff; padding: 8px 12px; border-radius: 8px; display: inline-block; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([${mapRegion.latitude}, ${mapRegion.longitude}], ${zoom});
          window.__map = map;
                ${tiles}
                ${markersJs}
                ${userJs}
        </script>
      </body>
      </html>
    `;
  };

  // Render map with Leaflet in WebView
  const renderMap = () => (
    <WebView
      ref={mapRef}
      style={styles.map}
      originWhitelist={["*"]}
      source={{ html: generateLeafletHTML() }}
      javaScriptEnabled
      domStorageEnabled
      startInLoadingState
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data || '{}');
          if (msg.type === 'marker') {
            const found = filteredMarkers.find(m => String(m.id) === String(msg.id));
            if (found) {
              setSelectedEvent(found.data);
              setEventModal({ visible: true, event: found.data });
            }
          }
        } catch {}
      }}
      renderLoading={() => (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      )}
    />
  );

  // Render category filter
  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      {CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryButton,
            selectedCategory === category && styles.categoryButtonActive
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.categoryButtonTextActive
          ]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Map control helpers for Leaflet (WebView)
  const centerOnLocation = useCallback((coords) => {
    if (!coords || !mapRef.current) return;
    const script = `if (window.__map) { window.__map.setView([${coords.latitude}, ${coords.longitude}], 15); }`;
    mapRef.current.injectJavaScript(script);
  }, []);

  const centerOnCoords = useCallback((coords, zoom = 15) => {
    if (!coords || !mapRef.current) return;
    const script = `if (window.__map) { window.__map.setView([${coords.latitude}, ${coords.longitude}], ${zoom}); }`;
    mapRef.current.injectJavaScript(script);
  }, []);

  // Simple Haversine distance in meters
  const haversineDistanceMeters = useCallback((lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Render map controls
  const renderMapControls = () => (
    <View style={styles.mapControls}>
      {/* Location button */}
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => {
          if (location) {
            centerOnLocation(location);
          } else {
            initializeLocation();
          }
        }}
        accessibilityLabel="Center on my location"
      >
        <Ionicons 
          name={isLocationLoading ? "refresh" : "locate"} 
          size={20} 
          color="#ffffff" 
        />
      </TouchableOpacity>

      {/* Base layer toggle: OSM <-> Satellite */}
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => {
          setBaseLayer((prev) => (prev === 'osm' ? 'satellite' : 'osm'));
        }}
        accessibilityLabel="Toggle base layer between OpenStreetMap and Satellite"
      >
        <Ionicons name="layers" size={20} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  // Render event modal
  const renderEventModal = () => (
    <Modal
      visible={eventModal.visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEventModal({ visible: false, event: null })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{eventModal.event?.title}</Text>
            <TouchableOpacity
              onPress={() => setEventModal({ visible: false, event: null })}
              accessibilityLabel="Close event details"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {eventModal.event?.thumbnailUrl ? (
              <Image
                source={{ uri: eventModal.event.thumbnailUrl }}
                style={styles.modalImage}
                contentFit="cover"
                accessible
                accessibilityLabel="Event image"
              />
            ) : null}
            <Text style={styles.modalDescription}>
              {eventModal.event?.description}
            </Text>
            
            <View style={styles.modalInfo}>
              <View style={styles.modalInfoRow}>
                <Ionicons name="calendar" size={16} color="#6b7280" />
                <Text style={styles.modalInfoText}>
                  {eventModal.event?.date} • {eventModal.event?.time}
                </Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Ionicons name="location" size={16} color="#6b7280" />
                <Text style={styles.modalInfoText}>
                  {eventModal.event?.location}
                </Text>
              </View>
              
              <View style={styles.modalInfoRow}>
                <Ionicons name="people" size={16} color="#6b7280" />
                <Text style={styles.modalInfoText}>
                  {eventModal.event?.participants}/{eventModal.event?.maxParticipants} participants
                </Text>
              </View>

              {/* Route meta removed in external directions flow */}
            </View>
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setEventModal({ visible: false, event: null });
                navigation.navigate('EventDetails', { event: eventModal.event });
              }}
              accessibilityLabel="View full event details"
            >
              <Text style={styles.modalButtonText}>View Details</Text>
            </TouchableOpacity>
            
            
            {location && (
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={() => openGoogleMapsDirections(eventModal.event)}
                accessibilityLabel="Get directions to event"
              >
                    <Ionicons name="navigate" size={16} color="#ffffff" />
                    <Text style={styles.modalButtonText}>Get Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ProfileHeader onProfilePress={() => navigation.navigate('Profile')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileHeader onProfilePress={() => navigation.navigate('Profile')} />
      
      {/* Enhanced Map Section */}
      {renderMap()}

      {/* Search and Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
        
        {/* Category Filter */}
        {renderCategoryFilter()}
      </View>

      {/* Events List - Modern Card Layout */}
      <FlatList
        data={joinedEventCards}
        keyExtractor={item => item.id.toString()}
        style={styles.eventsContainer}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}> 
            <Ionicons name="calendar" size={24} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No events found.</Text>
            </View>
        )}
        renderItem={({ item }) => {
          const e = item.data;
          const hasThumb = !!e?.thumbnailUrl || !!e?.imageUrl;
          const imageUrl = e?.thumbnailUrl || e?.imageUrl;
          const distanceMeters = (location && e?.coordinates)
            ? Math.round(haversineDistanceMeters(location.latitude, location.longitude, e.coordinates.latitude, e.coordinates.longitude))
            : null;
          const distanceStr = distanceMeters !== null
            ? (distanceMeters >= 1000 ? `${(distanceMeters/1000).toFixed(1)} km` : `${distanceMeters} m`)
            : null;
          return (
            <View style={styles.eventCardModern}> 
              {hasThumb ? (
                <View style={styles.eventImageWrap}>
                  <Image source={{ uri: imageUrl }} style={styles.eventImage} contentFit="cover" />
                  <LinearGradient colors={[ 'transparent', 'rgba(0,0,0,0.6)' ]} style={styles.eventImageGradient} />
                  <View style={styles.eventImageTextRow}>
                    <Text style={styles.eventImageTitle} numberOfLines={1}>{e.title}</Text>
                    {distanceStr ? <Text style={styles.eventImageDistance}>{distanceStr}</Text> : null}
                  </View>
                </View>
              ) : null}

              {!hasThumb ? (
                <View style={styles.eventHeaderRow}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventDate}>{new Date(e.date).toLocaleDateString()}</Text>
                </View>
              ) : (
                <View style={styles.eventHeaderRowCompact}>
                  <Text style={styles.eventDateCompact}>{new Date(e.date).toLocaleDateString()}</Text>
                  <View style={styles.eventCategoryPill}><Text style={styles.eventCategoryPillText}>{e.category}</Text></View>
                </View>
              )}

              <Text style={styles.eventDescription} numberOfLines={3}>{e.description}</Text>

              <View style={styles.eventMetaRow}>
              <View style={styles.eventLocation}>
                <Ionicons name="location" size={16} color="#6b7280" />
                  <Text style={styles.eventLocationText}>{e.location}</Text>
              </View>
                <View style={styles.eventPeople}>
                  <Ionicons name="people" size={16} color="#6b7280" />
                  <Text style={styles.eventPeopleText}>{e.participants}/{e.maxParticipants}</Text>
              </View>
            </View>

              <View style={styles.eventActionsRow}>
                <TouchableOpacity
                  style={styles.eventActionButton}
                  onPress={() => {
                    setSelectedEvent(e);
                    setEventModal({ visible: true, event: e });
                  }}
                  accessibilityLabel={`View details for ${e.title}`}
                >
                  <Text style={styles.eventActionText}>Details</Text>
          </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.eventActionButton, styles.eventActionPrimary]}
                  onPress={() => {
                    if (e?.coordinates) {
                      openGoogleMapsDirections(e);
                    } else {
                      Toast.show({ type: 'info', text1: 'No coordinates', text2: 'This event has no map location.' });
                    }
                  }}
                  accessibilityLabel={`Get directions to ${e.title}`}
                >
                  <Ionicons name="navigate" size={16} color="#ffffff" />
                  <Text style={styles.eventActionPrimaryText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Map Controls */}
      {renderMapControls()}

      {/* Event modal */}
      {renderEventModal()}

      {/* Error message */}
      {mapError && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={20} color="#ef4444" />
          <Text style={styles.errorText}>{mapError}</Text>
          <TouchableOpacity onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  searchIcon: {
    marginRight: 8,
  },
  filterButton: {
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginRight: 16,
  },
  filterSection: {
    backgroundColor: '#f8fafc',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilter: {
    marginVertical: 8,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 10,
    flexDirection: 'column',
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerCallout: {
    padding: 8,
    minWidth: 120,
  },
  markerCalloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  markerCalloutSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  clusterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clusterCallout: {
    padding: 8,
    minWidth: 100,
  },
  clusterCalloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  clusterCalloutSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalInfo: {
    gap: 12,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    color: '#ef4444',
    fontSize: 14,
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  eventsContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateText: {
    color: '#9ca3af',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventCardModern: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  eventImageWrap: {
    width: '100%',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  eventImageTextRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventImageTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  eventImageDistance: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  eventHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventHeaderRowCompact: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  eventDateCompact: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventDescription: {
    fontSize: 14,
    color: '#374151',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMetaRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventLocationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  eventPeople: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventPeopleText: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventCategory: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventCategoryPill: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventCategoryPillText: {
    fontSize: 12,
    color: '#374151',
  },
  eventActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  eventActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  eventActionPrimary: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  eventActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  eventActionPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
  eventCategoryText: {
    fontSize: 12,
    color: '#374151',
  },
});

export default MapScreenEnhanced;