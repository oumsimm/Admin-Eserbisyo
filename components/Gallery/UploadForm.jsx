import React, { useState } from 'react';
import { View, Button, Image, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
// import { uploadImages } from '../../services/imageApi'; // To be implemented

const MAX_FILES = 10;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export default function UploadForm({ canUpload, onUploadComplete }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: MAX_FILES,
    });
    if (!result.canceled) {
      let files = result.assets || [];
      // Validate
      files = files.filter(f => ALLOWED_TYPES.includes(f.type) && f.fileSize / 1024 / 1024 <= MAX_SIZE_MB);
      setImages(files.slice(0, MAX_FILES));
    }
  };

  const compressImage = async (uri) => {
    return await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
  };

  const handleUpload = async () => {
    setUploading(true);
    setProgress(0);
    try {
      // Compress and upload each image
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const compressed = await compressImage(img.uri);
        // await uploadImages(compressed.uri, ...); // Implement uploadImages in imageApi.js
        setProgress((i + 1) / images.length);
      }
      setImages([]);
      onUploadComplete && onUploadComplete();
      Alert.alert('Upload Complete', 'Images uploaded successfully.');
    } catch (e) {
      Alert.alert('Upload Failed', 'Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!canUpload) return null;

  return (
    <View style={{ marginVertical: 16 }}>
      <Button title="Select Images" onPress={pickImages} disabled={uploading} />
      <FlatList
        data={images}
        horizontal
        keyExtractor={item => item.uri}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={{ width: 80, height: 80, margin: 4, borderRadius: 8 }} />
        )}
        style={{ marginVertical: 8 }}
      />
      {uploading && <ActivityIndicator size="small" color="#7c3aed" />}
      {images.length > 0 && !uploading && (
        <TouchableOpacity onPress={handleUpload} style={{ backgroundColor: '#7c3aed', padding: 12, borderRadius: 8, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Upload {images.length} Image(s)</Text>
        </TouchableOpacity>
      )}
      {progress > 0 && <Text>Uploading: {Math.round(progress * 100)}%</Text>}
    </View>
  );
}
