import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseQRData as simpleParseQR, validateQRData as simpleValidateQR } from '../utils/simpleQrUtils';

const { width } = Dimensions.get('window');

const SimpleQRScanner = ({ 
  visible, 
  onClose, 
  onScanSuccess, 
  onScanError,
  title = "Scan QR Code",
  subtitle = "Enter QR code data manually"
}) => {
  const [qrText, setQrText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleManualInput = async () => {
    if (!qrText.trim()) {
      Alert.alert('Empty Input', 'Please enter QR code data');
      return;
    }

    setIsProcessing(true);

    try {
      // Try to parse the QR code data
      const parsedData = simpleParseQR(qrText.trim());
      
      if (!parsedData) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not from E-SERBISYO or is corrupted.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return;
      }

      // Validate the QR code data
      const isValid = simpleValidateQR(parsedData);

      if (!isValid) {
        Alert.alert(
          'Invalid Data',
          'The QR code contains invalid or incomplete data.',
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return;
      }

      // Handle different QR code types
      handleQRCodeType(parsedData);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      if (onScanError) {
        onScanError(error);
      } else {
        Alert.alert(
          'Processing Error',
          'Failed to process the QR code data. Please check the format and try again.',
          [{ text: 'OK' }]
        );
      }
      setIsProcessing(false);
    }
  };

  const handleQRCodeType = (parsedData) => {
    setIsProcessing(false);
    
    switch (parsedData.type) {
      case 'USER_PROFILE':
      case 'DYNAMIC_USER':
      case 'SIMPLE_USER':
        handleUserProfile(parsedData);
        break;
      
      case 'EVENT_CHECKIN':
        handleEventCheckIn(parsedData);
        break;
        
      case 'EVENT_INFO':
        handleEventInfo(parsedData);
        break;
        
      default:
        Alert.alert(
          'Unknown QR Code Type',
          `QR code type "${parsedData.type}" is not supported.`,
          [{ text: 'OK' }]
        );
    }
  };

  const handleUserProfile = (data) => {
    const userName = data.name || `User ${data.userId}`;
    Alert.alert(
      'User Profile Found',
      `Found profile for: ${userName}\n\nWould you like to view their profile?`,
      [
        { text: 'Cancel' },
        { 
          text: 'View Profile', 
          onPress: () => {
            if (onScanSuccess) {
              onScanSuccess({
                type: 'user_profile',
                data: data,
                action: 'view_profile'
              });
            }
            setQrText('');
            onClose();
          }
        }
      ]
    );
  };

  const handleEventCheckIn = (data) => {
    Alert.alert(
      'Event Check-in',
      `Event: ${data.eventTitle}\nUser: ${data.userName}\n\nConfirm check-in?`,
      [
        { text: 'Cancel' },
        { 
          text: 'Check In', 
          onPress: () => {
            if (onScanSuccess) {
              onScanSuccess({
                type: 'event_checkin',
                data: data,
                action: 'checkin'
              });
            }
            setQrText('');
            onClose();
          }
        }
      ]
    );
  };

  const handleEventInfo = (data) => {
    Alert.alert(
      'Event Information',
      `Event: ${data.eventTitle}\nDate: ${data.eventDate}\nLocation: ${data.location}\n\nWould you like to view event details?`,
      [
        { text: 'Cancel' },
        { 
          text: 'View Event', 
          onPress: () => {
            if (onScanSuccess) {
              onScanSuccess({
                type: 'event_info',
                data: data,
                action: 'view_event'
              });
            }
            setQrText('');
            onClose();
          }
        }
      ]
    );
  };

  const handleClose = () => {
    setQrText('');
    setIsProcessing(false);
    onClose();
  };

  const handlePasteFromClipboard = async () => {
    try {
      // For now, just show info about pasting
      Alert.alert(
        'Paste QR Data',
        'You can paste QR code data directly into the text field above.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error accessing clipboard:', error);
    }
  };

  // Sample QR codes removed - use real QR codes from events and users

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Input Section */}
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>QR Code Data</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholder="Paste or type QR code data here..."
                placeholderTextColor="#9ca3af"
                value={qrText}
                onChangeText={setQrText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.pasteButton} 
                onPress={handlePasteFromClipboard}
              >
                <Ionicons name="clipboard-outline" size={20} color="#3b82f6" />
                <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.scanButton, isProcessing && styles.scanButtonDisabled]} 
                onPress={handleManualInput}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Text style={styles.scanButtonText}>Processing...</Text>
                ) : (
                  <>
                    <Ionicons name="scan" size={20} color="#fff" />
                    <Text style={styles.scanButtonText}>Process QR Code</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>📱 How to use Manual QR Scanner</Text>
            <View style={styles.helpContent}>
              <View style={styles.helpItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.helpText}>
                  Copy QR code data from another app or device
                </Text>
              </View>
              <View style={styles.helpItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.helpText}>
                  Paste it into the text field above
                </Text>
              </View>
              <View style={styles.helpItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.helpText}>
                  Tap "Process QR Code" to scan the data
                </Text>
              </View>
            </View>
          </View>

          {/* Sample QR codes section removed */}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Camera Not Available</Text>
                <Text style={styles.infoText}>
                  This manual scanner is used when camera access is unavailable or fails. 
                  You can still scan QR codes by manually entering the data.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    textAlignVertical: 'top',
    minHeight: 100,
    backgroundColor: '#f9fafb',
  },
  buttonContainer: {
    gap: 12,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    gap: 8,
  },
  pasteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    gap: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  helpContent: {
    gap: 8,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  samplesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  samplesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  sampleCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  sampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sampleButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  sampleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  infoSection: {
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default SimpleQRScanner;
