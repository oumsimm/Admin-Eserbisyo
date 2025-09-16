import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { generateUserURLQR } from '../utils/simpleQrUtils';

const QRTestComponent = () => {
  const [qrData, setQrData] = useState('');

  const testQRGeneration = () => {
    try {
      const testUser = { id: 'test123', name: 'Test User', email: 'test@example.com' };
      const qrValue = generateUserURLQR(testUser.id);
      setQrData(qrValue);
      Alert.alert('Success', 'QR Code generated successfully!');
    } catch (error) {
      console.error('QR Test Error:', error);
      Alert.alert('Error', 'Failed to generate QR code: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code Test</Text>
      
      <TouchableOpacity style={styles.button} onPress={testQRGeneration}>
        <Text style={styles.buttonText}>Generate Test QR</Text>
      </TouchableOpacity>
      
      {qrData ? (
        <View style={styles.qrContainer}>
          <QRCode
            value={qrData}
            size={200}
            backgroundColor="white"
            color="black"
          />
          <Text style={styles.qrText}>QR Data: {qrData}</Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>No QR code generated yet</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrText: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default QRTestComponent;
