import React, { useEffect, useMemo, useState, useCallback, useRef, useMemo as useMemoRN } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, LayoutAnimation, Platform, UIManager, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import challengesService from '../services/challengesService';
import feedbackService from '../services/feedbackService';
import { useUser } from '../contexts/UserContext';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const initialChallenges = [
  {
    id: 'ch1',
    title: 'Volunteer 3 hours this week',
    type: 'solo',
    target: 3,
    progress: 1,
    unit: 'hours',
    points: 50,
    streakBonus: 10,
    team: null,
  },
  {
    id: 'ch2',
    title: 'Neighborhood steps challenge',
    type: 'team',
    target: 50000,
    progress: 22000,
    unit: 'steps',
    points: 100,
    team: { name: 'Team Blue', rank: 2 },
  },
];

export default function ChallengesScreen() {
  const navigation = useNavigation();
  const { user, addUserPoints } = useUser();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimModal, setClaimModal] = useState(null);
  const [gpsEvidence, setGpsEvidence] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['35%'], []);
  const feedbackSheetRef = useRef(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch (e) {}
    }
  }, []);

  const loadChallenges = useCallback(async () => {
    try {
      const res = await challengesService.listChallenges(100);
      if (!res.success) throw new Error(res.error || 'Failed to load');
      const base = res.challenges || [];
      // Merge user progress
      const withProgress = await Promise.all((base).map(async (c) => {
        try {
          const progRes = user ? await challengesService.getUserProgress(c.id, user.uid) : { success: true, progress: null };
          const progressValue = progRes?.progress?.progress || 0;
          return { ...c, progress: progressValue };
        } catch {
          return { ...c, progress: 0 };
        }
      }));
      setChallenges(withProgress);
    } catch (error) {
      console.error('Challenges load error:', error);
      Toast.show({ type: 'error', text1: 'Failed to load challenges' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const percent = (c) => Math.min(100, Math.round((c.progress / c.target) * 100));

  const handleClaimEvidence = (challenge) => {
    setClaimModal(challenge);
  };

  const submitEvidence = async () => {
    if (!claimModal) return;
    if (!user) {
      Toast.show({ type: 'info', text1: 'Please login to claim' });
      return;
    }
    try {
      const current = challenges.find(c => c.id === claimModal.id);
      const target = Number(current?.target || 0);
      const currentProgress = Number(current?.progress || 0);
      const delta = Math.max(0, target - currentProgress);

      // Update progress to target
      if (delta > 0) {
        await challengesService.updateUserProgress(claimModal.id, user.uid, delta, {});
      }
      // Submit evidence metadata
      await challengesService.submitEvidence(claimModal.id, user.uid, { gps: gpsEvidence || null, photoUri: photoUri || null, markComplete: true });

      // Optimistic UI update with animation
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setChallenges(prev => prev.map(c => c.id === claimModal.id ? { ...c, progress: target } : c));

      // Award points
      if (typeof addUserPoints === 'function') {
        const pts = Number(current?.points || 0);
        if (pts > 0) {
          try { await addUserPoints(pts, 'challenge_complete'); } catch {}
        }
      }

      setClaimModal(null);
      setGpsEvidence(null);
      setPhotoUri(null);
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      Toast.show({ type: 'success', text1: 'Challenge claimed!' });
      try { bottomSheetRef.current?.dismiss(); } catch {}

      // Open feedback sheet
      setFeedbackTarget(current);
      setTimeout(() => feedbackSheetRef.current?.present(), 0);
    } catch (error) {
      console.error('submitEvidence error:', error);
      Toast.show({ type: 'error', text1: 'Failed to submit evidence' });
    }
  };

  const requestGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'info', text1: 'Location permission denied' });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsEvidence({ lat: loc.coords.latitude, lng: loc.coords.longitude, ts: Date.now() });
      Toast.show({ type: 'success', text1: 'GPS attached' });
    } catch (e) {
      console.error('GPS error:', e);
      Toast.show({ type: 'error', text1: 'Failed to get GPS' });
    }
  };

  const pickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'info', text1: 'Photo permission denied' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8, mediaTypes: ImagePicker.MediaTypeOptions.Images });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
        Toast.show({ type: 'success', text1: 'Photo attached' });
      }
    } catch (e) {
      console.error('Image pick error:', e);
      Toast.show({ type: 'error', text1: 'Failed to pick image' });
    }
  };

  const openClaim = (item) => {
    setClaimModal(item);
    setTimeout(() => bottomSheetRef.current?.present(), 0);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
  };

  const renderChallenge = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.points}><Ionicons name="star" size={14} color="#f59e0b" /><Text style={styles.pointsText}>{item.points} pts</Text></View>
      </View>
      <Text style={styles.meta}>{item.type === 'team' ? `Team: ${item.team?.name} • Rank ${item.team?.rank}` : 'Solo challenge'}</Text>
      <View style={styles.progressBarOuter}>
        <View style={[styles.progressBarInner, { width: `${percent(item)}%` }]} />
        <Text style={styles.progressLabel}>{item.progress}/{item.target} {item.unit} • {percent(item)}%</Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openClaim(item)}>
          <Ionicons name="cloud-upload-outline" size={18} color="#3b82f6" />
          <Text style={styles.actionText}>Claim</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Leaderboard') }>
          <Ionicons name="people-outline" size={18} color="#6b7280" />
          <Text style={styles.secondaryText}>Leaderboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <BottomSheetModalProvider>
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={{ marginTop: 12, color: '#6b7280' }}>Loading challenges...</Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(i) => i.id}
          renderItem={renderChallenge}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#6b7280' }}>No challenges available.</Text>
            </View>
          )}
        />
      )}
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        onDismiss={() => { setClaimModal(null); setGpsEvidence(null); setPhotoUri(null); }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={styles.modalTitle}>Submit Evidence</Text>
          <Text style={styles.modalDesc}>Attach GPS or Photo to verify completion.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickPhoto}>
              <Ionicons name="images-outline" size={18} color="#6b7280" />
              <Text style={styles.attachText}>{photoUri ? 'Photo attached' : 'Attach Photo'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={requestGps}>
              <Ionicons name="navigate-outline" size={18} color="#6b7280" />
              <Text style={styles.attachText}>{gpsEvidence ? 'GPS attached' : 'Attach GPS'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={submitEvidence}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        ref={feedbackSheetRef}
        index={0}
        snapPoints={useMemo(() => ['40%'], [])}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />}
        onDismiss={() => { setFeedbackTarget(null); setFeedbackRating(0); setFeedbackComment(''); }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={styles.modalTitle}>Rate this challenge</Text>
          <Text style={styles.modalDesc}>{feedbackTarget?.title || ''}</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            {[1,2,3,4,5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)} style={{ marginRight: 8 }}>
                <Ionicons name={feedbackRating >= star ? 'star' : 'star-outline'} size={28} color="#f59e0b" />
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: '#6b7280', marginBottom: 6 }}>Comments (optional)</Text>
            <View style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 }}>
              <Text
                style={{ padding: 10, color: '#111827' }}
                // Dummy text element to keep style consistent in RN; actual TextInput below in separate import context
              >
              </Text>
            </View>
          </View>
          {/* Using a light TextInput here from react-native above */}
          <View style={{ marginTop: -36 }}>
            <TextInput
              placeholder="Share your thoughts"
              placeholderTextColor="#9ca3af"
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, minHeight: 44 }}
              multiline
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity style={styles.attachBtn} onPress={() => { feedbackSheetRef.current?.dismiss(); }}>
              <Text style={{ color: '#111827', fontWeight: '600' }}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { marginLeft: 10 }]}
              onPress={async () => {
                try {
                  const rating = Math.max(1, Math.min(5, Number(feedbackRating) || 0));
                  if (!feedbackTarget) return;
                  await feedbackService.addFeedback({
                    userId: user?.uid || 'unknown',
                    targetType: 'challenge',
                    targetId: feedbackTarget.id,
                    rating,
                    comment: feedbackComment,
                  });
                  feedbackSheetRef.current?.dismiss();
                  setFeedbackTarget(null);
                  setFeedbackRating(0);
                  setFeedbackComment('');
                  Toast.show({ type: 'success', text1: 'Thanks for your feedback!' });
                } catch (e) {
                  console.error('challenge feedback error:', e);
                  Toast.show({ type: 'error', text1: 'Failed to submit feedback' });
                }
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
    </SafeAreaView>
    </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eef2f7' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, color: '#111827', fontWeight: '700', fontSize: 16 },
  points: { flexDirection: 'row', alignItems: 'center' },
  pointsText: { marginLeft: 6, color: '#f59e0b', fontWeight: '700' },
  meta: { marginTop: 4, color: '#6b7280' },
  progressBarOuter: { marginTop: 10, backgroundColor: '#f3f4f6', borderRadius: 10, height: 24, justifyContent: 'center', overflow: 'hidden' },
  progressBarInner: { backgroundColor: '#10b981', height: '100%' },
  progressLabel: { position: 'absolute', width: '100%', textAlign: 'center', color: '#111827', fontWeight: '600' },
  actionsRow: { marginTop: 10, flexDirection: 'row' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#dbeafe' },
  actionText: { color: '#3b82f6', marginLeft: 6, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  secondaryText: { color: '#6b7280', marginLeft: 6, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalDesc: { marginTop: 6, color: '#6b7280' },
  modalActions: { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  attachText: { marginLeft: 6, color: '#6b7280' },
  submitBtn: { marginLeft: 'auto', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  submitText: { marginLeft: 6, color: '#ffffff', fontWeight: '700' },
});


