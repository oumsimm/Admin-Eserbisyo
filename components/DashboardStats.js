import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const StatCard = ({ title, value, icon, color, onPress, loading = false }) => (
  <TouchableOpacity 
    style={[styles.statCard, { borderLeftColor: color }]} 
    onPress={onPress}
    disabled={loading}
  >
    <View style={styles.statContent}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.statValue, { color }]}>
          {loading ? '...' : value}
        </Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  </TouchableOpacity>
);

const DashboardStats = ({ 
  stats, 
  loading, 
  onStatPress,
  userData 
}) => {
  const statCards = [
    {
      title: 'Points Earned',
      value: userData?.points || 0,
      icon: 'star',
      color: '#f59e0b',
      onPress: () => onStatPress('points')
    },
    {
      title: 'Events Joined',
      value: userData?.eventsAttended || 0,
      icon: 'calendar',
      color: '#3b82f6',
      onPress: () => onStatPress('events')
    },
    {
      title: 'Level',
      value: userData?.level || 1,
      icon: 'trophy',
      color: '#10b981',
      onPress: () => onStatPress('level')
    },
    {
      title: 'Badges',
      value: userData?.badges?.length || 0,
      icon: 'ribbon',
      color: '#8b5cf6',
      onPress: () => onStatPress('badges')
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Progress</Text>
      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            onPress={stat.onPress}
            loading={loading}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flex: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default DashboardStats;
