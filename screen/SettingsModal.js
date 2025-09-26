import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Share,
  Linking,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Switch } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Settings service for persistence
const settingsService = {
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem('@user_settings', JSON.stringify(settings));
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error };
    }
  },

  async loadSettings() {
    try {
      const settings = await AsyncStorage.getItem('@user_settings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error loading settings:', error);
      return null;
    }
  },

  async clearSettings() {
    try {
      await AsyncStorage.removeItem('@user_settings');
      return { success: true };
    } catch (error) {
      console.error('Error clearing settings:', error);
      return { success: false, error };
    }
  }
};

// Privacy service for managing user data
const privacyService = {
  async exportUserData(userData) {
    try {
      const exportData = {
        profile: {
          name: userData.name,
          email: userData.email,
          joinDate: userData.joinDate,
          points: userData.points,
          level: userData.level,
        },
        settings: await settingsService.loadSettings(),
        exportDate: new Date().toISOString(),
      };
      
      const dataString = JSON.stringify(exportData, null, 2);
      
      // Share the data
      await Share.share({
        message: dataString,
        title: 'My E-SERBISYO Data Export',
      });
      return { success: true };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, error };
    }
  },

  async deleteAccount() { // This would normally call your backend API
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true });
      }, 2000);
    });
  },
};

// Password service
const passwordService = {
  async changePassword(currentPassword, newPassword) {
    // This would normally validate with your backend
    return new Promise((resolve) => {
      setTimeout(() => {
        if (currentPassword === 'wrong') {
          resolve({ success: false, error: 'Current password is incorrect' });
        } else {
          resolve({ success: true });
        }
      }, 1500);
    });
  }
};

