import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RecentActivity = ({ activities, onActivityPress }) => {
  return (
    <View style={styles.container}>
      <View style={styles.activitiesList}>
        {activities.map((activity, index) => (
          <TouchableOpacity
            key={index}
            style={styles.activityItem}
            onPress={() => onActivityPress(activity)}
            activeOpacity={0.8}
          >
            <View style={styles.activityIcon}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityDescription}>
                {activity.description}
              </Text>
              <Text style={styles.activityTime}>
                {activity.timestamp || 'Just now'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
        {activities.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>
              Start participating in events to see your activity here
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  activitiesList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
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
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default RecentActivity; 