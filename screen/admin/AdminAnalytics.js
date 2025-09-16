import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import adminService from '../../services/adminService';

export default function AdminAnalytics() {
  const [loading, setLoading] = React.useState(true);
  const [metrics, setMetrics] = React.useState({ totalActivities: 0, daily: 0, weekly: 0 });

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await adminService.getRecentActivities(200);
      if (res.success) {
        const total = res.activities.length;
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const daily = res.activities.filter(a => now - (a.timestamp?.toMillis?.() || now) < oneDay).length;
        const weekly = res.activities.filter(a => now - (a.timestamp?.toMillis?.() || now) < 7 * oneDay).length;
        setMetrics({ totalActivities: total, daily, weekly });
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
        <View style={{ padding: 16 }}>
          <Metric icon="flash" label="Total Activities" value={metrics.totalActivities} color="#3b82f6" />
          <Metric icon="sunny" label="Today" value={metrics.daily} color="#f59e0b" />
          <Metric icon="calendar" label="This Week" value={metrics.weekly} color="#10b981" />
        </View>
      )}
    </SafeAreaView>
  );
}

function Metric({ icon, label, value, color }) {
  return (
    <View style={styles.metricRow}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#3b82f6' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  metricRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  metricIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  metricLabel: { color: '#111827', fontWeight: '700' },
  metricValue: { marginLeft: 'auto', color: '#3b82f6', fontWeight: '800' },
});


