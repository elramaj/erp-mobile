import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BarcodeScanner from "../components/gudang/BarcodeScanner";
import ScanResultModal from "../components/gudang/ScanResultModal";
import TambahBarangModal from "../components/gudang/TambahBarangModal";
import api from "../services/api";
import styles from "./GudangScreen.styles";

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
  const [showTambahBarang, setShowTambahBarang] = useState(false);
  const [lastScanKode, setLastScanKode] = useState("");
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
        Alert.alert("Duplikat", `SN "${data}" sudah ada di list!`);
      } else {
        setFormMasuk((prev) => ({
          ...prev,
          serial_numbers: [...prev.serial_numbers, data],
        }));
        // Feedback singkat
        Alert.alert("SN Ditambahkan", `${data}`, [
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
      setLastScanKode(data);
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
      Alert.alert("Duplikat", "SN ini sudah ada di list!");
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
        Alert.alert("Berhasil!", res.message);
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
        Alert.alert("Berhasil!", res.message);
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
        <View
          style={[
            styles.searchInput,
            {
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingLeft: 10,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            style={{ flex: 1, paddingVertical: 0 }}
            placeholder="Cari nama atau kode barang..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.btnScanKecil,
            { flexDirection: "row", alignItems: "center", gap: 4 },
          ]}
          onPress={() => bukaScanner("cari")}
        >
          <Ionicons name="camera-outline" size={16} color="white" />
          <Text style={styles.btnScanKecilText}>Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btnScanKecil,
            { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#16a34a" },
          ]}
          onPress={() => {
            setLastScanKode("");
            setShowTambahBarang(true);
          }}
        >
          <Ionicons name="add" size={16} color="white" />
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
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons
                      name="barcode-outline"
                      size={12}
                      color="#7c3aed"
                    />
                    <Text style={styles.snBadge}>Serial Number</Text>
                  </View>
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Ionicons name="archive-outline" size={20} color="#111827" />
        <Text style={[styles.formTitle, { marginBottom: 0 }]}>Catat Stok Masuk</Text>
      </View>

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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="barcode-outline" size={13} color="#d97706" />
              <Text style={styles.snInfo}>
                Barang ini memerlukan Serial Number
              </Text>
            </View>
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
              style={[
                styles.btnScanSN,
                { flexDirection: "row", alignItems: "center", gap: 4 },
              ]}
              onPress={() => bukaScanner("sn")}
            >
              <Ionicons name="camera-outline" size={14} color="white" />
              <Text style={styles.btnScanSNText}>Scan SN</Text>
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
                    <Ionicons name="close" size={16} color="#dc2626" />
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={styles.progressText}>
                  {formMasuk.serial_numbers.length}/{formMasuk.jumlah} SN
                </Text>
                {formMasuk.serial_numbers.length == formMasuk.jumlah && (
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                )}
              </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="save-outline" size={16} color="white" />
            <Text style={styles.btnSubmitText}>Simpan Stok Masuk</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Tab Stok Keluar ───────────────────────────────────
  const renderKeluar = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Ionicons name="arrow-redo-outline" size={20} color="#111827" />
        <Text style={[styles.formTitle, { marginBottom: 0 }]}>Catat Stok Keluar</Text>
      </View>

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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="save-outline" size={16} color="white" />
            <Text style={styles.btnSubmitText}>Simpan Stok Keluar</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { key: "list", label: "Stok", icon: "cube-outline" },
          { key: "masuk", label: "Masuk", icon: "arrow-down-circle-outline" },
          { key: "keluar", label: "Keluar", icon: "arrow-up-circle-outline" },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tabItem,
              { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
              tab === t.key && styles.tabActive,
            ]}
            onPress={() => {
              setTab(t.key);
              setSelectedBarang(null);
            }}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.key ? "#dc2626" : "#6b7280"}
            />
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
      <BarcodeScanner
        visible={showScanModal}
        scanMode={scanMode}
        snCount={formMasuk.serial_numbers.length}
        onScan={handleScan}
        onClose={() => {
          setShowScanModal(false);
          setScanning(false);
        }}
      />

      {/* Modal Hasil Scan Cari */}
      <ScanResultModal
        visible={showResultModal}
        scanResult={scanResult}
        onClose={() => {
          setShowResultModal(false);
          setScanResult(null);
        }}
        onAddNew={() => {
          setShowResultModal(false);
          setShowTambahBarang(true);
        }}
      />

      {/* Modal Tambah Barang Baru */}
      <TambahBarangModal
        visible={showTambahBarang}
        kodeAwal={lastScanKode}
        onClose={() => setShowTambahBarang(false)}
        onSuccess={(barangBaru) => {
          setShowTambahBarang(false);
          setScanResult(null);
          loadBarang();
          Alert.alert("Berhasil!", `${barangBaru.nama} udah terdaftar di gudang.`);
        }}
      />
    </View>
  );
}