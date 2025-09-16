import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import reportsService from '../../services/reportsService';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState({ severity: 'all', status: 'all' });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsub = reportsService.subscribeToReports(setReports, filter);
    return () => unsub && unsub();
  }, [filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const items = await reportsService.getReports({
      severity: filter.severity === 'all' ? undefined : filter.severity,
      status: filter.status === 'all' ? undefined : filter.status,
      limitCount: 100,
    });
    setReports(items);
    setRefreshing(false);
  }, [filter]);

  const markStatus = async (reportId, status) => {
    await reportsService.updateReportStatus(reportId, status);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.severityPill, item.severity === 'critical' ? styles.critical : item.severity === 'high' ? styles.high : styles.pending]}>
          <Ionicons name={item.severity === 'critical' ? 'warning' : item.severity === 'high' ? 'flash' : 'time'} size={14} color="#fff" />
          <Text style={styles.pillText}>{(item.severity || 'pending').toUpperCase()}</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>{item.title || 'User Report'}</Text>
      </View>
      <Text style={styles.desc} numberOfLines={3}>{item.description}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.inProgressBtn]} onPress={() => markStatus(item.id, 'in_progress')}>
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.actionText}>In Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.resolveBtn]} onPress={() => markStatus(item.id, 'resolved')}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.actionText}>Resolve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.dismissBtn]} onPress={() => markStatus(item.id, 'dismissed')}>
          <Ionicons name="close" size={16} color="#fff" />
          <Text style={styles.actionText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Reports</Text>
      </View>
      <FlatList
        data={reports}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No reports found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  severityPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginRight: 8 },
  critical: { backgroundColor: '#ef4444' },
  high: { backgroundColor: '#f59e0b' },
  pending: { backgroundColor: '#6b7280' },
  pillText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1f2937' },
  desc: { color: '#374151', fontSize: 13 },
  actionsRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  inProgressBtn: { backgroundColor: '#3b82f6' },
  resolveBtn: { backgroundColor: '#10b981' },
  dismissBtn: { backgroundColor: '#6b7280' },
  actionText: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 12 },
  empty: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
});


