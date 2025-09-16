import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';
import * as ImagePicker from 'expo-image-picker';
import supabase from '../config/supabaseClient';
import { validateForm, FormValidationRules, sanitizeInput } from '../utils/validation';

const CATEGORIES = [
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

const CreateEventScreen = () => {
  const navigation = useNavigation();
  const { createEvent, isAdmin } = useUser();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [coverUri, setCoverUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const validateEventForm = () => {
    const formData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      maxParticipants: maxParticipants.toString(),
      points: points.toString(),
    };

    const validation = validateForm(formData, FormValidationRules.event);
    
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      Toast.show({ type: 'error', text1: 'Validation Error', text2: firstError });
      return false;
    }

    // Additional validations
    if (!date.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter an event date' });
      return false;
    }
    if (!time.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter an event time' });
      return false;
    }
    if (!category) {
      Toast.show({ type: 'error', text1: 'Please select a category' });
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!isAdmin()) {
      Toast.show({ type: 'error', text1: 'Only admins can create events' });
      return;
    }
    if (!validateEventForm()) return;
    
    setLoading(true);
    
    try {
      let imageUrl = null;
      if (coverUri && supabase) {
        try {
          setUploading(true);
          // Upload binary to Supabase Storage bucket 'event post'
          const fileName = `events/${Date.now()}.jpg`;
          const arrayBuffer = await (await fetch(coverUri)).arrayBuffer();
          const { data, error } = await supabase.storage.from('event post').upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });
          if (error) throw error;
          // Public URL
          const { data: publicUrl } = supabase.storage.from('event post').getPublicUrl(fileName);
          imageUrl = publicUrl?.publicUrl || null;
        } catch (e) {
          console.log('Supabase upload failed:', e?.message);
        } finally {
          setUploading(false);
        }
      }
      const newEvent = {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        category: category,
        maxParticipants: parseInt(maxParticipants),
        points: parseInt(points),
        participants: 0,
        organizer: 'You',
        image: '🎉',
        imageUrl: imageUrl || null,
        status: 'upcoming',
      };

      // Award points for creating an event
      const result = await createEvent(newEvent);
      
      setLoading(false);
      
      if (result.success) {
        let message = 'Event created successfully!';
        if (result.points > 0) {
          message += ` (+${result.points} points)`;
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
              text1: message,
              text2: `${newEvent.title} is now live` 
            });
          }, 2000);
        } else {
          Toast.show({ 
            type: 'success', 
            text1: message,
            text2: `${newEvent.title} is now live` 
          });
        }
      } else {
        Toast.show({ 
          type: 'error', 
          text1: 'Failed to create event',
          text2: result.message || 'Please try again' 
        });
      }
      
      navigation.goBack();
    } catch (error) {
      setLoading(false);
      console.error('Error creating event:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Error creating event',
        text2: 'Please try again'
      });
    }
  };

  const pickCoverImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'info', text1: 'Permission denied', text2: 'Enable Photos permission to select an image.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Image picker failed' });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Event</Text>
      </View>
      
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {!isAdmin() && (
          <Text style={{ color: '#ef4444', marginBottom: 8, fontWeight: '600' }}>Only admins can create events.</Text>
        )}
        <Text style={styles.sectionTitle}>Event Details</Text>

        <TouchableOpacity style={styles.coverPicker} onPress={pickCoverImage} disabled={uploading}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="image" size={28} color="#9ca3af" />
              <Text style={{ color: '#6b7280', marginTop: 6 }}>{uploading ? 'Uploading…' : 'Add cover image'}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TextInput 
          style={styles.input} 
          placeholder="Event Title" 
          value={title} 
          onChangeText={(text) => setTitle(sanitizeInput(text, 'eventTitle'))}
          maxLength={100}
        />
        
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Event Description" 
          value={description} 
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        
        <Text style={styles.sectionTitle}>Date & Time</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Date (e.g. Jan 25, 2025)" 
          value={date} 
          onChangeText={setDate} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Time (e.g. 1:00 PM - 4:00 PM)" 
          value={time} 
          onChangeText={setTime} 
        />
        
        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Event Location" 
          value={location} 
          onChangeText={setLocation} 
        />
        
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryButton, category === cat && styles.categoryButtonActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.sectionTitle}>Event Settings</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Max Participants" 
          value={maxParticipants} 
          onChangeText={setMaxParticipants}
          keyboardType="numeric"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Points Reward" 
          value={points} 
          onChangeText={setPoints}
          keyboardType="numeric"
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleCreate} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Event...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  closeButton: { marginRight: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  form: {},
  coverPicker: { marginBottom: 14, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  coverImage: { width: '100%', height: 160, resizeMode: 'cover' },
  coverPlaceholder: { width: '100%', height: 160, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 20 },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  categoryButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4b5563',
  },
  categoryTextActive: {
    color: '#fff',
  },
  button: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CreateEventScreen; 