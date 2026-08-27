import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

// Ngurusin semua hal terkait lampiran file: ambil dari kamera, galeri,
// atau dokumen PDF, plus hapus & format ukuran file.
export default function useAttachments() {
  const [attachments, setAttachments] = useState([]);

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Ditolak",
        "Izin kamera diperlukan untuk mengambil foto.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "image",
          uri: asset.uri,
          name: `foto_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        },
      ]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin Ditolak", "Izin galeri diperlukan untuk memilih foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random(),
        type: "image",
        uri: asset.uri,
        name: asset.fileName ?? `foto_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random(),
        type: "pdf",
        uri: asset.uri,
        name: asset.name,
        mimeType: "application/pdf",
        size: asset.size,
      }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (id) => {
    Alert.alert("Hapus File", "Yakin ingin menghapus file ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () =>
          setAttachments((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  const resetAttachments = () => setAttachments([]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return {
    attachments,
    pickFromCamera,
    pickFromGallery,
    pickDocument,
    removeAttachment,
    resetAttachments,
    formatFileSize,
  };
}