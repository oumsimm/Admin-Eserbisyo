import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const UserCodeDemo = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 User Code System Demo</Text>
      
      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>1</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>User Signs Up</Text>
          <Text style={styles.stepDescription}>
            New user fills out: Name, Email, Phone, Password
          </Text>
        </View>
      </View>

      <View style={styles.arrow}>
        <Ionicons name="arrow-down" size={24} color="#3b82f6" />
      </View>

      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>2</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>System Assigns Code</Text>
          <Text style={styles.stepDescription}>
            Auto-generates next code: 001 → 002 → 003...
          </Text>
        </View>
      </View>

      <View style={styles.arrow}>
        <Ionicons name="arrow-down" size={24} color="#3b82f6" />
      </View>

      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>3</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>User Gets Code</Text>
          <View style={styles.codeExample}>
            <Text style={styles.codeText}>Your User Code: 001</Text>
          </View>
        </View>
      </View>

      <View style={styles.arrow}>
        <Ionicons name="arrow-down" size={24} color="#3b82f6" />
      </View>

      <View style={styles.step}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>4</Text>
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Easy Login</Text>
          <Text style={styles.stepDescription}>
            User logs in with: Code (001) + Password
          </Text>
        </View>
      </View>

      <View style={styles.benefits}>
        <Text style={styles.benefitsTitle}>✨ Benefits</Text>
        <Text style={styles.benefit}>• Easy to remember (001 vs email)</Text>
        <Text style={styles.benefit}>• Perfect for barangay residents</Text>
        <Text style={styles.benefit}>• No typing long emails</Text>
        <Text style={styles.benefit}>• Community-friendly system</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 12,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  arrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  codeExample: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
  },
  benefits: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderLeft: 4,
    borderLeftColor: '#10b981',
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  benefit: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
});

export default UserCodeDemo;