const SettingsModal = ({ 
  isVisible, 
  onClose, 
  userData, 
  onSettingsChange,
  onAccountDeleted 
}) => {
  // Settings state with default values
  const [settings, setSettings] = useState({
    // Privacy & Visibility
    profileVisibility: true,
    communitySpotlight: false,
    showEmailToOthers: false,
    showPhoneToOthers: false,
    
    
    // Communication
    whoCanMessageYou: 'everyone', // everyone, friends, none
    autoJoinCommunityChat: true,
    showOnlineStatus: true,
    
    // App Preferences
    darkMode: false,
    language: 'en',
    autoBackup: true,
    analytics: true,
    crashReporting: true,
  });

  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDataExportModal, setShowDataExportModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Load settings on mount
  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    const savedSettings = await settingsService.loadSettings();
    if (savedSettings) {
      setSettings(prev => ({ ...prev, ...savedSettings }));
    }
  };

  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Save to storage
    await settingsService.saveSettings(newSettings);
    
    // Handle special cases
    if (key === 'eventNotifications' && !value) {
      // Disable event notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    
    if (key === 'darkMode') {
      // Handle dark mode toggle (would integrate with your theme system)
      onSettingsChange?.(key, value);
    }
    
    // Show confirmation for important changes
    if (['profileVisibility', 'communitySpotlight'].includes(key)) {
      Alert.alert(
        'Setting Updated',
        `${key === 'profileVisibility' ? 'Profile visibility' : 'Community spotlight'} has been ${value ? 'enabled' : 'disabled'}.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await passwordService.changePassword(
        passwordData.currentPassword, 
        passwordData.newPassword
      );
      
      if (result.success) {
        Alert.alert('Success', 'Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Alert.alert('Error', result.error || 'Failed to change password.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    
    try {
      const result = await privacyService.exportUserData(userData);
      if (result.success) {
        Alert.alert('Success', 'Your data has been exported and shared!');
        setShowDataExportModal(false);
      } else {
        Alert.alert('Error', 'Failed to export data. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. All your data, achievements, and event history will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await privacyService.deleteAccount();
              if (result.success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account has been successfully deleted.',
                  [{ text: 'OK', onPress: () => onAccountDeleted?.() }]
                );
                setShowDeleteModal(false);
              } else {
                Alert.alert('Error', 'Failed to delete account. Please contact support.');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Choose how you\'d like to contact our support team:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email',
          onPress: () => Linking.openURL('mailto:support@eserbisyo.com?subject=Support Request')
        },
        {
          text: 'Phone',
          onPress: () => Linking.openURL('tel:+639686045729')
        }
      ]
    );
  };

  const MessagePrivacyOptions = [
    { label: 'Everyone', value: 'everyone', icon: 'people' },
    { label: 'Event Participants Only', value: 'participants', icon: 'calendar' },
    { label: 'Nobody', value: 'none', icon: 'lock-closed' }
  ];

  const LanguageOptions = [
    { label: 'English', value: 'en', flag: '🇺🇸' },
    { label: 'Filipino', value: 'fil', flag: '🇵🇭' },
    { label: 'Cebuano', value: 'ceb', flag: '🇵🇭' }
  ];

  return (
    <>
      <Modal
        isVisible={isVisible}
        onBackdropPress={onClose}
        onBackButtonPress={onClose}
        style={styles.bottomSheetModal}
        useNativeDriver
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={styles.bottomSheetContainer}>
          <View style={styles.settingsModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
              
              {/* Profile & Privacy Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Profile & Privacy</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="eye-outline" size={22} color="#3b82f6" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Public Profile</Text>
                    <Text style={styles.settingSubtext}>Allow others to view your profile</Text>
                  </View>
                  <Switch 
                    value={settings.profileVisibility} 
                    onValueChange={(v) => handleSettingChange('profileVisibility', v)}
                    trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                    thumbColor={settings.profileVisibility ? '#3b82f6' : '#9ca3af'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="star-outline" size={22} color="#f59e0b" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Community Spotlight</Text>
                    <Text style={styles.settingSubtext}>Feature your achievements publicly</Text>
                  </View>
                  <Switch 
                    value={settings.communitySpotlight} 
                    onValueChange={(v) => handleSettingChange('communitySpotlight', v)}
                    trackColor={{ false: '#e5e7eb', true: '#fde68a' }}
                    thumbColor={settings.communitySpotlight ? '#f59e0b' : '#9ca3af'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="mail-outline" size={22} color="#8b5cf6" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Show Email to Others</Text>
                    <Text style={styles.settingSubtext}>Display email in your public profile</Text>
                  </View>
                  <Switch 
                    value={settings.showEmailToOthers} 
                    onValueChange={(v) => handleSettingChange('showEmailToOthers', v)}
                    trackColor={{ false: '#e5e7eb', true: '#c4b5fd' }}
                    thumbColor={settings.showEmailToOthers ? '#8b5cf6' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* Notifications Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Notifications</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="calendar-outline" size={22} color="#10b981" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Event Notifications</Text>
                    <Text style={styles.settingSubtext}>Reminders for joined events</Text>
                  </View>
                  <Switch 
                    value={settings.eventNotifications} 
                    onValueChange={(v) => handleSettingChange('eventNotifications', v)}
                    trackColor={{ false: '#e5e7eb', true: '#86efac' }}
                    thumbColor={settings.eventNotifications ? '#10b981' : '#9ca3af'}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="trophy-outline" size={22} color="#f59e0b" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Achievement Notifications</Text>
                    <Text style={styles.settingSubtext}>New badges and milestones</Text>
                  </View>
                  <Switch 
                    value={settings.achievementNotifications} 
                    onValueChange={(v) => handleSettingChange('achievementNotifications', v)}
                    trackColor={{ false: '#e5e7eb', true: '#fde68a' }}
                    thumbColor={settings.achievementNotifications ? '#f59e0b' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* Communication Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Communication</Text>
                
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => {
                    Alert.alert(
                      'Who can message you?',
                      'Choose who can send you direct messages',
                      MessagePrivacyOptions.map(option => ({
                        text: option.label,
                        onPress: () => handleSettingChange('whoCanMessageYou', option.value)
                      })).concat([{ text: 'Cancel', style: 'cancel' }])
                    );
                  }}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="chatbubbles-outline" size={22} color="#8b5cf6" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Who can message you</Text>
                    <Text style={styles.settingSubtext}>
                      {MessagePrivacyOptions.find(opt => opt.value === settings.whoCanMessageYou)?.label || 'Everyone'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color="#06b6d4" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Message Notifications</Text>
                    <Text style={styles.settingSubtext}>Get notified of new messages</Text>
                  </View>
                  <Switch 
                    value={settings.messageNotifications} 
                    onValueChange={(v) => handleSettingChange('messageNotifications', v)}
                    trackColor={{ false: '#e5e7eb', true: '#7dd3fc' }}
                    thumbColor={settings.messageNotifications ? '#06b6d4' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* App Preferences Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>App Preferences</Text>
                
                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="moon-outline" size={22} color="#6b7280" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Dark Mode</Text>
                    <Text style={styles.settingSubtext}>Use dark theme</Text>
                  </View>
                  <Switch 
                    value={settings.darkMode} 
                    onValueChange={(v) => handleSettingChange('darkMode', v)}
                    trackColor={{ false: '#e5e7eb', true: '#9ca3af' }}
                    thumbColor={settings.darkMode ? '#6b7280' : '#9ca3af'}
                  />
                </View>

                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => {
                    Alert.alert(
                      'Select Language',
                      'Choose your preferred language',
                      LanguageOptions.map(lang => ({
                        text: `${lang.flag} ${lang.label}`,
                        onPress: () => handleSettingChange('language', lang.value)
                      })).concat([{ text: 'Cancel', style: 'cancel' }])
                    );
                  }}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="language-outline" size={22} color="#059669" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Language</Text>
                    <Text style={styles.settingSubtext}>
                      {LanguageOptions.find(lang => lang.value === settings.language)?.label || 'English'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <View style={styles.settingItem}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="cloud-upload-outline" size={22} color="#3b82f6" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Auto Backup</Text>
                    <Text style={styles.settingSubtext}>Backup data automatically</Text>
                  </View>
                  <Switch 
                    value={settings.autoBackup} 
                    onValueChange={(v) => handleSettingChange('autoBackup', v)}
                    trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                    thumbColor={settings.autoBackup ? '#3b82f6' : '#9ca3af'}
                  />
                </View>
              </View>

              {/* Security Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Security</Text>
                
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => setShowPasswordModal(true)}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="lock-closed-outline" size={22} color="#ef4444" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Change Password</Text>
                    <Text style={styles.settingSubtext}>Update your account password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              {/* Data & Privacy Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Data & Privacy</Text>
                
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => setShowDataExportModal(true)}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="download-outline" size={22} color="#06b6d4" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Export My Data</Text>
                    <Text style={styles.settingSubtext}>Download your account data</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={handleDeleteAccount}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingText, { color: '#ef4444' }]}>Delete Account</Text>
                    <Text style={styles.settingSubtext}>Permanently delete your account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              {/* Support Section */}
              <View style={styles.settingSection}>
                <Text style={styles.settingSectionTitle}>Support</Text>
                
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={handleContactSupport}
                >
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="headset-outline" size={22} color="#10b981" />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingText}>Contact Support</Text>
                    <Text style={styles.settingSubtext}>Get help with your account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isVisible={showPasswordModal}
        onBackdropPress={() => setShowPasswordModal(false)}
        style={styles.centeredModal}
        useNativeDriver
      >
        <View style={styles.passwordModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.passwordForm}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter current password"
                  secureTextEntry
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Ionicons name="key-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password (min 6 chars)"
                  secureTextEntry
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  secureTextEntry
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                />
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButtonCancel} 
              onPress={() => setShowPasswordModal(false)}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButtonConfirm} 
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonTextConfirm}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Data Export Modal */}
      <Modal
        isVisible={showDataExportModal}
        onBackdropPress={() => setShowDataExportModal(false)}
        style={styles.centeredModal}
        useNativeDriver
      >
        <View style={styles.exportModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Export My Data</Text>
            <TouchableOpacity onPress={() => setShowDataExportModal(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.exportInfo}>
            <Ionicons name="download-outline" size={48} color="#3b82f6" style={styles.exportIcon} />
            <Text style={styles.exportTitle}>Download Your Data</Text>
            <Text style={styles.exportDescription}>
              We'll prepare a file containing all your E-SERBISYO data including:
            </Text>
            
            <View style={styles.exportList}>
              <View style={styles.exportListItem}>
                <Ionicons name="person-outline" size={16} color="#10b981" />
                <Text style={styles.exportListText}>Profile information</Text>
              </View>
              <View style={styles.exportListItem}>
                <Ionicons name="calendar-outline" size={16} color="#10b981" />
                <Text style={styles.exportListText}>Event participation history</Text>
              </View>
              <View style={styles.exportListItem}>
                <Ionicons name="trophy-outline" size={16} color="#10b981" />
                <Text style={styles.exportListText}>Achievements and badges</Text>
              </View>
              <View style={styles.exportListItem}>
                <Ionicons name="settings-outline" size={16} color="#10b981" />
                <Text style={styles.exportListText}>App settings and preferences</Text>
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={styles.modalButtonCancel} 
              onPress={() => setShowDataExportModal(false)}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.modalButtonConfirm} 
              onPress={handleExportData}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalButtonTextConfirm}>Export Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomSheetModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  centeredModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheetContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingsModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 0,
  },
  settingSection: {
    paddingVertical: 8,
  },
  settingSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  
  // Password Modal Styles
  passwordModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '80%',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  passwordForm: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  
  // Export Modal Styles
  exportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '80%',
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  exportInfo: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  exportIcon: {
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  exportDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exportList: {
    width: '100%',
  },
  exportListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 8,
  },
  exportListText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 12,
    fontWeight: '500',
  },
  
  // Modal Buttons
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonConfirm: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

// Usage example - how to integrate into your ProfileScreen
export const useEnhancedSettings = () => {
  return {
    SettingsModal,
    settingsService,
    privacyService,
    passwordService,
  };
};
export default SettingsModal;