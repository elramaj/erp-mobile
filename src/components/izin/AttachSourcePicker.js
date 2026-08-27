import { Modal, Text, TouchableOpacity, View } from "react-native";
import styles from "../../screens/IzinScreen.styles";

export default function AttachSourcePicker({
  visible,
  onCamera,
  onGallery,
  onDocument,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Tambah Lampiran</Text>
          <TouchableOpacity style={styles.attachOptionBtn} onPress={onCamera}>
            <Text style={styles.attachOptionIcon}>📷</Text>
            <View>
              <Text style={styles.attachOptionLabel}>Ambil Foto</Text>
              <Text style={styles.attachOptionDesc}>
                Buka kamera untuk foto langsung
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachOptionBtn} onPress={onGallery}>
            <Text style={styles.attachOptionIcon}>🖼️</Text>
            <View>
              <Text style={styles.attachOptionLabel}>Pilih dari Galeri</Text>
              <Text style={styles.attachOptionDesc}>
                Pilih foto dari galeri HP
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachOptionBtn} onPress={onDocument}>
            <Text style={styles.attachOptionIcon}>📄</Text>
            <View>
              <Text style={styles.attachOptionLabel}>Pilih Dokumen PDF</Text>
              <Text style={styles.attachOptionDesc}>
                Upload surat dokter atau dokumen PDF
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnBatalModal} onPress={onClose}>
            <Text style={styles.btnBatalModalText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}