import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import styles from "../../screens/GudangScreen.styles";

// Popup yang muncul setelah scan mode "cari barang" — nunjukin detail
// barang atau serial number yang ketemu, atau pesan kalau nggak ketemu.
export default function ScanResultModal({ visible, scanResult, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {scanResult?.success ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons
                  name={
                    scanResult.type === "serial_number"
                      ? "barcode-outline"
                      : "cube-outline"
                  }
                  size={22}
                  color="#16a34a"
                />
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                  {scanResult.type === "serial_number"
                    ? "Serial Number!"
                    : "Barang Ditemukan!"}
                </Text>
              </View>
              {scanResult.type === "serial_number" ? (
                <View>
                  <Text style={styles.modalItem}>
                    SN: <Text style={styles.modalValue}>{scanResult.data.sn}</Text>
                  </Text>
                  <Text style={styles.modalItem}>
                    Barang:{" "}
                    <Text style={styles.modalValue}>
                      {scanResult.data.nama_barang}
                    </Text>
                  </Text>
                  <Text style={styles.modalItem}>
                    Status:{" "}
                    <Text
                      style={[
                        styles.modalValue,
                        {
                          color:
                            scanResult.data.status === "tersedia"
                              ? "#16a34a"
                              : "#dc2626",
                        },
                      ]}
                    >
                      {scanResult.data.status}
                    </Text>
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.modalItem}>
                    Kode:{" "}
                    <Text style={styles.modalValue}>{scanResult.data.kode}</Text>
                  </Text>
                  <Text style={styles.modalItem}>
                    Nama:{" "}
                    <Text style={styles.modalValue}>{scanResult.data.nama}</Text>
                  </Text>
                  <Text style={styles.modalItem}>
                    Stok:{" "}
                    <Text style={styles.modalValue}>
                      {scanResult.data.stok} {scanResult.data.satuan}
                    </Text>
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Ionicons name="close-circle" size={22} color="#dc2626" />
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Tidak Ditemukan</Text>
              </View>
              <Text style={styles.modalItem}>{scanResult?.message}</Text>
            </>
          )}
          <TouchableOpacity style={styles.btnTutup} onPress={onClose}>
            <Text style={styles.btnTutupText}>Tutup</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}