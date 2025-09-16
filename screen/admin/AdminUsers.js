import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../contexts/UserContext';
import adminService from '../../services/adminService';

export default function AdminUsers() {
  const { userData } = useUser();
  const [loading, setLoading] = React.useState(true);
  const [users, setUsers] = React.useState([]);

  const load = async () => {
    setLoading(true);
    const res = await adminService.listUsers(500);
    if (res.success) setUsers(res.users);
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

  const handlePromoteToggle = async (u) => {
    const isAdmin = u.isAdmin || u.role === 'admin';
    const action = isAdmin ? adminService.demoteToUser : adminService.promoteToAdmin;
    const res = await action(u.uid || u.id);
    if (!res.success) Alert.alert('Error', res.message || 'Failed');
    await load();
  };

  const handleDisableToggle = async (u) => {
    const action = u.disabled ? adminService.enableUser : adminService.disableUser;
    const res = await action(u.uid || u.id);
    if (!res.success) Alert.alert('Error', res.message || 'Failed');
    await load();
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name || item.email}</Text>
        <Text style={styles.dim}>{item.email}</Text>
        <Text style={styles.badge}>{item.isAdmin || item.role === 'admin' ? 'Admin' : 'User'} {item.disabled ? '• Disabled' : ''}</Text>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={() => handlePromoteToggle(item)}>
        <Ionicons name="shield-checkmark" size={18} color="#fff" />
        <Text style={styles.actionText}>{item.isAdmin || item.role === 'admin' ? 'Demote' : 'Promote'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444', marginLeft: 8 }]} onPress={() => handleDisableToggle(item)}>
        <Ionicons name={item.disabled ? 'refresh' : 'ban'} size={18} color="#fff" />
        <Text style={styles.actionText}>{item.disabled ? 'Enable' : 'Disable'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id || item.uid}
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
  badge: { color: '#3b82f6', fontSize: 12, marginTop: 4, fontWeight: '700' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
});


