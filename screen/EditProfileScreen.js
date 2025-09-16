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
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import supabase, { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabaseClient';
import { useUser } from '../contexts/UserContext';

const { width } = Dimensions.get('window');

const AVATAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444'
];

const BORDER_STYLES = [
  { id: 'none', name: 'None', width: 0, color: 'transparent' },
  { id: 'thin', name: 'Thin', width: 2, color: '#ffffff' },
  { id: 'medium', name: 'Medium', width: 4, color: '#ffffff' },
  { id: 'thick', name: 'Thick', width: 6, color: '#ffffff' },
  { id: 'accent', name: 'Accent', width: 3, color: '#3b82f6' },
  { id: 'gold', name: 'Gold', width: 3, color: '#fbbf24' },
  { id: 'gradient', name: 'Rainbow', width: 4, color: 'linear-gradient' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { updateUserProfile, userData, user, getUserDisplayName, getUserInitials, loading: userLoading } = useUser();
  const storage = getStorage();
  
  // Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('U');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [selectedBorder, setSelectedBorder] = useState('none');
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
      setSelectedColor(userData?.avatarColor || '#3b82f6');
      setSelectedBorder(userData?.avatarBorder || 'none');
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
    } catch (e) {
      // noop
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
    if (!avatar.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter your avatar initials' });
      return false;
    }
    if (avatar.length > 2) {
      Toast.show({ type: 'error', text1: 'Avatar initials should be 1-2 characters' });
      return false;
    }
    return true;
  };

  const validateMimeType = (mime) => ['image/jpeg', 'image/png', 'image/gif'].includes(String(mime || '').toLowerCase());

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
      const uri = asset.uri;
      const maxSize = type === 'profile' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;

      const inferMimeFromUri = (u) => {
        const lower = String(u || '').toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.gif')) return 'image/gif';
        return 'image/jpeg';
      };
      const inferredType = asset.mimeType || inferMimeFromUri(uri);

      if (!validateMimeType(inferredType)) {
        Toast.show({ type: 'error', text1: 'Unsupported file type', text2: 'Use JPG, PNG, or GIF' });
        setUploading(false);
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const approxBytes = Math.floor(base64.length * 0.75);
      if (approxBytes > maxSize) {
        Toast.show({ type: 'error', text1: 'File too large' });
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
          const ext = inferredType === 'image/png' ? 'png' : inferredType === 'image/gif' ? 'gif' : 'jpg';
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
      if (type === 'profile') setProfilePic(url); else setCoverPhoto(url);
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

  const renderAvatarWithBorder = (size = 100) => {
    const borderStyle = BORDER_STYLES.find(b => b.id === selectedBorder) || BORDER_STYLES[0];
    
    const avatarStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: selectedColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: borderStyle.width,
      borderColor: borderStyle.id === 'gradient' ? 'transparent' : borderStyle.color,
    };

    if (borderStyle.id === 'gradient') {
      return (
        <View style={[avatarStyle, styles.gradientBorder]}>
          <View style={[avatarStyle, { borderWidth: 0, width: size - 8, height: size - 8 }]}>
            {profilePic ? (
              <Image source={{uri: profilePic}} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{avatar}</Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={avatarStyle}>
        {profilePic ? (
          <Image source={{uri: profilePic}} style={styles.avatarImage} />
        ) : (
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{avatar}</Text>
        )}
      </View>
    );
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    const updates = {
      name,
      email,
      bio,
      phone,
      address,
      city,
      country,
      gender,
      birthDate,
      website,
      occupation,
      avatarInitials: avatar,
      avatarColor: selectedColor,
      avatarBorder: selectedBorder,
      profilePic: profilePic,
      coverPhoto: coverPhoto
    };
    const result = await updateUserProfile(updates);
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
      {/* Modern Header */}
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

        {/* Profile Picture & Avatar Section */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionTitle}>Profile Picture & Avatar</Text>
          
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={() => pickImage('profile', 'library')} style={styles.profilePicContainer}>
              {renderAvatarWithBorder(120)}
              <View style={styles.profilePicOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.avatarCustomization}>
              <TextInput 
                style={styles.avatarInput} 
                placeholder="Avatar initials" 
                value={avatar} 
                onChangeText={setAvatar}
                maxLength={2}
                placeholderTextColor="#9ca3af"
              />
              
              {/* Color Selection */}
              <Text style={styles.customizationLabel}>Avatar Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScrollView}>
                {AVATAR_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption, 
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </ScrollView>
              
              {/* Border Selection */}
              <Text style={styles.customizationLabel}>Border Style</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.borderScrollView}>
                {BORDER_STYLES.map((border) => (
                  <TouchableOpacity
                    key={border.id}
                    style={[
                      styles.borderOption,
                      selectedBorder === border.id && styles.borderOptionSelected
                    ]}
                    onPress={() => setSelectedBorder(border.id)}
                  >
                    <View style={[
                      styles.borderPreview,
                      { 
                        backgroundColor: selectedColor,
                        borderWidth: border.width,
                        borderColor: border.id === 'gradient' ? 'transparent' : border.color,
                      },
                      border.id === 'gradient' && styles.gradientBorderPreview
                    ]}>
                      <Text style={styles.borderPreviewText}>A</Text>
                    </View>
                    <Text style={styles.borderOptionLabel}>{border.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={() => pickImage('profile', 'library')} style={[styles.actionButton, styles.primaryAction]}>
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pickImage('profile', 'camera')} style={[styles.actionButton, styles.secondaryAction]}>
              <Ionicons name="camera-outline" size={18} color="#3b82f6" />
              <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

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
  profileSection: {
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
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  profilePicContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profilePicOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    padding: 6,
  },
  avatarCustomization: {
    flex: 1,
  },
  avatarInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  customizationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  colorScrollView: {
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1f2937',
  },
  borderScrollView: {
    marginBottom: 16,
  },
  borderOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  borderOptionSelected: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  borderPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  gradientBorderPreview: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  borderPreviewText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  borderOptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#fff',
  },
  gradientBorder: {
    padding: 4,
    borderRadius: 64,
    background: 'linear-gradient(45deg, #ef4444, #f97316, #f59e0b, #10b981, #06b6d4, #3b82f6, #8b5cf6, #ec4899)',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 20,
    shadowColor: '#10b981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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