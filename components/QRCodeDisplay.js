import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { generateUserQRData, generateSimpleUserQR, generateDynamicUserQR } from '../utils/qrCodeUtils';
import { generateSimpleUserQR as simpleUserQR, generateEventQR, generateUserURLQR } from '../utils/simpleQrUtils';

const { width } = Dimensions.get('window');

const QRCodeDisplay = ({ 
  user, 
  size = 200, 
  type = 'user', 
  event = null,
  showControls = true,
  backgroundColor = '#ffffff',
  foregroundColor = '#000000'
}) => {
  const [qrData, setQrData] = useState('');
  const [qrType, setQrType] = useState('simple');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    generateQRCode();
  }, [user, type, qrType, event]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = '';
      
      switch (type) {
        case 'user':
          switch (qrType) {
            case 'simple':
              data = generateUserURLQR(user.id || 'guest');
              break;
            case 'detailed':
              try {
                data = await generateUserQRData(user);
              } catch (err) {
                // Fallback to simple QR if crypto fails
                console.warn('Crypto failed, using simple QR:', err);
                data = simpleUserQR(user);
              }
              break;
            case 'dynamic':
              try {
                data = await generateDynamicUserQR(user);
              } catch (err) {
                // Fallback to simple QR if crypto fails
                console.warn('Crypto failed, using simple QR:', err);
                data = simpleUserQR(user);
              }
              break;
            default:
              data = generateUserURLQR(user.id || 'guest');
          }
          break;
        
        case 'event':
          if (event) {
            data = generateEventQR(event);
          }
          break;
          
        default:
          data = generateUserURLQR(user.id || 'guest');
      }
      
      setQrData(data);
    } catch (err) {
      console.error('Error generating QR code:', err);
      // Ultimate fallback - simple URL
      try {
        const fallbackData = generateUserURLQR(user?.id || 'guest');
        setQrData(fallbackData);
        setError(null);
      } catch (finalErr) {
        setError('Failed to generate QR code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!qrData) {
        Alert.alert('Error', 'No QR code to share');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        Alert.alert(
          'Share QR Code',
          'QR code sharing will be available soon. For now, you can take a screenshot.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Share QR Code',
          'Please take a screenshot to share your QR code.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert(
        'Share QR Code',
        'Please take a screenshot to share your QR code.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRefresh = () => {
    generateQRCode();
  };

  const getQRTypeTitle = () => {
    switch (qrType) {
      case 'simple':
        return 'Simple Profile Link';
      case 'detailed':
        return 'Detailed Profile Data';
      case 'dynamic':
        return 'Dynamic Profile (24h)';
      default:
        return 'QR Code';
    }
  };

  const getQRDescription = () => {
    switch (type) {
      case 'user':
        switch (qrType) {
          case 'simple':
            return 'Quick access to your profile';
          case 'detailed':
            return 'Complete profile information';
          case 'dynamic':
            return 'Secure profile with expiration';
          default:
            return 'Your profile QR code';
        }
      case 'event':
        return event ? `Event: ${event.title}` : 'Event information';
      default:
        return 'QR Code';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { height: size + 100 }]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="qr-code" size={32} color="#9ca3af" />
          <Text style={styles.loadingText}>Generating QR Code...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { height: size + 100 }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showControls && type === 'user' && (
        <View style={styles.typeSelector}>
          <Text style={styles.typeSelectorTitle}>QR Code Type:</Text>
          <View style={styles.typeButtons}>
            {['simple', 'detailed', 'dynamic'].map((typeOption) => (
              <TouchableOpacity
                key={typeOption}
                style={[
                  styles.typeButton,
                  qrType === typeOption && styles.typeButtonActive
                ]}
                onPress={() => setQrType(typeOption)}
              >
                <Text style={[
                  styles.typeButtonText,
                  qrType === typeOption && styles.typeButtonTextActive
                ]}>
                  {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.qrContainer}>
        <Text style={styles.qrTitle}>{getQRTypeTitle()}</Text>
        <Text style={styles.qrDescription}>{getQRDescription()}</Text>
        
        <View style={[styles.qrCodeWrapper, { backgroundColor }]}>
          {qrData ? (
            <QRCode
              value={qrData}
              size={size}
              backgroundColor={backgroundColor}
              color={foregroundColor}
              logoSize={30}
              logoBackgroundColor="transparent"
            />
          ) : (
            <View style={[styles.placeholder, { width: size, height: size }]}>
              <Ionicons name="qr-code" size={size * 0.3} color="#9ca3af" />
            </View>
          )}
        </View>

        {showControls && (
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={20} color="#3b82f6" />
              <Text style={styles.controlButtonText}>Refresh</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
              <Ionicons name="share" size={20} color="#3b82f6" />
              <Text style={styles.controlButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {qrType === 'dynamic' && (
          <Text style={styles.expirationNote}>
            This QR code expires in 24 hours for security
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  typeSelector: {
    marginBottom: 20,
    width: '100%',
  },
  typeSelectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  typeButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  qrDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCodeWrapper: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  controlButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  expirationNote: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default QRCodeDisplay;
