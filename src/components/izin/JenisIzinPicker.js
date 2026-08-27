import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { JENIS_IZIN } from "../../constants/izin";
import styles from "../../screens/IzinScreen.styles";

export default function JenisIzinPicker({ visible, jenis, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Pilih Jenis Pengajuan</Text>
          {JENIS_IZIN.map((j) => {
            const active = jenis === j.key;
            return (
              <TouchableOpacity
                key={j.key}
                style={[
                  styles.jenisItem,
                  { flexDirection: "row", alignItems: "center", gap: 12 },
                  active && styles.jenisItemActive,
                ]}
                onPress={() => onSelect(j.key)}
              >
                <View
                  style={[
                    styles.jenisItemIconWrap,
                    active && { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons
                    name={j.icon}
                    size={18}
                    color={active ? "white" : "#dc2626"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.jenisItemLabel,
                      active && { color: "white" },
                    ]}
                  >
                    {j.label}
                  </Text>
                  <Text
                    style={[
                      styles.jenisItemDesc,
                      active && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {j.desc}
                  </Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={18} color="white" />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.btnBatalModal} onPress={onClose}>
            <Text style={styles.btnBatalModalText}>Batal</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}