import { Modal, Text, TouchableOpacity, View } from "react-native";
import { JENIS_IZIN } from "../../constants/izin";
import styles from "../../screens/IzinScreen.styles";

export default function JenisIzinPicker({ visible, jenis, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Pilih Jenis Pengajuan</Text>
          {JENIS_IZIN.map((j) => (
            <TouchableOpacity
              key={j.key}
              style={[
                styles.jenisItem,
                jenis === j.key && styles.jenisItemActive,
              ]}
              onPress={() => onSelect(j.key)}
            >
              <Text
                style={[
                  styles.jenisItemLabel,
                  jenis === j.key && { color: "white" },
                ]}
              >
                {j.label}
              </Text>
              <Text
                style={[
                  styles.jenisItemDesc,
                  jenis === j.key && { color: "rgba(255,255,255,0.8)" },
                ]}
              >
                {j.desc}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.btnBatalModal} onPress={onClose}>
            <Text style={styles.btnBatalModalText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}