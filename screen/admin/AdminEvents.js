import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import eventService from '../../services/eventService';

export default function AdminEvents() {
  const { userData } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [events, setEvents] = React.useState([]);

  const load = async () => {
    setLoading(true);
    const res = await eventService.listEvents(200);
    if (res.success) setEvents(res.events);
    setLoading(false);
  };

  React.useEffect(() => { load(); }, []);

  // Admin access check
  if (!userData?.isAdmin && userData?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.center}> 
        <Text style={styles.danger}>Access Denied</Text>
        <Text style={styles.dangerSubtext}>You must be an admin to view this page.</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleCreateQuick = async () => {
    const now = new Date();
    const payload = {
      title: `Quick Event ${now.toLocaleTimeString()}`,
      description: 'Auto-created event by admin',
      date: now.toDateString(),
      time: `${now.getHours()}:00`,
      location: 'Community Hall',
      category: 'community service',
      maxParticipants: 100,
      points: 10,
      participants: 0,
      organizer: userData?.name || 'Admin',
      image: '🎉',
      status: 'upcoming',
    };
    const res = await eventService.createEvent(payload);
    if (!res.success) Alert.alert('Error', res.message || 'Failed to create event');
    await load();
  };

  const handleDelete = async (ev) => {
    Alert.alert('Delete Event', `Delete "${ev.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await eventService.deleteEvent(ev.id); await load(); } },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.title}</Text>
        <Text style={styles.dim}>{item.date} • {item.time}</Text>
        <Text style={styles.dim}>{item.location}</Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
        <Ionicons name="trash" size={18} color="#fff" />
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Events</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleCreateQuick}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.refreshText}>Quick Create</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  danger: { color: '#ef4444', fontWeight: '700', fontSize: 18, marginBottom: 8 },
  dangerSubtext: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  backButton: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  header: { padding: 16, backgroundColor: '#3b82f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  refreshText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  row: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' },
  name: { fontWeight: '700', color: '#111827' },
  dim: { color: '#6b7280', fontSize: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});


