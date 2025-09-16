import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ActionButton = ({ title, icon, color, onPress, gradient = false }) => {
  const ButtonComponent = gradient ? LinearGradient : View;
  const buttonProps = gradient ? { colors: color, style: styles.actionButton } : { style: [styles.actionButton, { backgroundColor: color }] };

  return (
    <TouchableOpacity onPress={onPress} style={styles.actionContainer}>
      <ButtonComponent {...buttonProps}>
        <Ionicons name={icon} size={24} color="#ffffff" />
        <Text style={styles.actionText}>{title}</Text>
      </ButtonComponent>
    </TouchableOpacity>
  );
};

const QuickActions = ({ onActionPress, isAdmin = false }) => {
  const actions = [
    {
      title: 'Join Event',
      icon: 'calendar-outline',
      color: '#3b82f6',
      action: 'joinEvent'
    },
    {
      title: 'Report Issue',
      icon: 'alert-circle-outline',
      color: '#ef4444',
      action: 'reportIssue'
    },
    {
      title: 'View Map',
      icon: 'map-outline',
      color: '#10b981',
      action: 'viewMap'
    },
    {
      title: 'Community',
      icon: 'people-outline',
      color: '#8b5cf6',
      action: 'community'
    },
    {
      title: 'Leaderboard',
      icon: 'trophy-outline',
      color: '#f59e0b',
      action: 'leaderboard'
    },
  ];

  // Add admin-specific actions
  if (isAdmin) {
    actions.push(
      {
        title: 'Create Event',
        icon: 'add-circle-outline',
        color: ['#667eea', '#764ba2'],
        action: 'createEvent',
        gradient: true
      },
      {
        title: 'Admin Panel',
        icon: 'settings-outline',
        color: ['#f093fb', '#f5576c'],
        action: 'adminPanel',
        gradient: true
      }
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsContainer}
      >
        {actions.map((action, index) => (
          <ActionButton
            key={index}
            title={action.title}
            icon={action.icon}
            color={action.color}
            gradient={action.gradient}
            onPress={() => onActionPress(action.action)}
          />
        ))}
      </ScrollView>
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
  actionsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  actionContainer: {
    marginRight: 12,
  },
  actionButton: {
    width: 120,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default QuickActions;