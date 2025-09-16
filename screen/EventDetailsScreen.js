import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Linking, Image, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';
import { db } from '../config/firebaseConfig';
import { collection, onSnapshot, query, serverTimestamp, doc, setDoc } from 'firebase/firestore';

// This screen expects route.params.event with { id, title, date, time, location, points, participants, maxParticipants }
export default function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const { user, userData, getUserDisplayName, joinEvent } = useUser();
  const [rsvp, setRsvp] = useState(null); // 'going' | 'interested' | 'waitlist'
  const [participants, setParticipants] = useState(event.participants || 0);
  const atCapacity = participants >= (event.maxParticipants || 0);
  const [isJoining, setIsJoining] = useState(false);
  const isJoined = useMemo(() => (userData?.joinedEvents || []).some(e => (e.id || e.eventId) === event.id), [userData, event.id]);
  const [attendees, setAttendees] = useState([]);

  const getInitials = (fullName) => {
    const name = String(fullName || '').trim();
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const handleRSVP = (type) => {
    if (type === 'going') {
      if (atCapacity) {
        setRsvp('waitlist');
        Alert.alert('Waitlist', 'Event is at capacity. You are on the waitlist.');
      } else {
        setRsvp('going');
        setParticipants(p => p + 1);
      }
    } else {
      setRsvp(type);
    }
  };

  const addToCalendar = async () => {
    // Fallback: open Google Calendar template (no extra dependency required)
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&details=${encodeURIComponent('Added from app')}&location=${encodeURIComponent(event.location || '')}&dates=${fmt(startDate)}/${fmt(endDate)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('Calendar', 'Unable to open calendar link.');
  };

  // Join handler
  const handleJoin = async () => {
    if (isJoined) return;
    if (atCapacity) {
      Alert.alert('Event Full', 'This event has reached maximum capacity.');
      return;
    }
    try {
      setIsJoining(true);
      const result = await joinEvent(event);
      if (result.success) {
        setParticipants(p => p + 1);
        Alert.alert('Joined', `You have joined ${event.title}.`);
      } else {
        Alert.alert('Join Failed', result.message || 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Join Failed', 'Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Presence was causing non-joined users to appear. Disable heartbeat and presence list unless needed later.

  // Subscribe to attendees list for this event (who joined)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events', event.id, 'attendees'), (snap) => {
      const list = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({ id: data.userId || d.id, name: data.name || 'User', avatarUrl: data.avatarUrl || '' });
      });
      // Sort by name for stable order
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAttendees(list);
    });
    return () => unsub();
  }, [event.id]);

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text || !canChat()) return;
    try {
      await addDoc(collection(db, 'events', event.id, 'chat'), {
        eventId: event.id,
        senderId: user.uid,
        senderName: getUserDisplayName(),
        text,
        type: 'text',
        createdAt: serverTimestamp(),
        readBy: [user.uid],
        system: false,
        deleted: false,
      });
      setChatInput('');
    } catch (e) {
      Alert.alert('Message failed', 'Could not send message. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 60 }}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color="#111827" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Ionicons name="heart-outline" size={18} color="#111827" />
        </View>

        {event.imageUrl && (
          <Image source={{ uri: event.imageUrl }} style={styles.coverImage} />
        )}

        <Text style={styles.title}>{event.title}</Text>
        {!!event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={18} color="#6b7280" />
          <Text style={styles.metaText}>{event.date} • {event.time}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={18} color="#6b7280" />
          <Text style={styles.metaText}>{event.location}</Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, (isJoined || atCapacity || isJoining) && { opacity: 0.7 }]}
          onPress={handleJoin}
          disabled={isJoined || atCapacity || isJoining}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>{isJoined ? 'Joined' : atCapacity ? 'Full' : isJoining ? 'Joining…' : 'Join Now'}</Text>
          </TouchableOpacity>

        <Text style={styles.sectionTitle}>Attendees ({attendees.length})</Text>
        <View style={styles.attendeesWrap}>
          {attendees.length === 0 ? (
            <Text style={{ color: '#9ca3af' }}>No one has joined yet</Text>
          ) : (
            attendees.map((u) => (
              <View key={u.id} style={styles.attendeeItem}>
                {u.avatarUrl ? (
                  <Image source={{ uri: u.avatarUrl }} style={styles.attendeeImage} />
                ) : (
                  <View style={styles.attendeeAvatar}><Text style={styles.attendeeInitials}>{getInitials(u.name)}</Text></View>
                )}
                <Text style={styles.attendeeName} numberOfLines={1}>{u.name}</Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { marginTop: 8 }]}
          onPress={async () => {
            try {
              await Share.share({ message: `${event.title}\n${event.date} • ${event.time}\n${event.location}` });
            } catch {}
          }}
        >
          <Text style={styles.ctaText}>Share Event</Text>
              </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerImage: { width: '100%', height: 200, backgroundColor: '#e5e7eb' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: 4, color: '#111827', fontWeight: '600' },
  coverImage: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  description: { marginTop: 6, color: '#6b7280', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { marginLeft: 6, color: '#6b7280' },
  ctaButton: { marginTop: 14, backgroundColor: '#7c3aed', paddingVertical: 12, borderRadius: 999, alignItems: 'center' },
  ctaText: { color: '#ffffff', fontWeight: '700' },
  attendeesWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  attendeeItem: { width: 64, alignItems: 'center', marginRight: 10, marginBottom: 10 },
  attendeeImage: { width: 40, height: 40, borderRadius: 20, marginBottom: 4 },
  attendeeAvatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 4, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  attendeeInitials: { color: '#111827', fontWeight: '700' },
  attendeeName: { fontSize: 10, color: '#374151', maxWidth: 64, textAlign: 'center' },
  rsvpRow: { flexDirection: 'row', marginTop: 12 },
  rsvpBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dbeafe', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  rsvpActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  rsvpText: { marginLeft: 6, color: '#3b82f6', fontWeight: '700' },
  rsvpTextActive: { color: '#ffffff' },
  actionsRow: { flexDirection: 'row', marginTop: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, marginRight: 8 },
  primaryText: { marginLeft: 6, color: '#ffffff', fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  secondaryText: { marginLeft: 6, color: '#111827', fontWeight: '700' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#dbeafe', flex: 1, justifyContent: 'center' },
  qrText: { marginLeft: 6, color: '#3b82f6', fontWeight: '700' },
  sectionTitle: { marginTop: 20, fontSize: 18, fontWeight: '800', color: '#111827' },
  chatBox: { marginTop: 8, backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eef2f7' },
  msgRow: { marginBottom: 6 },
  msgSender: { fontWeight: '700', color: '#111827' },
  msgText: { color: '#374151' },
  msgComposer: { flexDirection: 'row', marginTop: 8 },
  msgInput: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  msgSend: { marginLeft: 8, backgroundColor: '#3b82f6', paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  photoStub: { width: 120, height: 100, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff', borderRadius: 8, marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalDesc: { color: '#6b7280', marginTop: 6 },
  modalActions: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  submitBtn: { backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  submitText: { marginLeft: 6, color: '#ffffff', fontWeight: '700' },
  dismissBtn: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 8 },
  dismissText: { color: '#6b7280', fontWeight: '700' },
  // QR Modal Styles
  qrModalCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, width: '90%', maxHeight: '80%' },
  qrModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  qrModalFooter: { marginTop: 16 },
  qrModalText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});






