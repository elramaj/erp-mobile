import { CameraView } from "expo-camera";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import styles from "../../screens/GudangScreen.styles";

// Layar full-screen kamera buat scan barcode/QR code barang atau serial number.
export default function BarcodeScanner({
  visible,
  scanMode,
  snCount,
  onScan,
  onClose,
}) {
  // Jangan mount CameraView kalau modal lagi ditutup, biar kamera nggak
  // "dipegang" terus-terusan di background dan bentrok sama komponen kamera lain.
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={onScan}
          barcodeScannerSettings={{
            barcodeTypes: [
              "qr",
              "code128",
              "code39",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
            ],
          }}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.scanTopBar}>
              <Text style={styles.scanTitle}>
                {scanMode === "sn" ? "Scan Serial Number" : "Scan Kode Barang"}
              </Text>
              {scanMode === "sn" && (
                <Text style={styles.scanCounter}>{snCount} SN ditambahkan</Text>
              )}
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            <View>
              <Text style={styles.scanHint}>
                Arahkan kamera ke barcode atau QR code
              </Text>
              <TouchableOpacity style={styles.btnTutupScan} onPress={onClose}>
                <Text style={styles.btnTutupScanText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}