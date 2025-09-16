import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { parseQRData, validateQRData, isDynamicQRValid } from '../utils/qrCodeUtils';
import { parseQRData as simpleParseQR, validateQRData as simpleValidateQR } from '../utils/simpleQrUtils';

const { width, height } = Dimensions.get('window');

const QRCodeScanner = ({ 
  visible, 
  onClose, 
  onScanSuccess, 
  onScanError,
  title = "Scan QR Code",
  subtitle = "Position the QR code within the frame"
}) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState('off');

  useEffect(() => {
    getCameraPermissions();
  }, []);

  useEffect(() => {
    if (visible) {
      setScanned(false);
    }
  }, [visible]);

  const getCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    
    console.log('QR Code scanned:', { type, data: data.substring(0, 100) + '...' });
    setScanned(true);
    
    try {
      // Try to parse the QR code data with fallback
      let parsedData;
      try {
        console.log('Attempting primary parser...');
        parsedData = parseQRData(data);
        console.log('Primary parser result:', parsedData);
      } catch (err) {
        console.warn('Primary parser failed, trying simple parser:', err);
        try {
          parsedData = simpleParseQR(data);
          console.log('Simple parser result:', parsedData);
        } catch (simpleErr) {
          console.error('Both parsers failed:', simpleErr);
          throw new Error('Failed to parse QR code data');
        }
      }
      
      if (!parsedData) {
        Alert.alert(
          'Invalid QR Code',
          'This QR code is not from E-SERBISYO or is corrupted.',
          [
            { text: 'Scan Again', onPress: () => setScanned(false) },
            { text: 'Close', onPress: onClose }
          ]
        );
        return;
      }

      // Validate the QR code data with fallback
      let isValid;
      try {
        isValid = validateQRData(parsedData);
      } catch (err) {
        console.warn('Primary validator failed, trying simple validator:', err);
        isValid = simpleValidateQR(parsedData);
      }

      if (!isValid) {
        Alert.alert(
          'Invalid Data',
          'The QR code contains invalid or incomplete data.',
          [
            { text: 'Scan Again', onPress: () => setScanned(false) },
            { text: 'Close', onPress: onClose }
          ]
        );
        return;
      }

      // Check if dynamic QR code is still valid (with error handling)
      try {
        if (!isDynamicQRValid(parsedData)) {
          Alert.alert(
            'Expired QR Code',
            'This QR code has expired. Please ask for a new one.',
            [
              { text: 'Scan Again', onPress: () => setScanned(false) },
              { text: 'Close', onPress: onClose }
            ]
          );
          return;
        }
      } catch (err) {
        // If validation fails, continue (non-dynamic QR codes don't expire)
        console.warn('Dynamic QR validation failed, continuing:', err);
      }

      // Handle different QR code types
      handleQRCodeType(parsedData);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanned(false); // Allow rescanning immediately
      if (onScanError) {
        onScanError(error);
      } else {
        Alert.alert(
          'Scan Error',
          'Failed to process the QR code. Please try again.',
          [
            { text: 'Scan Again', onPress: () => setScanned(false) },
            { text: 'Close', onPress: onClose }
          ]
        );
      }
    }
  };

  const handleQRCodeType = (parsedData) => {
    console.log('Processing QR Code Type:', parsedData.type, parsedData);
    
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
        console.warn('Unknown QR Code type:', parsedData.type);
        if (onScanSuccess) {
          // Still call success callback for unknown types
          onScanSuccess({
            type: 'unknown',
            data: parsedData,
            raw: JSON.stringify(parsedData)
          });
          onClose();
        } else {
          Alert.alert(
            'Unknown QR Code Type',
            `QR code type "${parsedData.type}" is not supported.`,
            [
              { text: 'Scan Again', onPress: () => setScanned(false) },
              { text: 'Close', onPress: onClose }
            ]
          );
        }
    }
  };

  const handleUserProfile = (data) => {
    const userName = data.name || `User ${data.userId}`;
    Alert.alert(
      'User Profile Found',
      `Found profile for: ${userName}\n\nWould you like to view their profile?`,
      [
        { text: 'Cancel', onPress: () => setScanned(false) },
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
        { text: 'Cancel', onPress: () => setScanned(false) },
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
        { text: 'Cancel', onPress: () => setScanned(false) },
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
            onClose();
          }
        }
      ]
    );
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === 'off' 
        ? 'torch' 
        : 'off'
    );
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera" size={64} color="#9ca3af" />
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-off" size={64} color="#ef4444" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Please allow camera access to scan QR codes
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={getCameraPermissions}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Ionicons 
              name={flashMode === 'off' ? "flash-off" : "flash"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>

        {/* Camera */}
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            flash={flashMode === 'torch' ? "on" : "off"}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onCameraReady={() => setCameraReady(true)}
          />
          
          {/* Scanning Frame */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              {scanned ? 'Processing...' : 'Position QR code within the frame'}
            </Text>
            {scanned && (
              <TouchableOpacity 
                style={styles.scanAgainButton} 
                onPress={() => setScanned(false)}
              >
                <Text style={styles.scanAgainButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 12,
  },
  closeButtonText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: width * 0.7,
    height: width * 0.7,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#3b82f6',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanAgainButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanAgainButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QRCodeScanner;
