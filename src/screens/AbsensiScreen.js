import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CameraCapture from "../components/absensi/CameraCapture";
import TipePickerModal from "../components/absensi/TipePickerModal";
import { getTipeIcon, getTipeLabel } from "../constants/absensi";
import useLokasiAbsensi from "../hooks/useLokasiAbsensi";
import api from "../services/api";
import styles from "./AbsensiScreen.styles";

export default function AbsensiScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { koordinat, lokasiValid, jarakMeter, cekLokasi, bukaPeta } =
    useLokasiAbsensi();
  const [absensi, setAbsensi] = useState(null);
  const [visitHariIni, setVisitHariIni] = useState([]);
  const [lokasiKantor, setLokasiKantor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [mode, setMode] = useState(null);
  const [foto, setFoto] = useState(null);
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
        Alert.alert("Berhasil!", res.message);
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
      <CameraCapture
        mode={mode}
        cameraRef={cameraRef}
        onCapture={ambilFoto}
        onCancel={() => setShowCamera(false)}
      />
    );

  // Preview Foto + Form
  if (foto && mode)
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: 20 }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Ionicons name="checkmark-circle" size={22} color="#111827" />
          <Text style={styles.sectionTitle}>
            {mode === "checkin" ? "Konfirmasi Check-In" : "Konfirmasi Check-Out"}
          </Text>
        </View>

        <Image source={{ uri: foto.uri }} style={styles.previewFoto} />

        {/* Tipe absensi — hanya checkin non-visit */}
        {mode === "checkin" && tipeAbsensi !== "visit" && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Tipe Absensi *</Text>
            <TouchableOpacity
              style={[
                styles.tipePicker,
                { flexDirection: "row", alignItems: "center", gap: 8 },
              ]}
              onPress={() => setShowTipePicker(true)}
            >
              <Ionicons
                name={getTipeIcon(tipeAbsensi)}
                size={18}
                color="#dc2626"
              />
              <Text style={[styles.tipePickerText, { flex: 1 }]}>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="car" size={18} color="#7c3aed" />
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#7c3aed" }}>
                Visit Baru
              </Text>
            </View>
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
          <Ionicons
            name={lokasiValid ? "location" : "warning"}
            size={24}
            color={lokasiValid ? "#16a34a" : "#dc2626"}
          />
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
            <TouchableOpacity onPress={bukaPeta} style={[styles.btnPeta, { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "center" }]}>
              <Ionicons name="map" size={14} color="white" />
              <Text style={styles.btnPetaText}>Peta</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btnUlang, { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
            onPress={() => bukaKamera(mode, selectedVisitId, tipeAbsensi)}
          >
            <Ionicons name="camera-reverse" size={18} color="#dc2626" />
            <Text style={styles.btnUlangText}>Ulangi Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSubmit, submitting && styles.btnDisabled]}
            onPress={submitAbsensi}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.btnSubmitText}>
                  {mode === "checkin" ? "Check-In Sekarang" : "Check-Out Sekarang"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal Pilih Tipe */}
        <TipePickerModal
          visible={showTipePicker}
          tipeAbsensi={tipeAbsensi}
          onSelect={(key) => {
            setTipeAbsensi(key);
            setShowTipePicker(false);
          }}
          onClose={() => setShowTipePicker(false)}
        />
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={lokasiValid ? "location" : "warning"}
              size={16}
              color={lokasiValid ? "#16a34a" : "#dc2626"}
            />
            <Text style={styles.lokasiHeaderText}>
              {lokasiValid ? "Dalam Area Kantor" : "Di Luar Area Kantor"}
            </Text>
          </View>
          {jarakMeter !== null && (
            <Text style={styles.lokasiHeaderSub}>
              Jarak: {jarakMeter}m · Tap untuk refresh
            </Text>
          )}
        </View>
        <View style={{ gap: 6 }}>
          {koordinat && (
            <TouchableOpacity onPress={bukaPeta} style={[styles.btnPetaKecil, { flexDirection: "row", alignItems: "center", gap: 4 }]}>
              <Ionicons name="navigate" size={12} color="white" />
              <Text style={styles.btnPetaKecilText}>Lokasiku</Text>
            </TouchableOpacity>
          )}
          {lokasiKantor && (
            <TouchableOpacity
              onPress={bukaPetaKantor}
              style={[styles.btnPetaKecil, { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#1d4ed8" }]}
            >
              <Ionicons name="business" size={12} color="white" />
              <Text style={styles.btnPetaKecilText}>Kantor</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Status Absensi Utama */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Ionicons name="calendar" size={18} color="#111827" />
          <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Absensi Hari Ini</Text>
        </View>
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
                <Ionicons
                  name={
                    absensi.status === "hadir"
                      ? "checkmark-circle"
                      : absensi.status === "terlambat"
                        ? "time"
                        : "ellipse"
                  }
                  size={13}
                  color={
                    absensi.status === "hadir"
                      ? "#15803d"
                      : absensi.status === "terlambat"
                        ? "#b45309"
                        : "#6b7280"
                  }
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.badgeText}>
                  {absensi.status === "hadir"
                    ? "Hadir"
                    : absensi.status === "terlambat"
                      ? "Terlambat"
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.btnCheckinText}>Check-In Sekarang</Text>
            </View>
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.btnCheckinText}>Check-Out Sekarang</Text>
            </View>
            <Text style={styles.btnCheckinSub}>
              Ambil foto selfie untuk absen pulang
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.selesaiCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Ionicons name="checkmark-circle" size={20} color="#15803d" />
              <Text style={styles.selesaiText}>Absensi Selesai!</Text>
            </View>
            <Text style={styles.selesaiSub}>Sampai jumpa besok</Text>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="car" size={18} color="white" />
            <Text style={styles.btnVisitText}>+ Tambah Visit Baru</Text>
          </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Ionicons name="car" size={18} color="#111827" />
            <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
              Visit Hari Ini ({visitHariIni.length}x)
            </Text>
          </View>
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