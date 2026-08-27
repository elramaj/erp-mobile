import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { TIPE_ABSENSI } from "../../constants/absensi";
import styles from "../../screens/AbsensiScreen.styles";

// Popup buat milih tipe absensi (Masuk Kantor / Visit / WFH).
export default function TipePickerModal({
  visible,
  tipeAbsensi,
  onSelect,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Pilih Tipe Absensi</Text>
          {TIPE_ABSENSI.map((t) => {
            const active = tipeAbsensi === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tipeItem,
                  { flexDirection: "row", alignItems: "center", gap: 10 },
                  active && styles.tipeItemActive,
                ]}
                onPress={() => onSelect(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={20}
                  color={active ? "white" : "#dc2626"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.tipeItemLabel,
                      active && { color: "white" },
                    ]}
                  >
                    {t.label}
                  </Text>
                  <Text
                    style={[
                      styles.tipeItemDesc,
                      active && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {t.desc}
                  </Text>
                </View>
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