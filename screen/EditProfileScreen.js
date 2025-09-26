import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { getStorage } from 'firebase/storage';
import supabase, { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseClient';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const GENDER_OPTIONS = ['Male', 'Female','Other'];

// Avatar Dropdown Component
const AvatarDropdown = ({ selectedAvatar, setSelectedAvatar, profilePic, setProfilePic, avatar, setAvatar, pickImage, uploading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState([]);
  const dropdownHeight = useSharedValue(0);
  const dropdownOpacity = useSharedValue(0);

  const avatarConfigs = [
    { style: 'avataaars', seed: 'user1', name: 'Avatar 1' },
    { style: 'avataaars', seed: 'user2', name: 'Avatar 2' },
    { style: 'avataaars', seed: 'user3', name: 'Avatar 3' },
    { style: 'personas', seed: 'person1', name: 'Persona 1' },
    { style: 'personas', seed: 'person2', name: 'Persona 2' },
    { style: 'personas', seed: 'person3', name: 'Persona 3' },
    { style: 'micah', seed: 'profile1', name: 'Micah 1' },
    { style: 'micah', seed: 'profile2', name: 'Micah 2' },
    { style: 'adventurer', seed: 'hero1', name: 'Hero 1' },
    { style: 'adventurer', seed: 'hero2', name: 'Hero 2' },
    { style: 'adventurer-neutral', seed: 'neutral1', name: 'Neutral 1' },
    { style: 'pixel-art', seed: 'pixel1', name: 'Pixel 1' },
  ];

  useEffect(() => {
    const urls = avatarConfigs.map((config, index) => ({
      id: index,
      url: `https://api.dicebear.com/8.x/${config.style}/svg?seed=${config.seed}`,
      style: config.style,
      seed: config.seed,
      name: config.name
    }));
    setAvatarUrls(urls);
  }, []);

  const toggleDropdown = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    dropdownHeight.value = withSpring(newIsOpen ? 400 : 0, {
      damping: 15,
      stiffness: 200,
    });
    dropdownOpacity.value = withTiming(newIsOpen ? 1 : 0, {
      duration: 200,
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    height: dropdownHeight.value,
    opacity: dropdownOpacity.value,
  }));

  const renderCurrentAvatar = (size = 120) => {
    const avatarStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: '#3b82f6',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#e5e7eb',
      position: 'relative',
    };

    // Priority: Custom uploaded photo > Selected DiceBear > Initials
    if (profilePic) {
      return (
        <View style={avatarStyle}>
          <Image source={{ uri: profilePic }} style={styles.avatarImage} />
        </View>
      );
    } else if (selectedAvatar) {
      return (
        <View style={[avatarStyle, { backgroundColor: '#f3f4f6' }]}>
          <Image 
            source={{ uri: selectedAvatar.url }} 
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>
      );
    } else {
      return (
        <View style={avatarStyle}>
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{avatar}</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.avatarDropdownContainer}>
      <Text style={styles.sectionTitle}>Profile Avatar</Text>
      
      {/* Current Avatar Display */}
      <View style={styles.currentAvatarSection}>
        <TouchableOpacity 
          style={styles.avatarButton}
          onPress={toggleDropdown}
          disabled={uploading}
        >
          {renderCurrentAvatar()}
          <View style={styles.avatarOverlay}>
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="camera" size={20} color="#fff" />
            )}
          </View>
          <View style={styles.dropdownIndicator}>
            <Ionicons 
              name={isOpen ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#6b7280" 
            />
          </View>
        </TouchableOpacity>
        
        {/* Avatar initials input */}
        <View style={styles.avatarInputSection}>
          <Text style={styles.inputLabel}>Avatar Initials</Text>
          <TextInput 
            style={styles.avatarInput} 
            placeholder="Enter initials" 
            value={avatar} 
            onChangeText={setAvatar}
            maxLength={2}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      {/* Dropdown Content */}
      <Animated.View style={[styles.dropdownContent, animatedStyle]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Upload Options */}
          <View style={styles.uploadSection}>
            <Text style={styles.dropdownSectionTitle}>Upload Custom Photo</Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity 
                style={[styles.uploadButton, styles.primaryButton]}
                onPress={() => {
                  pickImage('profile', 'library');
                  setIsOpen(false);
                }}
                disabled={uploading}
              >
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.uploadButtonText}>Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.uploadButton, styles.secondaryButton]}
                onPress={() => {
                  pickImage('profile', 'camera');
                  setIsOpen(false);
                }}
                disabled={uploading}
              >
                <Ionicons name="camera-outline" size={18} color="#3b82f6" />
                <Text style={[styles.uploadButtonText, { color: '#3b82f6' }]}>Camera</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Avatar Options */}
          <View style={styles.avatarOptionsSection}>
            <Text style={styles.dropdownSectionTitle}>Choose Avatar Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarGrid}>
              <View style={styles.avatarGridInner}>
                {avatarUrls.map((avatarOption) => (
                  <TouchableOpacity
                    key={avatarOption.id}
                    onPress={() => {
                      setSelectedAvatar(avatarOption);
                      setProfilePic(null); // Clear uploaded photo when selecting DiceBear
                      setIsOpen(false);
                      Toast.show({
                        type: 'success',
                        text1: 'Avatar Selected',
                        text2: avatarOption.name,
                      });
                    }}
                    style={[
                      styles.avatarOption,
                      selectedAvatar?.id === avatarOption.id && styles.avatarOptionSelected
                    ]}
                    accessibilityLabel={`Select ${avatarOption.name}`}
                  >
                    <Image
                      source={{ uri: avatarOption.url }}
                      style={styles.avatarOptionImage}
                      resizeMode="cover"
                    />
                    <Text style={styles.avatarOptionName} numberOfLines={1}>
                      {avatarOption.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            {/* Clear Selection */}
            {(selectedAvatar || profilePic) && (
              <TouchableOpacity
                onPress={() => {
                  setSelectedAvatar(null);
                  setProfilePic(null);
                  Toast.show({
                    type: 'info',
                    text1: 'Avatar Cleared',
                    text2: 'Using initials avatar',
                  });
                }}
                style={styles.clearButton}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={styles.clearButtonText}>Clear Avatar</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { updateUserProfile, userData, user, getUserInitials, loading: userLoading } = useUser();
  const storage = getStorage();
  
  // Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('U');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  
  // Additional Info
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [website, setWebsite] = useState('');
  const [occupation, setOccupation] = useState('');
  
  // Media
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profilePic, setProfilePic] = useState(userData?.profilePic || null);
  const [coverPhoto, setCoverPhoto] = useState(userData?.coverPhoto || null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  
  // UI States
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  // Prefill form with the authenticated user's data
  useEffect(() => {
    try {
      if (!userData && !user) return;

      const displayName = userData?.name || user?.displayName || (userData?.email || user?.email || '').split('@')[0] || '';
      setName(displayName || '');
      setEmail(userData?.email || user?.email || '');

      const initials = userData?.avatarInitials || (typeof getUserInitials === 'function' ? getUserInitials() : (displayName ? displayName.substring(0, 2).toUpperCase() : 'U'));
      setAvatar(initials || '');

      setBio(userData?.bio || '');
      setPhone(userData?.phone || '');
      setAddress(userData?.address || '');
      setCity(userData?.city || '');
      setCountry(userData?.country || '');
      setGender(userData?.gender || '');
      setBirthDate(userData?.birthDate || '');
      setWebsite(userData?.website || '');
      setOccupation(userData?.occupation || '');
      setProfilePic(userData?.profilePic || null);
      setCoverPhoto(userData?.coverPhoto || null);

      // Set selected avatar if user has DiceBear data
      if (userData?.dicebearStyle && userData?.dicebearSeed) {
        setSelectedAvatar({
          id: 999, // Custom ID for existing avatar
          url: userData.profilePic,
          style: userData.dicebearStyle,
          seed: userData.dicebearSeed,
          name: 'Current Avatar'
        });
      }

    } catch (e) {
      console.error('Error loading user data:', e);
    }
  }, [userData, user]);
  
  const validateForm = () => {
    if (!name.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your name' });
      return false;
    }
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your email' });
      return false;
    }
    if (!selectedAvatar && !profilePic && !avatar.trim()) {
      Toast.show({ type: 'error', text1: 'Please select an avatar or enter initials' });
      return false;
    }
    if (avatar.length > 2) {
      Toast.show({ type: 'error', text1: 'Avatar initials should be 1-2 characters' });
      return false;
    }
    return true;
  };

  const pickImage = async (type, source = 'library') => {
    try {
      setUploading(true);
      const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      
      const pickerOptions = {
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      };
      const result = await launch(pickerOptions);

      if (result.canceled) {
        setUploading(false);
        return;
      }

      if (!result.assets || !result.assets.length) {
        setUploading(false);
        return;
      }

      const asset = result.assets[0];
      let uri = asset.uri;
      const maxSize = type === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

      // Resize and compress the image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: type === 'profile' ? 400 : 1024 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      uri = manipResult.uri;

      // Check file size
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && fileInfo.size > maxSize) {
        Toast.show({ type: 'error', text1: 'File too large', text2: `Image must be smaller than ${maxSize / 1024 / 1024}MB.` });
        setUploading(false);
        return;
      }

      const userId = user?.uid || userData?.uid;
      if (!userId) {
        Toast.show({ type: 'error', text1: 'Not signed in', text2: 'Please log in and try again.' });
        setUploading(false);
        return;
      }

      let url = null;
      if (supabase) {
        try {
          const ext = 'jpg';
          const bucket = type === 'profile' ? 'profile' : 'cover';
          const filePath = `${userId}/${Date.now()}.${ext}`;
          
          console.log(`Uploading to Supabase: bucket=${bucket}, path=${filePath}`);

          const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;
          const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              apikey: SUPABASE_ANON_KEY,
              'Content-Type': 'application/octet-stream',
              'x-upsert': 'true',
              'cache-control': '3600',
            },
          });

          if (uploadResult.status !== 200 && uploadResult.status !== 201) {
            console.error('Supabase upload error:', uploadResult.status, uploadResult.body);
            throw new Error(`Supabase upload failed: ${uploadResult.status} ${uploadResult.body || ''}`);
          }
          
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath);
          url = pub?.publicUrl || null;
          console.log('Supabase upload successful:', url);
          
        } catch (supabaseError) {
          console.error('Supabase upload failed:', supabaseError);
          throw supabaseError;
        }
      } else {
        throw new Error('Supabase client not initialized');
      }

      if (type === 'profile') {
        setProfilePic(url);
        setSelectedAvatar(null); // Clear DiceBear selection when uploading custom photo
      } else {
        setCoverPhoto(url);
      }
      
      Toast.show({ type: 'success', text1: `${type === 'profile' ? 'Profile photo' : 'Cover photo'} uploaded` });
    } catch (e) {
      console.error('Image picker error:', e);
      const msg = e?.code === 'storage/unauthorized'
        ? 'Permission denied. Check Firebase Storage rules.'
        : (e?.message || 'Upload failed');
      Toast.show({ type: 'error', text1: 'Upload failed', text2: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;
  
    setLoading(true);
    const profileData = {
      name,
      email,
      avatarInitials: avatar,
      bio,
      phone,
      address,
      city,
      country,
      gender,
      birthDate,
      website,
      occupation,
      profilePic: profilePic || (selectedAvatar ? selectedAvatar.url : null),
      dicebearStyle: selectedAvatar ? selectedAvatar.style : null,
      dicebearSeed: selectedAvatar ? selectedAvatar.seed : null,
      coverPhoto,
    };
  
    const result = await updateUserProfile(profileData);
    setLoading(false);
  
    if (result.success) {
      Toast.show({ 
        type: 'success', 
        text1: 'Profile updated successfully!',
        text2: 'Your changes have been saved' 
      });
      navigation.goBack();
    } else {
      Toast.show({ 
        type: 'error', 
        text1: 'Update Failed',
        text2: result.message || 'Please try again' 
      });
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#1f2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Customize your profile information</Text>
        </View>
      </View>
      
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {userLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        )}

        {/* Cover Photo Section */}
        <View style={styles.mediaSection}>
          <Text style={styles.sectionTitle}>Cover Photo</Text>
          <TouchableOpacity onPress={() => pickImage('cover', 'library')} style={styles.coverPhotoContainer}>
            {coverPhoto ? (
              <Image source={{uri: coverPhoto}} style={styles.coverPhoto} />
            ) : (
              <View style={styles.coverPhotoPlaceholder}>
                <Ionicons name="image-outline" size={40} color="#9ca3af" />
                <Text style={styles.placeholderText}>Add cover photo</Text>
              </View>
            )}
            <View style={styles.coverPhotoOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
            </View>
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={() => pickImage('cover', 'library')} style={[styles.actionButton, styles.primaryAction]}>
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickImage('cover', 'camera')} style={[styles.actionButton, styles.secondaryAction]}>
              <Ionicons name="camera-outline" size={18} color="#3b82f6" />
              <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Avatar Dropdown Section */}
        <AvatarDropdown
          selectedAvatar={selectedAvatar}
          setSelectedAvatar={setSelectedAvatar}
          profilePic={profilePic}
          setProfilePic={setProfilePic}
          avatar={avatar}
          setAvatar={setAvatar}
          pickImage={pickImage}
          uploading={uploading}
        />

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput}
              placeholder="Full Name" 
              value={name} 
              onChangeText={setName}
              maxLength={50}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Email Address" 
              value={email} 
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Phone Number" 
              value={phone} 
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={20}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="calendar-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Birth Date (YYYY-MM-DD)" 
              value={birthDate} 
              onChangeText={setBirthDate}
              maxLength={10}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="briefcase-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Occupation" 
              value={occupation} 
              onChangeText={setOccupation}
              maxLength={50}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Gender Selector */}
          <TouchableOpacity 
            style={styles.inputGroup} 
            onPress={() => setShowGenderPicker(!showGenderPicker)}
          >
            <Ionicons name="people-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <Text style={[styles.modernInput, styles.selectText, !gender && { color: '#9ca3af' }]}>
              {gender || 'Select Gender'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {showGenderPicker && (
            <View style={styles.pickerContainer}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.pickerOption, gender === option && styles.pickerOptionSelected]}
                  onPress={() => {
                    setGender(option);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, gender === option && styles.pickerOptionTextSelected]}>
                    {option}
                  </Text>
                  {gender === option && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Location Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.inputGroup}>
            <Ionicons name="home-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Street Address" 
              value={address} 
              onChangeText={setAddress}
              maxLength={100}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="City" 
              value={city} 
              onChangeText={setCity}
              maxLength={50}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Ionicons name="flag-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Country" 
              value={country} 
              onChangeText={setCountry}
              maxLength={50}
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Ionicons name="globe-outline" size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput 
              style={styles.modernInput} 
              placeholder="Website URL" 
              value={website} 
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
              maxLength={100}
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={[styles.inputGroup, styles.bioGroup]}>
            <Ionicons name="document-text-outline" size={20} color="#6b7280" style={[styles.inputIcon, styles.bioIcon]} />
            <TextInput 
              style={[styles.modernInput, styles.bioInput]} 
              placeholder="Tell us about yourself..." 
              value={bio} 
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Text style={styles.characterCount}>{bio.length}/200</Text>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={handleSave} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          )}
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
        
        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  mediaSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  
  // Avatar Dropdown Styles
  avatarDropdownContainer: {
    marginBottom: 30,
  },
  currentAvatarSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  avatarButton: {
    position: 'relative',
    marginRight: 20,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 6,
  },
  dropdownIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInputSection: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  avatarInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    textAlign: 'center',
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  uploadSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  uploadButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  avatarOptionsSection: {
    padding: 16,
  },
  avatarGrid: {
    paddingBottom: 16,
  },
  avatarGridInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarOption: {
    width: (width - 80) / 4,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#dbeafe',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
    elevation: 4,
  },
  avatarOptionImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 4,
  },
  avatarOptionName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  
  // Cover Photo Styles
  coverPhotoContainer: {
    position: 'relative',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '500',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    padding: 8,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 0.45,
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#3b82f6',
  },
  secondaryAction: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Form Input Styles
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bioGroup: {
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  bioIcon: {
    marginTop: 2,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  },
  selectText: {
    paddingVertical: 12,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: -8,
    marginBottom: 8,
  },
  
  // Gender Picker Styles
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  
  // Avatar Image Styles
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Upload Overlay
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  
  // Save Button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
    marginLeft: 8,
  },
});

  export default EditProfileScreen;