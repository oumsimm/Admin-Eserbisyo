import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StatsCard = ({ title, value, icon, color, subtext }) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    flex: 1,
    minWidth: '30%',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 1,
  },
  subtext: {
    fontSize: 9,
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatsCard; 