import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

export default function GudangScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [tab, setTab] = useState("list");
  const [barang, setBarang] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState(null); // 'cari' | 'sn'
  const [scanResult, setScanResult] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [formMasuk, setFormMasuk] = useState({
    jumlah: "",
    keterangan: "",
    tanggal: new Date().toISOString().split("T")[0],
    serial_numbers: [],
  });
  const [formKeluar, setFormKeluar] = useState({
    jumlah: "",
    keterangan: "",
    tujuan: "",
    tanggal: new Date().toISOString().split("T")[0],
    serial_numbers: [],
  });
  const [snInput, setSnInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastScanned = useRef(null);

  useEffect(() => {
    loadBarang();
  }, []);

  const loadBarang = async () => {
    setLoading(true);
    try {
      const res = await api("/gudang");
      if (res.success) setBarang(res.data);
    } catch (err) {
      Alert.alert("Error", "Gagal memuat data barang!");
    } finally {
      setLoading(false);
    }
  };

  const bukaScanner = async (mode) => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Izin Kamera",
          "Akses kamera diperlukan untuk scan barcode!",
        );
        return;
      }
    }
    lastScanned.current = null;
    setScanning(false);
    setScanMode(mode);
    setShowScanModal(true);
  };

  const handleScan = async ({ data }) => {
    // Debounce — jangan scan berulang dalam 2 detik
    if (scanning || lastScanned.current === data) return;
    lastScanned.current = data;
    setScanning(true);

    if (scanMode === "sn") {
      // Mode scan SN — langsung tambah ke list tanpa tutup kamera
      const sudahAda = formMasuk.serial_numbers.includes(data);
      if (sudahAda) {
        Alert.alert("⚠️ Duplikat", `SN "${data}" sudah ada di list!`);
      } else {
        setFormMasuk((prev) => ({
          ...prev,
          serial_numbers: [...prev.serial_numbers, data],
        }));
        // Feedback singkat
        Alert.alert("✅ SN Ditambahkan", `${data}`, [
          {
            text: "Scan Lagi",
            onPress: () => {
              lastScanned.current = null;
              setScanning(false);
            },
          },
          {
            text: "Selesai",
            onPress: () => {
              setShowScanModal(false);
              setScanning(false);
            },
          },
        ]);
        return;
      }
    } else if (scanMode === "cari") {
      // Mode scan cari barang
      setShowScanModal(false);
      try {
        const res = await api(`/gudang/scan?kode=${encodeURIComponent(data)}`);
        setScanResult(res);
        setShowResultModal(true);
      } catch (err) {
        Alert.alert("Error", "Gagal memproses scan!");
      }
    }

    setTimeout(() => setScanning(false), 2000);
  };

  const tambahSNManual = () => {
    if (!snInput.trim()) return;
    if (formMasuk.serial_numbers.includes(snInput.trim())) {
      Alert.alert("⚠️ Duplikat", "SN ini sudah ada di list!");
      return;
    }
    setFormMasuk((prev) => ({
      ...prev,
      serial_numbers: [...prev.serial_numbers, snInput.trim()],
    }));
    setSnInput("");
  };

  const hapusSN = (index) => {
    setFormMasuk((prev) => ({
      ...prev,
      serial_numbers: prev.serial_numbers.filter((_, i) => i !== index),
    }));
  };

  const submitMasuk = async () => {
    if (!selectedBarang) {
      Alert.alert("Error", "Pilih barang dulu!");
      return;
    }
    if (!formMasuk.jumlah) {
      Alert.alert("Error", "Jumlah wajib diisi!");
      return;
    }
    if (
      selectedBarang.has_sn &&
      formMasuk.serial_numbers.length != formMasuk.jumlah
    ) {
      Alert.alert(
        "Error",
        `Jumlah SN (${formMasuk.serial_numbers.length}) harus sama dengan jumlah barang (${formMasuk.jumlah})!`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await api("/gudang/masuk", "POST", {
        barang_id: selectedBarang.id,
        jumlah: parseInt(formMasuk.jumlah),
        tanggal: formMasuk.tanggal,
        keterangan: formMasuk.keterangan,
        serial_numbers: formMasuk.serial_numbers,
      });

      if (res.success) {
        Alert.alert("✅ Berhasil!", res.message);
        setSelectedBarang(null);
        setFormMasuk({
          jumlah: "",
          keterangan: "",
          tanggal: new Date().toISOString().split("T")[0],
          serial_numbers: [],
        });
        setTab("list");
        loadBarang();
      } else {
        Alert.alert("Gagal", res.message);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal menyimpan stok masuk!");
    } finally {
      setSubmitting(false);
    }
  };

  const submitKeluar = async () => {
    if (!selectedBarang) {
      Alert.alert("Error", "Pilih barang dulu!");
      return;
    }
    if (!formKeluar.jumlah) {
      Alert.alert("Error", "Jumlah wajib diisi!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api("/gudang/keluar", "POST", {
        barang_id: selectedBarang.id,
        jumlah: parseInt(formKeluar.jumlah),
        tanggal: formKeluar.tanggal,
        tujuan: formKeluar.tujuan,
        keterangan: formKeluar.keterangan,
        serial_numbers: formKeluar.serial_numbers,
      });

      if (res.success) {
        Alert.alert("✅ Berhasil!", res.message);
        setSelectedBarang(null);
        setFormKeluar({
          jumlah: "",
          keterangan: "",
          tujuan: "",
          tanggal: new Date().toISOString().split("T")[0],
          serial_numbers: [],
        });
        setTab("list");
        loadBarang();
      } else {
        Alert.alert("Gagal", res.message);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal menyimpan stok keluar!");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBarang = barang.filter(
    (b) =>
      b.nama.toLowerCase().includes(search.toLowerCase()) ||
      b.kode.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Tab List ──────────────────────────────────────────
  const renderList = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, { flex: 1 }]}
          placeholder="🔍 Cari nama atau kode barang..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={styles.btnScanKecil}
          onPress={() => bukaScanner("cari")}
        >
          <Text style={styles.btnScanKecilText}>📷 Scan</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={filteredBarang}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.barangCard}>
              <View style={styles.barangInfo}>
                <Text style={styles.barangNama}>{item.nama}</Text>
                <Text style={styles.barangKode}>
                  {item.kode} · {item.kategori}
                </Text>
                {item.has_sn && (
                  <Text style={styles.snBadge}>🔢 Serial Number</Text>
                )}
              </View>
              <View style={styles.barangStok}>
                <Text
                  style={[
                    styles.stokAngka,
                    item.status_stok === "habis"
                      ? { color: "#dc2626" }
                      : item.status_stok === "menipis"
                        ? { color: "#d97706" }
                        : { color: "#16a34a" },
                  ]}
                >
                  {item.stok}
                </Text>
                <Text style={styles.stokSatuan}>{item.satuan}</Text>
                <View
                  style={[
                    styles.stokBadge,
                    item.status_stok === "habis"
                      ? styles.badgeHabis
                      : item.status_stok === "menipis"
                        ? styles.badgeMenipis
                        : styles.badgeAman,
                  ]}
                >
                  <Text style={styles.stokBadgeText}>
                    {item.status_stok === "habis"
                      ? "Habis"
                      : item.status_stok === "menipis"
                        ? "Menipis"
                        : "Aman"}
                  </Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Tidak ada barang ditemukan</Text>
          }
        />
      )}
    </View>
  );

  // ── Tab Stok Masuk ────────────────────────────────────
  const renderMasuk = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.formTitle}>📦 Catat Stok Masuk</Text>

      <Text style={styles.label}>Pilih Barang *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {barang.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[
              styles.barangChip,
              selectedBarang?.id === b.id && styles.barangChipActive,
            ]}
            onPress={() => {
              setSelectedBarang(b);
              setFormMasuk((prev) => ({ ...prev, serial_numbers: [] }));
            }}
          >
            <Text
              style={[
                styles.barangChipText,
                selectedBarang?.id === b.id && { color: "white" },
              ]}
            >
              {b.nama}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedBarang && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedNama}>{selectedBarang.nama}</Text>
          <Text style={styles.selectedInfo}>
            Stok saat ini: {selectedBarang.stok} {selectedBarang.satuan}
          </Text>
          {selectedBarang.has_sn && (
            <Text style={styles.snInfo}>
              🔢 Barang ini memerlukan Serial Number
            </Text>
          )}
        </View>
      )}

      <Text style={styles.label}>Jumlah *</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        value={formMasuk.jumlah}
        onChangeText={(v) => setFormMasuk((prev) => ({ ...prev, jumlah: v }))}
      />

      <Text style={styles.label}>Tanggal *</Text>
      <TextInput
        style={styles.input}
        value={formMasuk.tanggal}
        onChangeText={(v) => setFormMasuk((prev) => ({ ...prev, tanggal: v }))}
      />

      <Text style={styles.label}>Keterangan</Text>
      <TextInput
        style={styles.input}
        placeholder="Opsional..."
        placeholderTextColor="#9ca3af"
        value={formMasuk.keterangan}
        onChangeText={(v) =>
          setFormMasuk((prev) => ({ ...prev, keterangan: v }))
        }
      />

      {/* Input Serial Number */}
      {selectedBarang?.has_sn && (
        <View style={styles.snSection}>
          <View style={styles.snHeader}>
            <Text style={styles.label}>
              Serial Numbers ({formMasuk.serial_numbers.length}/
              {formMasuk.jumlah || 0})
            </Text>
            {/* Tombol Scan SN */}
            <TouchableOpacity
              style={styles.btnScanSN}
              onPress={() => bukaScanner("sn")}
            >
              <Text style={styles.btnScanSNText}>📷 Scan SN</Text>
            </TouchableOpacity>
          </View>

          {/* Input manual SN */}
          <View style={styles.snInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Ketik SN manual..."
              placeholderTextColor="#9ca3af"
              value={snInput}
              onChangeText={setSnInput}
              onSubmitEditing={tambahSNManual}
            />
            <TouchableOpacity
              style={styles.btnTambahSN}
              onPress={tambahSNManual}
            >
              <Text style={styles.btnTambahSNText}>+ Tambah</Text>
            </TouchableOpacity>
          </View>

          {/* List SN */}
          {formMasuk.serial_numbers.length > 0 && (
            <View style={styles.snList}>
              {formMasuk.serial_numbers.map((sn, i) => (
                <View key={i} style={styles.snItem}>
                  <Text style={styles.snNomor}>{i + 1}.</Text>
                  <Text style={styles.snText}>{sn}</Text>
                  <TouchableOpacity
                    onPress={() => hapusSN(i)}
                    style={styles.snHapus}
                  >
                    <Text style={{ color: "#dc2626", fontWeight: "700" }}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Progress bar */}
          {formMasuk.jumlah > 0 && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min((formMasuk.serial_numbers.length / parseInt(formMasuk.jumlah)) * 100, 100)}%`,
                    backgroundColor:
                      formMasuk.serial_numbers.length == formMasuk.jumlah
                        ? "#16a34a"
                        : "#dc2626",
                  },
                ]}
              />
              <Text style={styles.progressText}>
                {formMasuk.serial_numbers.length}/{formMasuk.jumlah} SN
                {formMasuk.serial_numbers.length == formMasuk.jumlah
                  ? " ✅"
                  : ""}
              </Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.btnSubmit, submitting && styles.btnDisabled]}
        onPress={submitMasuk}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnSubmitText}>💾 Simpan Stok Masuk</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Tab Stok Keluar ───────────────────────────────────
  const renderKeluar = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.formTitle}>📤 Catat Stok Keluar</Text>

      <Text style={styles.label}>Pilih Barang *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {barang.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[
              styles.barangChip,
              selectedBarang?.id === b.id && styles.barangChipActive,
            ]}
            onPress={() => setSelectedBarang(b)}
          >
            <Text
              style={[
                styles.barangChipText,
                selectedBarang?.id === b.id && { color: "white" },
              ]}
            >
              {b.nama}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedBarang && (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedNama}>{selectedBarang.nama}</Text>
          <Text style={styles.selectedInfo}>
            Stok tersedia: {selectedBarang.stok} {selectedBarang.satuan}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Jumlah *</Text>
      <TextInput
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#9ca3af"
        keyboardType="numeric"
        value={formKeluar.jumlah}
        onChangeText={(v) => setFormKeluar((prev) => ({ ...prev, jumlah: v }))}
      />

      <Text style={styles.label}>Tujuan</Text>
      <TextInput
        style={styles.input}
        placeholder="Tujuan pengiriman..."
        placeholderTextColor="#9ca3af"
        value={formKeluar.tujuan}
        onChangeText={(v) => setFormKeluar((prev) => ({ ...prev, tujuan: v }))}
      />

      <Text style={styles.label}>Tanggal *</Text>
      <TextInput
        style={styles.input}
        value={formKeluar.tanggal}
        onChangeText={(v) => setFormKeluar((prev) => ({ ...prev, tanggal: v }))}
      />

      <Text style={styles.label}>Keterangan</Text>
      <TextInput
        style={styles.input}
        placeholder="Opsional..."
        placeholderTextColor="#9ca3af"
        value={formKeluar.keterangan}
        onChangeText={(v) =>
          setFormKeluar((prev) => ({ ...prev, keterangan: v }))
        }
      />

      <TouchableOpacity
        style={[styles.btnSubmitKeluar, submitting && styles.btnDisabled]}
        onPress={submitKeluar}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnSubmitText}>💾 Simpan Stok Keluar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: "list", label: "📋 Stok" },
          { key: "masuk", label: "📦 Masuk" },
          { key: "keluar", label: "📤 Keluar" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabActive]}
            onPress={() => {
              setTab(t.key);
              setSelectedBarang(null);
            }}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "list" && renderList()}
      {tab === "masuk" && renderMasuk()}
      {tab === "keluar" && renderKeluar()}

      {/* Modal Scanner Kamera */}
      <Modal visible={showScanModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "black" }}>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={handleScan}
            barcodeScannerSettings={{
              barcodeTypes: ["qr", "code128", "code39", "ean13", "ean8"],
            }}
          >
            <View style={styles.scanOverlay}>
              <View style={styles.scanTopBar}>
                <Text style={styles.scanTitle}>
                  {scanMode === "sn"
                    ? "🔢 Scan Serial Number"
                    : "🔍 Scan Kode Barang"}
                </Text>
                {scanMode === "sn" && formMasuk.serial_numbers.length > 0 && (
                  <Text style={styles.scanCounter}>
                    {formMasuk.serial_numbers.length} SN terscan
                  </Text>
                )}
              </View>

              <View style={styles.scanFrame}>
                {/* Corner indicators */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
              </View>

              <Text style={styles.scanHint}>
                {scanMode === "sn"
                  ? "Arahkan ke barcode/QR pada barang"
                  : "Arahkan ke kode barang"}
              </Text>

              <TouchableOpacity
                style={styles.btnTutupScan}
                onPress={() => {
                  setShowScanModal(false);
                  setScanning(false);
                }}
              >
                <Text style={styles.btnTutupScanText}>
                  {scanMode === "sn" && formMasuk.serial_numbers.length > 0
                    ? `✅ Selesai (${formMasuk.serial_numbers.length} SN)`
                    : "✕ Tutup"}
                </Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Modal Hasil Scan Cari */}
      <Modal visible={showResultModal} transparent animationType="slide">
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
                      SN:{" "}
                      <Text style={styles.modalValue}>
                        {scanResult.data.sn}
                      </Text>
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
                      <Text style={styles.modalValue}>
                        {scanResult.data.kode}
                      </Text>
                    </Text>
                    <Text style={styles.modalItem}>
                      Nama:{" "}
                      <Text style={styles.modalValue}>
                        {scanResult.data.nama}
                      </Text>
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
            <TouchableOpacity
              style={styles.btnTutup}
              onPress={() => {
                setShowResultModal(false);
                setScanResult(null);
              }}
            >
              <Text style={styles.btnTutupText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Tab
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#dc2626" },
  tabText: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },
  tabTextActive: { color: "#dc2626" },

  // List
  searchRow: { flexDirection: "row", gap: 8, margin: 16, alignItems: "center" },
  searchInput: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "white",
    color: "#111827",
  },
  btnScanKecil: { backgroundColor: "#dc2626", borderRadius: 10, padding: 12 },
  btnScanKecilText: { color: "white", fontWeight: "700", fontSize: 13 },
  barangCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  barangInfo: { flex: 1 },
  barangNama: { fontSize: 15, fontWeight: "700", color: "#111827" },
  barangKode: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  snBadge: { fontSize: 11, color: "#7c3aed", marginTop: 4 },
  barangStok: { alignItems: "center" },
  stokAngka: { fontSize: 24, fontWeight: "800" },
  stokSatuan: { fontSize: 11, color: "#9ca3af" },
  stokBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  badgeAman: { backgroundColor: "#dcfce7" },
  badgeMenipis: { backgroundColor: "#fef3c7" },
  badgeHabis: { backgroundColor: "#fee2e2" },
  stokBadgeText: { fontSize: 10, fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 40 },

  // Form
  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 20,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "white",
    marginBottom: 16,
  },
  barangChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    backgroundColor: "white",
    marginRight: 8,
  },
  barangChipActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  barangChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  selectedCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  selectedNama: { fontSize: 16, fontWeight: "700", color: "#111827" },
  selectedInfo: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  snInfo: { fontSize: 12, color: "#d97706", marginTop: 6 },

  // SN Section
  snSection: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  snHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  btnScanSN: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  btnScanSNText: { color: "white", fontWeight: "700", fontSize: 13 },
  snInputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  btnTambahSN: {
    backgroundColor: "#374151",
    borderRadius: 10,
    padding: 14,
    justifyContent: "center",
  },
  btnTambahSNText: { color: "white", fontWeight: "700", fontSize: 13 },
  snList: { gap: 6, marginBottom: 12 },
  snItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  snNomor: {
    fontSize: 12,
    color: "#9ca3af",
    marginRight: 8,
    fontWeight: "700",
  },
  snText: { flex: 1, fontSize: 13, color: "#374151", fontWeight: "600" },
  snHapus: { paddingHorizontal: 8 },
  progressContainer: {
    backgroundColor: "#e5e7eb",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: { height: 6, borderRadius: 999 },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },

  // Scanner
  scanOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 60,
  },
  scanTopBar: { alignItems: "center", gap: 8 },
  scanTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    textAlign: "center",
  },
  scanCounter: {
    color: "white",
    fontSize: 13,
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: "700",
  },
  scanFrame: {
    width: 240,
    height: 240,
    alignSelf: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#dc2626",
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanHint: {
    color: "white",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 10,
  },
  btnTutupScan: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnTutupScanText: { color: "#111827", fontSize: 15, fontWeight: "700" },

  // Submit
  btnSubmit: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnSubmitKeluar: {
    backgroundColor: "#0284c7",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnSubmitText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },

  // Modal hasil scan
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  modalItem: { fontSize: 14, color: "#6b7280", marginBottom: 8 },
  modalValue: { fontWeight: "700", color: "#111827" },
  btnTutup: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  btnTutupText: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
