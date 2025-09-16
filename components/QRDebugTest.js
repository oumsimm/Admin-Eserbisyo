import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { parseQRData, validateQRData } from '../utils/qrCodeUtils';
import { parseQRData as simpleParseQR, validateQRData as simpleValidateQR } from '../utils/simpleQrUtils';

const QRDebugTest = () => {
  const [testData, setTestData] = useState('');
  const [results, setResults] = useState([]);

  const testQRParsing = async () => {
    if (!testData.trim()) {
      Alert.alert('Error', 'Please enter some test data');
      return;
    }

    const timestamp = Date.now();
    const testResults = [];

    try {
      // Test with primary parser
      console.log('Testing with primary parser...');
      const primaryResult = parseQRData(testData);
      testResults.push({
        parser: 'Primary (qrCodeUtils)',
        success: !!primaryResult,
        data: primaryResult,
        error: null
      });

      if (primaryResult) {
        const primaryValid = validateQRData(primaryResult);
        testResults.push({
          parser: 'Primary Validation',
          success: primaryValid,
          data: { isValid: primaryValid },
          error: null
        });
      }
    } catch (error) {
      testResults.push({
        parser: 'Primary (qrCodeUtils)',
        success: false,
        data: null,
        error: error.message
      });
    }

    try {
      // Test with simple parser
      console.log('Testing with simple parser...');
      const simpleResult = simpleParseQR(testData);
      testResults.push({
        parser: 'Simple (simpleQrUtils)',
        success: !!simpleResult,
        data: simpleResult,
        error: null
      });

      if (simpleResult) {
        const simpleValid = simpleValidateQR(simpleResult);
        testResults.push({
          parser: 'Simple Validation',
          success: simpleValid,
          data: { isValid: simpleValid },
          error: null
        });
      }
    } catch (error) {
      testResults.push({
        parser: 'Simple (simpleQrUtils)',
        success: false,
        data: null,
        error: error.message
      });
    }

    setResults(prevResults => [{
      timestamp,
      input: testData,
      results: testResults
    }, ...prevResults]);
  };

  const generateTestQRData = (type) => {
    let testQR = '';
    switch (type) {
      case 'user':
        testQR = JSON.stringify({
          type: 'USER_PROFILE',
          userId: 'test123',
          name: 'Test User',
          email: 'test@example.com',
          timestamp: Date.now(),
          appName: 'E-SERBISYO'
        });
        break;
      case 'event':
        testQR = JSON.stringify({
          type: 'EVENT_INFO',
          eventId: 'event123',
          eventTitle: 'Test Event',
          eventDate: '2024-12-15',
          location: 'Test Location',
          timestamp: Date.now(),
          appName: 'E-SERBISYO'
        });
        break;
      case 'simple':
        testQR = 'eserbisyo://user/test123';
        break;
      case 'invalid':
        testQR = 'invalid-qr-code-data';
        break;
      default:
        testQR = '';
    }
    setTestData(testQR);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>QR Code Debug Test</Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.label}>Test QR Data:</Text>
          <TextInput
            style={styles.textInput}
            value={testData}
            onChangeText={setTestData}
            placeholder="Enter QR code data to test..."
            multiline
          />
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={testQRParsing}
            >
              <Text style={styles.buttonText}>Test Parsing</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.clearButton]} 
              onPress={clearResults}
            >
              <Text style={styles.buttonText}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.label}>Quick Test Data:</Text>
          <View style={styles.quickButtonRow}>
            <TouchableOpacity 
              style={[styles.quickButton, styles.userButton]} 
              onPress={() => generateTestQRData('user')}
            >
              <Text style={styles.quickButtonText}>User QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, styles.eventButton]} 
              onPress={() => generateTestQRData('event')}
            >
              <Text style={styles.quickButtonText}>Event QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, styles.simpleButton]} 
              onPress={() => generateTestQRData('simple')}
            >
              <Text style={styles.quickButtonText}>Simple QR</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickButton, styles.invalidButton]} 
              onPress={() => generateTestQRData('invalid')}
            >
              <Text style={styles.quickButtonText}>Invalid QR</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {results.length === 0 ? (
            <Text style={styles.noResults}>No test results yet</Text>
          ) : (
            results.map((test, index) => (
              <View key={index} style={styles.testResult}>
                <Text style={styles.testHeader}>
                  Test {results.length - index} - {new Date(test.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.testInput}>Input: {test.input.substring(0, 100)}...</Text>
                
                {test.results.map((result, resultIndex) => (
                  <View key={resultIndex} style={styles.parserResult}>
                    <Text style={[styles.parserName, result.success ? styles.success : styles.error]}>
                      {result.parser}: {result.success ? '✅' : '❌'}
                    </Text>
                    {result.error && (
                      <Text style={styles.errorText}>Error: {result.error}</Text>
                    )}
                    {result.data && (
                      <Text style={styles.dataText}>
                        Data: {JSON.stringify(result.data, null, 2)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  inputSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  quickButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  quickButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    margin: 2,
  },
  userButton: {
    backgroundColor: '#34C759',
  },
  eventButton: {
    backgroundColor: '#FF9500',
  },
  simpleButton: {
    backgroundColor: '#5856D6',
  },
  invalidButton: {
    backgroundColor: '#FF3B30',
  },
  quickButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  resultsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  testResult: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  testHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  testInput: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  parserResult: {
    marginLeft: 8,
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#eee',
  },
  parserName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  success: {
    color: '#34C759',
  },
  error: {
    color: '#FF3B30',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 4,
  },
  dataText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 4,
    borderRadius: 2,
  },
});

export default QRDebugTest;
