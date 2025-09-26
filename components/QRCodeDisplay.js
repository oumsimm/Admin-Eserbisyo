// components/QRCodeDisplay.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Share,
  Dimensions
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import qrService from '../services/qrService';

const { width } = Dimensions.get('window');

export default function QRCodeDisplay({ 
  user, 
  size = 220, 
  showControls = true,
  onQRGenerated,
  style 
}) {
  const [qrValue, setQrValue] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      loadOrGenerateQR();
    }
  }, [user]);

  const loadOrGenerateQR = async () => {
    if (!user) return;

    try {
      setIsGenerating(true);
      setError(null);

      // Try to load existing valid QR
      const currentQR = await qrService.getCurrentQR(user.id || user.uid);
      
      if (currentQR) {
        setQrValue(JSON.stringify(currentQR));
        setQrData(currentQR);
        onQRGenerated?.(currentQR);
      } else {
        // Generate new QR
        await generateNewQR();
      }
    } catch (err) {
      console.error('Error loading QR:', err);
      setError('Failed to load QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateNewQR = async () => {
    if (!user) return;

    try {
      setIsGenerating(true);
      setError(null);

      const result = await qrService.generateUserQR(user);
      
      if (result.success) {
        setQrValue(result.qrValue);
        setQrData(result.data);
        onQRGenerated?.(result.data);
      } else {
        setError(result.error || 'Failed to generate QR code');
        Alert.alert('Error', 'Failed to generate QR code. Please try again.');
      }
    } catch (err) {
      console.error('Error generating QR:', err);
      setError('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = () => {
    Alert.alert(
      'Refresh QR Code',
      'This will generate a new QR code and invalidate the current one. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Refresh', onPress: generateNewQR }
      ]
    );
  };

  const handleShare = async () => {
    if (!qrData) return;

    try {
      const shareMessage = `My E-SERBISYO Profile QR Code\n\nName: ${qrData.payload.name}\nUser ID: ${qrData.payload.userId}\n\nScan this QR code to connect with me!`;
      
      await Share.share({
        message: shareMessage,
        title: 'My E-SERBISYO QR Code'
      });
    } catch (error) {
      console.error('Error sharing QR:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrGenerateQR}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.qrContainer}>
        {isGenerating ? (
          <View style={[styles.loadingContainer, { width: size, height: size }]}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Generating QR...</Text>
          </View>
        ) : qrValue ? (
          <>
            <View style={styles.qrWrapper}>
              <QRCode 
                value={qrValue} 
                size={size}
                backgroundColor="white"
                color="black"
                logoSize={size * 0.15}
                logoBackgroundColor="transparent"
              />
            </View>
            
            {qrData && (
              <View style={styles.qrInfo}>
                <Text style={styles.qrInfoTitle}>QR Code Details</Text>
                <Text style={styles.qrInfoText}>Generated: {formatTimestamp(qrData.generatedAt)}</Text>
                <Text style={styles.qrInfoText}>User: {qrData.payload.name}</Text>
                <Text style={styles.qrInfoText}>Valid for 24 hours</Text>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.placeholderContainer, { width: size, height: size }]}>
            <Ionicons name="qr-code" size={size * 0.3} color="#9ca3af" />
            <Text style={styles.placeholderText}>No QR Code</Text>
          </View>
        )}
      </View>

      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity 
            style={[styles.controlButton, styles.refreshButton]} 
            onPress={handleRefresh}
            disabled={isGenerating}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.controlButtonText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.controlButton, styles.shareButton]} 
            onPress={handleShare}
            disabled={!qrValue || isGenerating}
          >
            <Ionicons name="share" size={20} color="white" />
            <Text style={styles.controlButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
  qrInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
    minWidth: width * 0.7,
  },
  qrInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  qrInfoText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
  },
  shareButton: {
    backgroundColor: '#10b981',
  },
  controlButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});