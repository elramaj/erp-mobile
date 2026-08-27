import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { Text, TouchableOpacity, View } from "react-native";
import styles from "../../screens/AbsensiScreen.styles";

// Layar full-screen buat ambil foto selfie check-in/check-out.
export default function CameraCapture({ mode, cameraRef, onCapture, onCancel }) {
  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front">
        <View style={styles.cameraOverlay}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Ionicons name="camera-outline" size={18} color="white" />
            <Text style={styles.cameraTitle}>
              {mode === "checkin" ? "Foto Check-In" : "Foto Check-Out"}
            </Text>
          </View>
          <View style={styles.faceGuide} />
          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.btnBatal} onPress={onCancel}>
              <Text style={styles.btnBatalText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnShutter} onPress={onCapture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 70 }} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}