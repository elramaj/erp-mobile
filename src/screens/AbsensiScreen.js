import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

const TIPE_ABSENSI = [
  {
    key: "masuk_kantor",
    label: "🏢 Masuk Kantor",
    desc: "Absen masuk di kantor",
  },
  { key: "visit", label: "🚗 Visit", desc: "Kunjungan ke lokasi" },
  { key: "wfh", label: "🏠 WFH", desc: "Kerja dari rumah" },
];

export default function AbsensiScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();
  const [absensi, setAbsensi] = useState(null);
  const [visitHariIni, setVisitHariIni] = useState([]);
  const [lokasiKantor, setLokasiKantor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [mode, setMode] = useState(null);
  const [foto, setFoto] = useState(null);
  const [lokasiValid, setLokasiValid] = useState(false);
  const [jarakMeter, setJarakMeter] = useState(null);
  const [koordinat, setKoordinat] = useState(null);
  const [tipeAbsensi, setTipeAbsensi] = useState("masuk_kantor");
  const [catatan, setCatatan] = useState("");
  const [namaTujuan, setNamaTujuan] = useState("");
  const [showTipePicker, setShowTipePicker] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    loadStatus();
    cekLokasi();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await api("/absensi/status");
      if (res.success) {
        setAbsensi(res.absensi);
        setVisitHariIni(res.visit_hari_ini ?? []);
        setLokasiKantor(res.lokasi_kantor);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal memuat data absensi!");
    } finally {
      setLoading(false);
    }
  };

  const hitungJarak = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const cekLokasi = async () => {
    if (!locationPermission?.granted) await requestLocationPermission();
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setKoordinat({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const res = await api("/absensi/status");
      if (res.lokasi_kantor) {
        const jarak = hitungJarak(
          loc.coords.latitude,
          loc.coords.longitude,
          res.lokasi_kantor.latitude,
          res.lokasi_kantor.longitude,
        );
        setJarakMeter(Math.round(jarak));
        setLokasiValid(jarak <= res.lokasi_kantor.radius_meter);
      }
    } catch (err) {
      console.log("GPS error:", err);
    }
  };

  // ✅ FIX: tambah parameter tipe
  const bukaKamera = async (modeAbsen, visitId = null, tipe = null) => {
    if (!permission?.granted) await requestPermission();
    setMode(modeAbsen);
    setSelectedVisitId(visitId);
    if (tipe !== null) setTipeAbsensi(tipe);
    setFoto(null);
    setShowCamera(true);
  };

  const ambilFoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      setFoto(photo);
      setShowCamera(false);
    } catch (err) {
      Alert.alert("Error", "Gagal mengambil foto!");
    }
  };

  const bukaPeta = () => {
    if (!koordinat) return;
    Linking.openURL(
      `https://www.google.com/maps?q=${koordinat.lat},${koordinat.lng}`,
    );
  };

  const bukaPetaKantor = () => {
    if (!lokasiKantor) return;
    Linking.openURL(
      `https://www.google.com/maps?q=${lokasiKantor.latitude},${lokasiKantor.longitude}`,
    );
  };

  const submitAbsensi = async () => {
    if (!foto) {
      Alert.alert("Error", "Foto selfie wajib diambil!");
      return;
    }
    if (tipeAbsensi === "visit" && mode === "checkin" && !namaTujuan.trim()) {
      Alert.alert("Error", "Nama tujuan visit wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const endpoint =
        mode === "checkin" ? "/absensi/checkin" : "/absensi/checkout";

      const payload = {
        foto: `data:image/jpeg;base64,${foto.base64}`,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        lokasi_valid: lokasiValid ? 1 : 0,
        tipe: tipeAbsensi,
        catatan: catatan,
        nama_tujuan: namaTujuan,
      };

      if (mode === "checkout" && selectedVisitId) {
        payload.visit_id = selectedVisitId;
      }

      const res = await api(endpoint, "POST", payload);

      if (res.success) {
        Alert.alert("✅ Berhasil!", res.message);
        setFoto(null);
        setMode(null);
        setCatatan("");
        setNamaTujuan("");
        setSelectedVisitId(null);
        setTipeAbsensi("masuk_kantor");
        loadStatus();
        cekLokasi();
      } else {
        Alert.alert("Gagal", res.message);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal menyimpan absensi!");
    } finally {
      setSubmitting(false);
    }
  };

  const getTipeLabel = (key) =>
    TIPE_ABSENSI.find((t) => t.key === key)?.label ?? key;

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={styles.loadingText}>Memuat data absensi...</Text>
      </View>
    );

  // Kamera
  if (showCamera)
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="front">
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraTitle}>
              {mode === "checkin" ? "📸 Foto Check-In" : "📸 Foto Check-Out"}
            </Text>
            <View style={styles.faceGuide} />
            <View style={styles.cameraButtons}>
              <TouchableOpacity
                style={styles.btnBatal}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.btnBatalText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnShutter} onPress={ambilFoto}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
              <View style={{ width: 70 }} />
            </View>
          </View>
        </CameraView>
      </View>
    );

  // Preview Foto + Form
  if (foto && mode)
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20 }}
      >
        <Text style={styles.sectionTitle}>
          {mode === "checkin"
            ? "✅ Konfirmasi Check-In"
            : "✅ Konfirmasi Check-Out"}
        </Text>

        <Image source={{ uri: foto.uri }} style={styles.previewFoto} />

        {/* Tipe absensi — hanya checkin non-visit */}
        {mode === "checkin" && tipeAbsensi !== "visit" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tipe Absensi *</Text>
            <TouchableOpacity
              style={styles.tipePicker}
              onPress={() => setShowTipePicker(true)}
            >
              <Text style={styles.tipePickerText}>
                {getTipeLabel(tipeAbsensi)}
              </Text>
              <Text style={styles.tipePickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Label visit */}
        {mode === "checkin" && tipeAbsensi === "visit" && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: "#f5f3ff",
                borderColor: "#c4b5fd",
                borderWidth: 1,
              },
            ]}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#7c3aed" }}>
              🚗 Visit Baru
            </Text>
          </View>
        )}

        {/* Nama tujuan visit */}
        {mode === "checkin" && tipeAbsensi === "visit" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Nama Tujuan Visit *</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Contoh: Dinas Pendidikan Kab. X"
              placeholderTextColor="#9ca3af"
              value={namaTujuan}
              onChangeText={setNamaTujuan}
            />
          </View>
        )}

        {/* Catatan */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Catatan (opsional)</Text>
          <TextInput
            style={[
              styles.inputField,
              { height: 80, textAlignVertical: "top" },
            ]}
            placeholder="Tambahkan catatan..."
            placeholderTextColor="#9ca3af"
            value={catatan}
            onChangeText={setCatatan}
            multiline
          />
        </View>

        {/* Status Lokasi */}
        <View
          style={[
            styles.lokasiCard,
            lokasiValid ? styles.lokasiValid : styles.lokasiInvalid,
          ]}
        >
          <Text style={styles.lokasiIcon}>{lokasiValid ? "📍" : "⚠️"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.lokasiTitle}>
              {lokasiValid ? "Dalam Area Kantor" : "Di Luar Area Kantor"}
            </Text>
            <Text style={styles.lokasiSub}>
              Jarak:{" "}
              {jarakMeter !== null ? `${jarakMeter} meter` : "Menghitung..."}
            </Text>
          </View>
          {koordinat && (
            <TouchableOpacity onPress={bukaPeta} style={styles.btnPeta}>
              <Text style={styles.btnPetaText}>🗺️ Peta</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.btnUlang}
            onPress={() => bukaKamera(mode, selectedVisitId, tipeAbsensi)}
          >
            <Text style={styles.btnUlangText}>🔄 Ulangi Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSubmit, submitting && styles.btnDisabled]}
            onPress={submitAbsensi}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnSubmitText}>
                {mode === "checkin"
                  ? "✅ Check-In Sekarang"
                  : "✅ Check-Out Sekarang"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal Pilih Tipe */}
        <Modal visible={showTipePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Pilih Tipe Absensi</Text>
              {TIPE_ABSENSI.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    styles.tipeItem,
                    tipeAbsensi === t.key && styles.tipeItemActive,
                  ]}
                  onPress={() => {
                    setTipeAbsensi(t.key);
                    setShowTipePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.tipeItemLabel,
                      tipeAbsensi === t.key && { color: "white" },
                    ]}
                  >
                    {t.label}
                  </Text>
                  <Text
                    style={[
                      styles.tipeItemDesc,
                      tipeAbsensi === t.key && {
                        color: "rgba(255,255,255,0.8)",
                      },
                    ]}
                  >
                    {t.desc}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.btnBatalModal}
                onPress={() => setShowTipePicker(false)}
              >
                <Text style={styles.btnBatalModalText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    );

  // Halaman Utama
  return (
    <ScrollView style={styles.container}>
      {/* Header Lokasi */}
      <TouchableOpacity
        style={[
          styles.lokasiHeader,
          lokasiValid ? styles.lokasiValid : styles.lokasiInvalid,
        ]}
        onPress={cekLokasi}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.lokasiHeaderText}>
            {lokasiValid ? "📍 Dalam Area Kantor" : "⚠️ Di Luar Area Kantor"}
          </Text>
          {jarakMeter !== null && (
            <Text style={styles.lokasiHeaderSub}>
              Jarak: {jarakMeter}m · Tap untuk refresh
            </Text>
          )}
        </View>
        <View style={{ gap: 6 }}>
          {koordinat && (
            <TouchableOpacity onPress={bukaPeta} style={styles.btnPetaKecil}>
              <Text style={styles.btnPetaKecilText}>📍 Lokasiku</Text>
            </TouchableOpacity>
          )}
          {lokasiKantor && (
            <TouchableOpacity
              onPress={bukaPetaKantor}
              style={[styles.btnPetaKecil, { backgroundColor: "#1d4ed8" }]}
            >
              <Text style={styles.btnPetaKecilText}>🏢 Kantor</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Status Absensi Utama */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📅 Absensi Hari Ini</Text>
        {absensi ? (
          <View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Tipe</Text>
              <Text style={styles.statusValue}>
                {getTipeLabel(absensi.tipe ?? "masuk_kantor")}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Jam Masuk</Text>
              <Text style={[styles.statusValue, { color: "#16a34a" }]}>
                {absensi.jam_masuk ?? "-"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Jam Keluar</Text>
              <Text style={[styles.statusValue, { color: "#dc2626" }]}>
                {absensi.jam_keluar ?? "Belum checkout"}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View
                style={[
                  styles.badge,
                  absensi.status === "hadir"
                    ? styles.badgeHadir
                    : absensi.status === "terlambat"
                      ? styles.badgeTerlambat
                      : styles.badgeDefault,
                ]}
              >
                <Text style={styles.badgeText}>
                  {absensi.status === "hadir"
                    ? "✅ Hadir"
                    : absensi.status === "terlambat"
                      ? "⏰ Terlambat"
                      : absensi.status}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.belumAbsen}>Belum absen hari ini</Text>
        )}
      </View>

      {/* Tombol Check-In / Check-Out Utama */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        {!absensi ? (
          // ✅ FIX: pass tipe langsung
          <TouchableOpacity
            style={styles.btnCheckin}
            onPress={() => bukaKamera("checkin", null, "masuk_kantor")}
          >
            <Text style={styles.btnCheckinText}>📸 Check-In Sekarang</Text>
            <Text style={styles.btnCheckinSub}>
              Ambil foto selfie untuk absen masuk
            </Text>
          </TouchableOpacity>
        ) : !absensi.jam_keluar ? (
          // ✅ FIX: pass tipe dari absensi
          <TouchableOpacity
            style={styles.btnCheckout}
            onPress={() => bukaKamera("checkout", null, absensi.tipe)}
          >
            <Text style={styles.btnCheckinText}>📸 Check-Out Sekarang</Text>
            <Text style={styles.btnCheckinSub}>
              Ambil foto selfie untuk absen pulang
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selesaiCard}>
            <Text style={styles.selesaiText}>✅ Absensi Selesai!</Text>
            <Text style={styles.selesaiSub}>Sampai jumpa besok 👋</Text>
          </View>
        )}
      </View>

      {/* Tombol Tambah Visit */}
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        {/* ✅ FIX: pass tipe "visit" langsung */}
        <TouchableOpacity
          style={styles.btnVisit}
          onPress={() => bukaKamera("checkin", null, "visit")}
        >
          <Text style={styles.btnVisitText}>🚗 + Tambah Visit Baru</Text>
          <Text style={styles.btnVisitSub}>
            {visitHariIni.length > 0
              ? `${visitHariIni.length} visit hari ini`
              : "Belum ada visit hari ini"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List Visit Hari Ini */}
      {visitHariIni.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            🚗 Visit Hari Ini ({visitHariIni.length}x)
          </Text>
          {visitHariIni.map((v, i) => (
            <View key={v.id} style={styles.visitItem}>
              <View style={styles.visitHeader}>
                <View style={styles.visitBadge}>
                  <Text style={styles.visitBadgeText}>#{v.urutan}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.visitNama}>
                    {v.nama_tujuan ?? "Visit"}
                  </Text>
                  <Text style={styles.visitWaktu}>
                    Masuk: {v.jam_masuk}
                    {v.jam_keluar ? `  ·  Keluar: ${v.jam_keluar}` : ""}
                  </Text>
                  {v.catatan ? (
                    <Text style={styles.visitCatatan}>{v.catatan}</Text>
                  ) : null}
                </View>
                {/* ✅ FIX: tombol checkout visit yang benar */}
                {!v.jam_keluar && (
                  <TouchableOpacity
                    style={styles.btnCheckoutVisit}
                    onPress={() => bukaKamera("checkout", v.id, "visit")}
                  >
                    <Text style={styles.btnCheckoutVisitText}>Checkout</Text>
                  </TouchableOpacity>
                )}
              </View>
              {i < visitHariIni.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: { marginTop: 12, color: "#6b7280", fontSize: 14 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
  },
  cameraTitle: {
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 10,
  },
  faceGuide: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "white",
    borderRadius: 100,
    alignSelf: "center",
    borderStyle: "dashed",
  },
  cameraButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnBatal: {
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 10,
    width: 70,
  },
  btnBatalText: { color: "white", textAlign: "center", fontWeight: "600" },
  btnShutter: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#dc2626",
  },
  lokasiHeader: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  lokasiValid: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  lokasiInvalid: { backgroundColor: "#fef2f2", borderColor: "#fca5a5" },
  lokasiHeaderText: { fontSize: 15, fontWeight: "700", color: "#111827" },
  lokasiHeaderSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnPetaKecil: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnPetaKecilText: { color: "white", fontSize: 11, fontWeight: "700" },
  card: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  statusLabel: { fontSize: 14, color: "#6b7280" },
  statusValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  badgeHadir: { backgroundColor: "#dcfce7" },
  badgeTerlambat: { backgroundColor: "#fef3c7" },
  badgeDefault: { backgroundColor: "#f3f4f6" },
  badgeText: { fontSize: 12, fontWeight: "600" },
  belumAbsen: {
    color: "#9ca3af",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  btnCheckin: {
    backgroundColor: "#dc2626",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnCheckout: {
    backgroundColor: "#0284c7",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnCheckinText: { color: "white", fontSize: 18, fontWeight: "800" },
  btnCheckinSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  selesaiCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  selesaiText: { fontSize: 18, fontWeight: "800", color: "#15803d" },
  selesaiSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  btnVisit: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnVisitText: { color: "white", fontSize: 16, fontWeight: "800" },
  btnVisitSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 4 },
  visitItem: { paddingVertical: 12 },
  visitHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  visitBadge: {
    backgroundColor: "#7c3aed",
    borderRadius: 999,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  visitBadgeText: { color: "white", fontSize: 12, fontWeight: "800" },
  visitNama: { fontSize: 14, fontWeight: "700", color: "#111827" },
  visitWaktu: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  visitCatatan: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    fontStyle: "italic",
  },
  btnCheckoutVisit: {
    backgroundColor: "#0284c7",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnCheckoutVisitText: { color: "white", fontSize: 11, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginTop: 8 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  previewFoto: {
    width: "100%",
    height: 260,
    borderRadius: 16,
    marginBottom: 16,
  },
  tipePicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#f9fafb",
  },
  tipePickerText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  tipePickerArrow: { color: "#9ca3af", fontSize: 12 },
  inputField: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  lokasiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  lokasiIcon: { fontSize: 24 },
  lokasiTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  lokasiSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnPeta: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  btnPetaText: { color: "white", fontSize: 12, fontWeight: "700" },
  actionButtons: { gap: 12 },
  btnUlang: {
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnUlangText: { color: "#dc2626", fontSize: 15, fontWeight: "700" },
  btnSubmit: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  btnSubmitText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    margin: 16,
    marginBottom: 32,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  tipeItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  tipeItemActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  tipeItemLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  tipeItemDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnBatalModal: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnBatalModalText: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
