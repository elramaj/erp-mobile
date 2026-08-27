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
              <Text style={styles.modalTitle}>
                {scanResult.type === "serial_number"
                  ? "🔢 Serial Number!"
                  : "📦 Barang Ditemukan!"}
              </Text>
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
              <Text style={styles.modalTitle}>❌ Tidak Ditemukan</Text>
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