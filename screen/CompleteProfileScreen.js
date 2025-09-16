import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../contexts/UserContext';

const BARANGAY_OPTIONS = [
  'Alijis', 'Banago', 'Bata', 'Cabug', 'Estefania', 'Felisa', 'Granada', 'Handumanan',
  'Mandalagan', 'Mansilingan', 'Montevista', 'Pahanocoy', 'Punta Taytay', 'Singcang-Airport',
  'Sum-ag', 'Taculing', 'Tangub', 'Villamonte', 'Vista Alegre'
];

const GENDER_OPTIONS = [
  { key: 'girl', label: 'Girl', icon: 'woman-outline' },
  { key: 'boy', label: 'Boy', icon: 'man-outline' }
];

const CompleteProfileScreen = () => {
  const navigation = useNavigation();
  const { user, userData, updateUserProfile } = useUser();

  const initialGender = useMemo(() => (userData?.gender === 'girl' || userData?.gender === 'boy') ? userData.gender : null, [userData]);
  const initialBarangay = useMemo(() => (typeof userData?.barangay === 'string' && userData.barangay.length > 0) ? userData.barangay : null, [userData]);

  const [selectedGender, setSelectedGender] = useState(initialGender);
  const [selectedBarangay, setSelectedBarangay] = useState(initialBarangay);
  const [saving, setSaving] = useState(false);

  const canContinue = !!selectedGender && !!selectedBarangay;

  const handleSave = async () => {
    if (!canContinue) {
      Toast.show({ type: 'error', text1: 'Incomplete', text2: 'Please select gender and barangay' });
      return;
    }
    try {
      setSaving(true);
      const payload = { gender: selectedGender, barangay: selectedBarangay };
      const result = await updateUserProfile(payload);
      if (result?.success) {
        Toast.show({ type: 'success', text1: 'Profile completed' });
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      } else {
        Toast.show({ type: 'error', text1: 'Failed to save', text2: result?.message || 'Try again' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Unexpected error', text2: 'Please try again' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1e3a8a', '#3b82f6']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Select your gender and barangay to continue</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.genderCard, selectedGender === opt.key && styles.genderCardSelected]}
              onPress={() => setSelectedGender(opt.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={opt.icon} size={42} color={selectedGender === opt.key ? '#1e3a8a' : '#374151'} />
              <Text style={[styles.genderLabel, selectedGender === opt.key && styles.genderLabelSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Barangay</Text>
        <View style={styles.barangayGrid}>
          {BARANGAY_OPTIONS.map((bgy) => (
            <TouchableOpacity
              key={bgy}
              style={[styles.bgyChip, selectedBarangay === bgy && styles.bgyChipSelected]}
              onPress={() => setSelectedBarangay(bgy)}
              activeOpacity={0.8}
            >
              <Text style={[styles.bgyText, selectedBarangay === bgy && styles.bgyTextSelected]}>{bgy}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryButton, !canContinue && styles.buttonDisabled]} disabled={!canContinue || saving} onPress={handleSave}>
          <LinearGradient colors={canContinue && !saving ? ['#1e40af', '#3b82f6'] : ['#9ca3af', '#6b7280']} style={styles.primaryButtonInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {saving ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.primaryButtonText}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.loadingRow}>
                <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    marginLeft: 4,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  genderCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  genderLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  genderLabelSelected: {
    color: '#1e3a8a',
  },
  barangayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bgyChip: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  bgyChipSelected: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  bgyText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  bgyTextSelected: {
    color: '#ffffff',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    marginRight: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});

export default CompleteProfileScreen;


