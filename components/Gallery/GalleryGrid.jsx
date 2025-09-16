import React, { useState } from 'react';
import { View, Image, TouchableOpacity, FlatList, Modal, Text, StyleSheet } from 'react-native';
// import { fetchGalleryImages } from '../../services/imageApi'; // To be implemented

export default function GalleryGrid({ images }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  const openModal = (img) => {
    setSelectedImage(img);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  return (
    <View style={{ marginVertical: 16 }}>
      <FlatList
        data={images}
        numColumns={3}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openModal(item)} style={styles.thumbWrap} accessibilityLabel={item.alt || 'Event photo'}>
            <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.thumb} />
          </TouchableOpacity>
        )}
        style={{ marginBottom: 8 }}
      />
      <Modal visible={modalVisible} transparent onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {selectedImage && (
              <Image source={{ uri: selectedImage.url }} style={styles.fullImage} accessibilityLabel={selectedImage.alt || 'Event photo'} />
            )}
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}><Text style={{ color: '#fff' }}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbWrap: { flex: 1 / 3, aspectRatio: 1, margin: 2, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: 100, resizeMode: 'cover' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#222', borderRadius: 12, padding: 16, alignItems: 'center' },
  fullImage: { width: 300, height: 300, borderRadius: 8, marginBottom: 12 },
  closeBtn: { backgroundColor: '#7c3aed', padding: 10, borderRadius: 8, marginTop: 8 },
});
