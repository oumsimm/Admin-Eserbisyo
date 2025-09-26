// components/QRScanner.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { validateScannedQR, extractUserInfoFromQR } from '../utils/qrValidation';

const { width, height } = Dimensions.get('window');

export default function QRScanner({ visible, onClose, onUserScanned }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
      // Reset processing state when modal becomes visible
      if (status === 'granted') {
        setIsProcessing(false);
      }
    };

    if (visible) {
      getBarCodeScannerPermissions();
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Validate the scanned QR code
      const validation = await validateScannedQR(data);
      
      if (!validation.valid) {
        Alert.alert(
          'Invalid QR Code',
          validation.error || 'This QR code is not valid or has expired.',
          [
            {
              text: 'Scan Again', // Resetting isProcessing allows another scan
              onPress: () => setIsProcessing(false)
            },
            { text: 'Close', onPress: onClose }
          ]
        );
        return;
      }

      // Extract user info
      const userInfo = extractUserInfoFromQR({ payload: validation.data });
      
      if (userInfo) {
        Alert.alert(
          'QR Code Scanned',
          `Successfully scanned QR for: ${userInfo.name}\nUser ID: ${userInfo.userId}`,
          [
            {
              text: 'View Profile',
              onPress: () => {
                onUserScanned?.(userInfo);
                onClose();
              }
            },
            { text: 'Close', onPress: onClose }
          ]
        );
      } else {
        throw new Error('Failed to extract user information');
      }
    } catch (error) {
      console.error('Error processing scanned QR:', error);
      Alert.alert(
        'Error',
        'Failed to process the QR code. Please try again.',
        [
          {
            text: 'Scan Again', // Resetting isProcessing allows another scan
            onPress: () => setIsProcessing(false)
          },
          { text: 'Close', onPress: onClose }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Requesting camera permission...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={48} color="#ef4444" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              Please enable camera access to scan QR codes
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={isProcessing ? undefined : handleBarCodeScanned}
            style={styles.scanner}
          />
          
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {isProcessing 
                ? 'Processing QR code...' 
                : 'Position the QR code within the frame'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
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
  scanArea: {
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
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permissionContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 20,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 12,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});