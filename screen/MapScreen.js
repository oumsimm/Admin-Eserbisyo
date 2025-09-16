import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Dimensions,
  Platform,
  Pressable,
  Modal,
  FlatList,
  Keyboard,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// React Native Maps for map functionality
import MapView, { Marker, PROVIDER_GOOGLE, Circle, Callout, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import ProfileHeader from '../components/ProfileHeader';
import Toast from 'react-native-toast-message';
import { useUser } from '../contexts/UserContext';
import eventService from '../services/eventService';
import incidentsService from '../services/incidentsService';
import evacuationService from '../services/evacuationService';
import { GOOGLE_MAPS_API_KEY } from '../config/firebaseConfig';
import supabase from '../config/supabaseClient';

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

// Events will be loaded from Firebase/EventService

const MURCIA_REGION = {
  latitude: 10.6050,
  longitude: 123.0417,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};
// Set initialRegion to MURCIA_REGION
// Add search functionality to the existing search input, perhaps using Google Places API if integrated.
// For street view, react-native-maps doesn't support it directly; note that.
// API key is already in firebaseConfig.

const MapScreen = () => {
  const { joinEvent, userData, user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [location, setLocation] = useState(null);
  const [mapRegion, setMapRegion] = useState(MURCIA_REGION);
  const [mapType, setMapType] = useState('standard');
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [centers, setCenters] = useState([]);
  const [todayNearby, setTodayNearby] = useState([]);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [eventModal, setEventModal] = useState({ visible: false, event: null });
  const [autocomplete, setAutocomplete] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isRouting, setIsRouting] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [geofenceRadius, setGeofenceRadius] = useState(5000); // 5km default
  // Google Places search state
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  const [selectedPlaceMarker, setSelectedPlaceMarker] = useState(null);
  const mapRef = useRef(null);
  const cameraRef = useRef(null);
  const locationSubscription = useRef(null);

  // Enhanced error handling for map
  const handleMapError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError('Failed to load map. Please check your internet connection.');
    
    // Show user-friendly error message
    Toast.show({
      type: 'error',
      text1: 'Map Error',
      text2: 'Unable to load map. Please try again later.',
      position: 'top',
    });
  }, []);

  // Load events from Firebase
  useEffect(() => {
    if (!user) return; // wait for auth
    // Prefer Supabase if configured
    if (supabase) {
      let mounted = true;
      const load = async () => {
        const { data } = await supabase.from('events').select('*').limit(200);
        if (!mounted) return;
        const eventsWithCoords = (data || []).map((event) => ({
          ...event,
          coordinates: event.coordinates || {
            latitude: 10.6718 + (Math.random() - 0.5) * 0.01,
            longitude: 122.9557 + (Math.random() - 0.5) * 0.01,
          }
        }));
        setEvents(eventsWithCoords);
        computeTodayNearby(eventsWithCoords);
      };
      load();
      const channel = supabase
        .channel('events-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, load)
        .subscribe();
      return () => { mounted = false; try { supabase.removeChannel(channel); } catch {} };
    }
    // Fallback to existing Firebase service
    const unsubscribe = eventService.subscribeEvents(100, (loadedEvents) => {
      const eventsWithCoords = loadedEvents.map((event) => ({
        ...event,
        coordinates: event.coordinates || {
          latitude: 10.6718 + (Math.random() - 0.5) * 0.01,
          longitude: 122.9557 + (Math.random() - 0.5) * 0.01,
        }
      }));
      setEvents(eventsWithCoords);
      computeTodayNearby(eventsWithCoords);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [user]);

  // Load incidents (known incidents) for preparedness visualization
  useEffect(() => {
    if (!user) return;
    if (supabase) {
      let mounted = true;
      const load = async () => {
        const { data } = await supabase.from('incidents').select('*').limit(1000);
        if (!mounted) return;
        const withCoords = (data || []).filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number');
        setIncidents(withCoords);
      };
      load();
      const channel = supabase
        .channel('incidents-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, load)
        .subscribe();
      return () => { mounted = false; try { supabase.removeChannel(channel); } catch {} };
    }
    const unsub = incidentsService.subscribeIncidents(1000, (items) => {
      const withCoords = items.filter((i) => typeof i.latitude === 'number' && typeof i.longitude === 'number');
      setIncidents(withCoords);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user]);

  // Load evacuation centers
  useEffect(() => {
    if (!user) return;
    if (supabase) {
      let mounted = true;
      const load = async () => {
        const { data } = await supabase.from('centers').select('*');
        if (!mounted) return;
        const withCoords = (data || []).filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number');
        setCenters(withCoords);
      };
      load();
      const channel = supabase
        .channel('centers-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'centers' }, load)
        .subscribe();
      return () => { mounted = false; try { supabase.removeChannel(channel); } catch {} };
    }
    const unsub = evacuationService.subscribeCenters((items) => {
      const withCoords = items.filter((c) => typeof c.latitude === 'number' && typeof c.longitude === 'number');
      setCenters(withCoords);
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [user]);

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    try {
      const today = new Date();
      const d = new Date(dateStr);
      return d.toDateString() === today.toDateString();
    } catch { return false; }
  };

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const computeTodayNearby = (list) => {
    if (!location) return setTodayNearby([]);
    const { latitude, longitude } = location.coords || {};
    const filtered = list
      .filter((e) => isToday(e.date))
      .map((e) => ({
        ...e,
        distanceKm: haversineKm(latitude, longitude, e.coordinates.latitude, e.coordinates.longitude),
      }))
      .filter((e) => e.distanceKm <= 25) // within 25km
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);
    setTodayNearby(filtered);
  };

  useEffect(() => { if (events.length && location) computeTodayNearby(events); }, [location]);

  // Responsive map height
  const screenHeight = Dimensions.get('window').height;
  const mapHeight = Math.max(200, Math.min(300, screenHeight * 0.3));

  useEffect(() => {
    requestLocationPermission();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      setIsLocationLoading(true);
      setMapError(null);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required', 
          'This app needs location permission to show your position on the map and find nearby events.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        setIsLocationLoading(false);
        return;
      }
      
      let currentLocation = await Location.getCurrentPositionAsync({ 
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000
      });
      
      setLocation(currentLocation);
      setMapRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      startLocationUpdates();
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Location permission error:', error);
      setIsLocationLoading(false);
      setMapError('Unable to get your location. Please check your GPS settings.');
      
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Unable to get your location. Please check your GPS settings.',
        position: 'top',
      });
    }
  };

  const startLocationUpdates = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        { 
          accuracy: Location.Accuracy.High, 
          timeInterval: 5000, 
          distanceInterval: 10 
        },
        (newLocation) => {
          setLocation(newLocation);
          if (showUserLocation) {
            setMapRegion({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      );
    } catch (error) {
      console.error('Location updates error:', error);
    }
  };

  const centerOnUserLocation = async () => {
    if (!location) {
      Toast.show({
        type: 'info',
        text1: 'Location Unavailable',
        text2: 'Please enable location services to use this feature.',
        position: 'top',
      });
      return;
    }
    
    try {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      mapRef.current?.animateToRegion(newRegion, 1000);
      setMapRegion(newRegion);
      
      Toast.show({
        type: 'success',
        text1: 'Location Centered',
        text2: 'Map centered on your current location.',
        position: 'top',
      });
    } catch (error) {
      console.error('Center location error:', error);
    }
  };

  // Enhanced navigation function
  const handleNavigateToEvent = async (event) => {
    if (!event.coordinates) {
      Toast.show({
        type: 'error',
        text1: 'Navigation Error',
        text2: 'Event location not available.',
        position: 'top',
      });
      return;
    }

    try {
      const { latitude, longitude } = event.coordinates;
      const url = Platform.OS === 'ios' 
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}`
        : `geo:${latitude},${longitude}?q=${encodeURIComponent(event.title)}`;
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        Toast.show({
          type: 'success',
          text1: 'Navigation Started',
          text2: `Opening directions to ${event.title}`,
          position: 'top',
        });
      } else {
        // Fallback to Google Maps web
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      Toast.show({
        type: 'error',
        text1: 'Navigation Failed',
        text2: 'Unable to open navigation app.',
        position: 'top',
      });
    }
  };

  const toggleMapType = () => setMapType(mapType === 'standard' ? 'satellite' : 'standard');
  const toggleUserLocation = () => setShowUserLocation(!showUserLocation);

  // Filtering logic
  const filteredEvents = events.filter(event => {
    const matchesCategory = selectedCategory === 'All' || event.category === selectedCategory;
    const matchesFilters = selectedFilters.length === 0 || selectedFilters.includes(event.category);
    const matchesSearch = event.title.toLowerCase().includes(searchText.toLowerCase()) || 
                         event.description.toLowerCase().includes(searchText.toLowerCase());
    return matchesCategory && matchesFilters && matchesSearch;
  });

  // Autocomplete logic
  useEffect(() => {
    if (searchText.length > 0) {
      const suggestions = events
        .filter(e => e.title.toLowerCase().includes(searchText.toLowerCase()))
        .map(e => e.title)
        .slice(0, 5); // Limit to 5 suggestions
      setAutocomplete(suggestions);
      setShowAutocomplete(true);
    } else {
      setAutocomplete([]);
      setShowAutocomplete(false);
    }
  }, [searchText]);

  // Google Places Autocomplete for Negros Occidental around Murcia
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!placeQuery || placeQuery.length < 2) {
        setPlaceResults([]);
        return;
      }
      try {
        setIsPlacesLoading(true);
        const locationBias = `${MURCIA_REGION.latitude},${MURCIA_REGION.longitude}`;
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(placeQuery)}&components=country:ph&location=${locationBias}&radius=50000&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK') setPlaceResults(data.predictions || []);
        else setPlaceResults([]);
      } catch (e) {
        setPlaceResults([]);
      } finally {
        setIsPlacesLoading(false);
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [placeQuery]);

  const selectPlace = async (prediction) => {
    try {
      setIsPlacesLoading(true);
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name,formatted_address&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(detailsUrl);
      const data = await res.json();
      const loc = data?.result?.geometry?.location;
      if (loc) {
        const newRegion = {
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setSelectedPlaceMarker({
          latitude: loc.lat,
          longitude: loc.lng,
          title: data?.result?.name || prediction.description,
          description: data?.result?.formatted_address || prediction.description,
        });
        mapRef.current?.animateToRegion(newRegion, 600);
        setMapRegion(newRegion);
        setPlaceQuery(prediction.description);
        setPlaceResults([]);
      }
    } catch (e) {
      // ignore
    } finally {
      setIsPlacesLoading(false);
    }
  };

  // Modal filter logic
  const toggleFilter = (cat) => {
    setSelectedFilters(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // Event card press
  const openEventModal = (event) => setEventModal({ visible: true, event });
  const closeEventModal = () => setEventModal({ visible: false, event: null });

  const handleJoinEvent = async (event) => {
    try {
      // Use the joinEvent function from UserContext to award points
      const result = await joinEvent(event);
      
      if (result.success) {
        let message = `Joined ${event.title}`;
        if (result.points > 0) {
          message += ` (+${result.points} points)`;
        }
        
        if (result.bonusMessage) {
          message += ` - ${result.bonusMessage}`;
        }
        
        if (result.leveledUp) {
          Toast.show({ 
            type: 'success', 
            text1: '🎉 Level Up!', 
            text2: `You reached Level ${result.newLevel}!` 
          });
          
          setTimeout(() => {
            Toast.show({ 
              type: 'success', 
              text1: message
            });
          }, 2000);
        } else {
          Toast.show({ 
            type: 'success', 
            text1: message
          });
        }
        
        closeEventModal();
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Failed to join event', 
          text2: result.message 
        });
      }
    } catch (error) {
      console.error('Error joining event:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Error', 
        text2: 'Failed to join event' 
      });
    }
  };

  // Enhanced marker press handler
  const handleMarkerPress = (event) => {
    setSelectedEvent(event);
    // Center map on selected event
    const newRegion = {
      latitude: event.coordinates.latitude,
      longitude: event.coordinates.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  // Render map with enhanced features
  const renderMap = () => {
    if (mapError) {
      return (
        <View style={[styles.mapContainer, { height: mapHeight, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="map-outline" size={48} color="#9ca3af" />
          <Text style={styles.errorText}>{mapError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.mapContainer, { height: mapHeight }]}> 
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapType={mapType === 'standard' ? 'standard' : 'satellite'}
          region={mapRegion}
          showsUserLocation={showUserLocation}
          showsMyLocationButton={false}
          onRegionChangeComplete={setMapRegion}
          onError={handleMapError}
          loadingEnabled={true}
          loadingIndicatorColor="#3b82f6"
          loadingBackgroundColor="#ffffff"
        >
          {/* Selected place marker */}
          {selectedPlaceMarker && (
            <Marker
              coordinate={{ latitude: selectedPlaceMarker.latitude, longitude: selectedPlaceMarker.longitude }}
              title={selectedPlaceMarker.title}
              description={selectedPlaceMarker.description}
              pinColor="#2563eb"
            />
          )}
          {/* Default Murcia Town Center marker */}
          <Marker
            coordinate={{ latitude: MURCIA_REGION.latitude, longitude: MURCIA_REGION.longitude }}
            title="Murcia Town Center"
            description="Murcia, Negros Occidental"
            pinColor="#3b82f6"
          />
          {/* User's geofence circle */}
          {location && (
            <Circle
              center={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              }}
              radius={geofenceRadius}
              fillColor="rgba(59, 130, 246, 0.1)"
              strokeColor="rgba(59, 130, 246, 0.3)"
              strokeWidth={2}
            />
          )}

          {/* Evacuation Centers as markers */}
          {centers.map((center, index) => (
            <Marker
              key={`center-${index}`}
              coordinate={{
                latitude: center.latitude,
                longitude: center.longitude
              }}
              title={center.name || 'Evacuation Center'}
              description={`Capacity: ${center.capacity || 'Unknown'}`}
              pinColor="green"
              onPress={() => handleMarkerPress(center)}
            />
          ))}

          {/* Incidents as red markers */}
          {incidents.map((incident, index) => (
            <Marker
              key={`incident-${index}`}
              coordinate={{
                latitude: incident.latitude,
                longitude: incident.longitude
              }}
              title="Safety Incident"
              description={`Intensity: ${incident.intensity || 1}`}
              pinColor="red"
              onPress={() => handleMarkerPress(incident)}
            />
          ))}

          {/* Events as blue markers */}
          {filteredEvents.map((event) => (
            <Marker
              key={`event-${event.id}`}
              coordinate={event.coordinates}
              title={event.title}
              description={event.description}
              pinColor="blue"
              onPress={() => handleMarkerPress(event)}
            />
          ))}

          {/* Route polyline if routing is active */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#3b82f6"
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlButton} onPress={toggleMapType}>
            <Ionicons name="layers-outline" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlButton} onPress={centerOnUserLocation}>
            <Ionicons name="compass-outline" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControlButton, showUserLocation && styles.mapControlButtonActive]} 
            onPress={toggleUserLocation}
          >
            <Ionicons name="navigate" size={22} color={showUserLocation ? "#fff" : "#374151"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.mapControlButton}
            onPress={async () => {
              try {
                const { latitude, longitude } = mapRegion || MURCIA_REGION;
                const url = `https://maps.google.com/?cbll=${latitude},${longitude}&layer=c`;
                const supported = await Linking.canOpenURL(url);
                if (supported) await Linking.openURL(url);
                else Toast.show({ type: 'info', text1: 'Street View not available' });
              } catch {}
            }}
          >
            <Ionicons name="walk-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Location Badge */}
        <View style={styles.locationBadge}>
          <Ionicons name="checkmark-circle" size={18} color="#10b981" />
          <Text style={styles.locationBadgeText}>Location active</Text>
        </View>

        {/* Geofence Radius Control */}
        <View style={styles.geofenceControl}>
          <Text style={styles.geofenceLabel}>Radius: {(geofenceRadius / 1000).toFixed(1)}km</Text>
          <View style={styles.radiusSlider}>
            <TouchableOpacity 
              style={styles.radiusButton} 
              onPress={() => setGeofenceRadius(Math.max(1000, geofenceRadius - 1000))}
            >
              <Ionicons name="remove" size={16} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radiusButton} 
              onPress={() => setGeofenceRadius(Math.min(10000, geofenceRadius + 1000))}
            >
              <Ionicons name="add" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ProfileHeader onProfilePress={() => {}} />
      
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
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {showAutocomplete && autocomplete.length > 0 && (
              <View style={styles.autocompleteDropdown}>
                {autocomplete.map((suggestion, idx) => (
                  <Pressable 
                    key={idx} 
                    style={styles.autocompleteItem} 
                    onPress={() => { 
                      setSearchText(suggestion); 
                      setShowAutocomplete(false); 
                      Keyboard.dismiss(); 
                    }}
                  >
                    <Text>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
        {/* Google Places search */}
        <View style={[styles.searchRow, { marginTop: 4 }]}>
          <View style={styles.searchContainer}>
            <Ionicons name="location" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search places in Negros Occidental..."
              value={placeQuery}
              onChangeText={setPlaceQuery}
              placeholderTextColor="#9ca3af"
              autoCorrect={false}
              autoCapitalize="none"
              accessibilityLabel="Places search"
            />
            {isPlacesLoading && (
              <View style={{ paddingHorizontal: 8 }}>
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            )}
            {!!placeResults.length && (
              <View style={styles.autocompleteDropdown}>
                {placeResults.map((p) => (
                  <Pressable key={p.place_id} style={styles.autocompleteItem} onPress={() => selectPlace(p)}>
                    <Text>{p.description}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        keyExtractor={item => item.id.toString()}
        style={styles.eventsContainer}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEventModal(item)}
            style={({ pressed }) => [styles.eventCard, pressed && styles.eventCardPressed]}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventImageContainer}>
                <Text style={styles.eventEmoji}>{item.image}</Text>
              </View>
              <View style={styles.eventTitleContainer}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
              </View>
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventDescription}>{item.description}</Text>
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{item.date}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{item.time}</Text>
                  </View>
                </View>
                <View style={styles.eventDetailRow}>
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{item.location}</Text>
                  </View>
                  <View style={styles.eventDetailItem}>
                    <Ionicons name="trophy-outline" size={16} color="#f59e0b" />
                    <Text style={styles.eventPointsText}>{item.points} points</Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={() => (
          <View style={styles.noEventsContainer}>
            <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
            <Text style={styles.noEventsText}>No events found</Text>
            <Text style={styles.noEventsSubtext}>Try adjusting your search or category filter</Text>
          </View>
        )}
      />

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" transparent onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.modalTitle}>Filter Events</Text>
            <ScrollView>
              {CATEGORIES.filter(c => c !== 'All').map(cat => (
                <TouchableOpacity key={cat} style={styles.filterOption} onPress={() => toggleFilter(cat)}>
                  <Ionicons 
                    name={selectedFilters.includes(cat) ? 'checkbox' : 'square-outline'} 
                    size={22} 
                    color="#06b6d4" 
                  />
                  <Text style={styles.filterOptionText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Event Details Modal */}
      <Modal visible={eventModal.visible} animationType="slide" transparent onRequestClose={closeEventModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.eventModal}>
            {eventModal.event && (
              <>
                <View style={styles.eventModalHeader}>
                  <Text style={styles.eventModalTitle}>{eventModal.event.title}</Text>
                  <TouchableOpacity onPress={closeEventModal}>
                    <Ionicons name="close" size={24} color="#374151" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.eventModalDescription}>{eventModal.event.description}</Text>
                <View style={styles.eventModalDetails}>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{eventModal.event.date}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="time-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{eventModal.event.time}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.eventDetailText}>{eventModal.event.location}</Text>
                  </View>
                  <View style={styles.eventDetailRow}>
                    <Ionicons name="trophy-outline" size={16} color="#f59e0b" />
                    <Text style={styles.eventPointsText}>{eventModal.event.points} points</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.joinButton} onPress={() => handleJoinEvent(eventModal.event)}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navigateButton} onPress={() => handleNavigateToEvent(eventModal.event)}>
                  <Text style={styles.navigateButtonText}>Navigate</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06b6d4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logoText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  appName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  tagline: { fontSize: 12, color: '#6b7280', flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  notificationButton: { position: 'relative', marginRight: 16 },
  notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#f97316', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  menuButton: { padding: 4 },
  mapContainer: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', width: '100%', overflow: 'hidden', position: 'relative' },
  mapControls: { position: 'absolute', right: 16, top: 16, zIndex: 2, backgroundColor: '#fff', borderRadius: 16, padding: 4, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  mapControlButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginVertical: 2, backgroundColor: '#f3f4f6' },
  mapControlButtonActive: { backgroundColor: '#1f2937' },
  markerContainer: { backgroundColor: '#fff', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#06b6d4', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  markerEmoji: { fontSize: 20 },
  locationBadge: { position: 'absolute', left: 16, top: 16, backgroundColor: '#fff', borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, elevation: 2 },
  locationBadgeText: { color: '#10b981', fontWeight: '500', marginLeft: 6 },
  filterSection: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, position: 'relative' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#374151' },
  filterButton: { marginLeft: 8, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 8 },
  autocompleteDropdown: { position: 'absolute', top: 44, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, elevation: 4, zIndex: 10 },
  autocompleteItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  categoryScroll: { backgroundColor: '#fff' },
  categoryContainer: { paddingHorizontal: 16 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db', marginRight: 8, backgroundColor: '#fff' },
  categoryButtonActive: { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  categoryText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  categoryTextActive: { color: '#fff' },
  eventsContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  eventCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, overflow: 'hidden' },
  eventCardPressed: { backgroundColor: '#f3f4f6' },
  eventHeader: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  eventImageContainer: { width: 60, height: 60, backgroundColor: '#f3f4f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  eventEmoji: { fontSize: 32 },
  eventTitleContainer: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 18, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: '#ec4899', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  categoryBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  eventContent: { padding: 16 },
  eventDescription: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 },
  eventDetails: { gap: 8 },
  eventDetailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  eventDetailItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  eventDetailText: { fontSize: 14, color: '#6b7280', marginLeft: 6 },
  eventPointsText: { fontSize: 14, color: '#f59e0b', marginLeft: 6, fontWeight: '600' },
  noEventsContainer: { alignItems: 'center', paddingVertical: 48 },
  noEventsText: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  noEventsSubtext: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' },
  filterModal: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 24, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  filterOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  filterOptionText: { fontSize: 16, color: '#374151', marginLeft: 12 },
  modalCloseButton: { marginTop: 16, backgroundColor: '#06b6d4', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  modalCloseButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  eventModal: { width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 24, maxHeight: '80%' },
  eventModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eventModalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', flex: 1, marginRight: 8 },
  eventModalDescription: { fontSize: 15, color: '#6b7280', marginBottom: 12 },
  eventModalDetails: { marginBottom: 16 },
  joinButton: { backgroundColor: '#10b981', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  joinButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  navigateButton: { backgroundColor: '#06b6d4', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  navigateButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  errorText: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 10 },
  retryButton: { backgroundColor: '#06b6d4', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, marginTop: 20 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  geofenceControl: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '90%',
    zIndex: 1,
  },
  geofenceLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  radiusSlider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
  },
  radiusButton: {
    padding: 5,
  },
});

export default MapScreen;