import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

const JENIS_IZIN = [
  { key: "izin", label: "📋 Izin", desc: "Izin tidak masuk kerja" },
  { key: "sakit", label: "🏥 Sakit", desc: "Tidak masuk karena sakit" },
  { key: "cuti", label: "🌴 Cuti", desc: "Cuti tahunan" },
  {
    key: "dinas_luar",
    label: "✈️ Dinas Luar",
    desc: "Tugas ke luar kota/kantor",
  },
];

const STATUS_COLOR = {
  pending: { bg: "#fef3c7", text: "#92400e", label: "⏳ Menunggu" },
  disetujui: { bg: "#dcfce7", text: "#14532d", label: "✅ Disetujui" },
  ditolak: { bg: "#fee2e2", text: "#991b1b", label: "❌ Ditolak" },
};

export default function IzinScreen() {
  const [tab, setTab] = useState("riwayat");
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showJenisPicker, setShowJenisPicker] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    jenis: "izin",
    tanggal_mulai: new Date().toISOString().split("T")[0],
    tanggal_selesai: new Date().toISOString().split("T")[0],
    alasan: "",
  });

  useEffect(() => {
    loadRiwayat();
  }, []);

  const loadRiwayat = async () => {
    setLoading(true);
    try {
      const res = await api("/izin");
      if (res.success) setRiwayat(res.data);
    } catch (err) {
      Alert.alert("Error", "Gagal memuat riwayat izin!");
    } finally {
      setLoading(false);
    }
  };

  // ─── Attachment Handlers ───────────────────────────────────────────────────

  const pickFromCamera = async () => {
    setShowAttachPicker(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin Ditolak",
        "Izin kamera diperlukan untuk mengambil foto.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "image",
          uri: asset.uri,
          name: `foto_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        },
      ]);
    }
  };

  const pickFromGallery = async () => {
    setShowAttachPicker(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Izin Ditolak", "Izin galeri diperlukan untuk memilih foto.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random(),
        type: "image",
        uri: asset.uri,
        name: asset.fileName ?? `foto_${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? "image/jpeg",
      }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const pickDocument = async () => {
    setShowAttachPicker(false);
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      const newFiles = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random(),
        type: "pdf",
        uri: asset.uri,
        name: asset.name,
        mimeType: "application/pdf",
        size: asset.size,
      }));
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (id) => {
    Alert.alert("Hapus File", "Yakin ingin menghapus file ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () =>
          setAttachments((prev) => prev.filter((a) => a.id !== id)),
      },
    ]);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const submitIzin = async () => {
    if (!form.alasan.trim()) {
      Alert.alert("Error", "Alasan wajib diisi!");
      return;
    }
    if (form.tanggal_selesai < form.tanggal_mulai) {
      Alert.alert(
        "Error",
        "Tanggal selesai tidak boleh sebelum tanggal mulai!",
      );
      return;
    }
    if (form.jenis === "sakit" && attachments.length === 0) {
      Alert.alert(
        "Lampiran Wajib",
        "Izin sakit wajib melampirkan surat dokter atau foto bukti.",
      );
      return;
    }

    setSubmitting(true);
    try {
      // Kirim pakai FormData supaya bisa upload file
      const formData = new FormData();
      formData.append("jenis", form.jenis);
      formData.append("tanggal_mulai", form.tanggal_mulai);
      formData.append("tanggal_selesai", form.tanggal_selesai);
      formData.append("alasan", form.alasan);

      attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });
      });

      const res = await api("/izin", "POST", formData, true); // true = multipart
      if (res.success) {
        Alert.alert("✅ Berhasil!", res.message, [
          {
            text: "OK",
            onPress: () => {
              setTab("riwayat");
              setAttachments([]);
              setForm({
                jenis: "izin",
                tanggal_mulai: new Date().toISOString().split("T")[0],
                tanggal_selesai: new Date().toISOString().split("T")[0],
                alasan: "",
              });
              loadRiwayat();
            },
          },
        ]);
      } else {
        Alert.alert("Gagal", res.message);
      }
    } catch (err) {
      Alert.alert("Error", "Gagal mengirim pengajuan izin!");
    } finally {
      setSubmitting(false);
    }
  };

  const getJenisLabel = (key) =>
    JENIS_IZIN.find((j) => j.key === key)?.label ?? key;

  // ─── Render Riwayat ────────────────────────────────────────────────────────

  const renderRiwayat = () => (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      ) : (
        <FlatList
          data={riwayat}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            const statusInfo =
              STATUS_COLOR[item.status] ?? STATUS_COLOR.pending;
            return (
              <View style={styles.izinCard}>
                <View style={styles.izinHeader}>
                  <Text style={styles.izinJenis}>
                    {getJenisLabel(item.jenis)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: statusInfo.text }]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.izinTanggal}>
                  <Text style={styles.izinTanggalText}>
                    📅 {item.tanggal_mulai}
                    {item.tanggal_mulai !== item.tanggal_selesai
                      ? ` s/d ${item.tanggal_selesai}`
                      : ""}
                  </Text>
                </View>
                <Text style={styles.izinAlasan} numberOfLines={2}>
                  {item.alasan}
                </Text>
                {item.attachments?.length > 0 && (
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentInfoText}>
                      📎 {item.attachments.length} lampiran
                    </Text>
                  </View>
                )}
                {item.catatan_review && (
                  <View style={styles.catatanReview}>
                    <Text style={styles.catatanReviewLabel}>
                      Catatan Reviewer:
                    </Text>
                    <Text style={styles.catatanReviewText}>
                      {item.catatan_review}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Belum ada riwayat izin</Text>
              <TouchableOpacity
                style={styles.btnAjukanEmpty}
                onPress={() => setTab("ajukan")}
              >
                <Text style={styles.btnAjukanEmptyText}>+ Ajukan Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
          onRefresh={loadRiwayat}
          refreshing={loading}
        />
      )}
    </View>
  );

  // ─── Render Ajukan ─────────────────────────────────────────────────────────

  const renderAjukan = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.formTitle}>📝 Ajukan Izin / Sakit / Cuti</Text>

      {/* Jenis */}
      <Text style={styles.label}>Jenis Pengajuan *</Text>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setShowJenisPicker(true)}
      >
        <Text style={styles.pickerText}>{getJenisLabel(form.jenis)}</Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      {/* Tanggal Mulai */}
      <Text style={styles.label}>Tanggal Mulai *</Text>
      <TextInput
        style={styles.input}
        value={form.tanggal_mulai}
        onChangeText={(v) => setForm((prev) => ({ ...prev, tanggal_mulai: v }))}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9ca3af"
      />

      {/* Tanggal Selesai */}
      <Text style={styles.label}>Tanggal Selesai *</Text>
      <TextInput
        style={styles.input}
        value={form.tanggal_selesai}
        onChangeText={(v) =>
          setForm((prev) => ({ ...prev, tanggal_selesai: v }))
        }
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9ca3af"
      />

      {/* Durasi */}
      {form.tanggal_mulai && form.tanggal_selesai && (
        <View style={styles.durasiCard}>
          <Text style={styles.durasiText}>
            📆 Durasi:{" "}
            {Math.max(
              1,
              Math.round(
                (new Date(form.tanggal_selesai) -
                  new Date(form.tanggal_mulai)) /
                  (1000 * 60 * 60 * 24) +
                  1,
              ),
            )}{" "}
            hari
          </Text>
        </View>
      )}

      {/* Alasan */}
      <Text style={styles.label}>Alasan *</Text>
      <TextInput
        style={[styles.input, { height: 100, textAlignVertical: "top" }]}
        placeholder="Tuliskan alasan pengajuan..."
        placeholderTextColor="#9ca3af"
        value={form.alasan}
        onChangeText={(v) => setForm((prev) => ({ ...prev, alasan: v }))}
        multiline
      />

      {/* Attachment Section */}
      <View style={styles.attachSection}>
        <View style={styles.attachHeader}>
          <Text style={styles.label}>
            Lampiran{" "}
            {form.jenis === "sakit" ? (
              <Text style={{ color: "#dc2626" }}>* (Wajib untuk Sakit)</Text>
            ) : (
              <Text style={{ color: "#9ca3af" }}>(Opsional)</Text>
            )}
          </Text>
          <TouchableOpacity
            style={styles.btnTambahFile}
            onPress={() => setShowAttachPicker(true)}
          >
            <Text style={styles.btnTambahFileText}>+ Tambah File</Text>
          </TouchableOpacity>
        </View>

        {/* Daftar file yang dipilih */}
        {attachments.length === 0 ? (
          <TouchableOpacity
            style={styles.attachPlaceholder}
            onPress={() => setShowAttachPicker(true)}
          >
            <Text style={styles.attachPlaceholderIcon}>📎</Text>
            <Text style={styles.attachPlaceholderText}>
              Ketuk untuk menambahkan foto atau PDF
            </Text>
            {form.jenis === "sakit" && (
              <Text style={styles.attachPlaceholderHint}>
                Surat dokter wajib dilampirkan
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.attachList}>
            {attachments.map((file) => (
              <View key={file.id} style={styles.attachItem}>
                {file.type === "image" ? (
                  <Image
                    source={{ uri: file.uri }}
                    style={styles.attachThumb}
                  />
                ) : (
                  <View style={styles.attachPdfThumb}>
                    <Text style={styles.attachPdfIcon}>📄</Text>
                  </View>
                )}
                <View style={styles.attachItemInfo}>
                  <Text style={styles.attachItemName} numberOfLines={1}>
                    {file.name}
                  </Text>
                  {file.size && (
                    <Text style={styles.attachItemSize}>
                      {formatFileSize(file.size)}
                    </Text>
                  )}
                  <Text style={styles.attachItemType}>
                    {file.type === "image" ? "🖼️ Foto" : "📄 PDF"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.attachRemoveBtn}
                  onPress={() => removeAttachment(file.id)}
                >
                  <Text style={styles.attachRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.btnTambahLagi}
              onPress={() => setShowAttachPicker(true)}
            >
              <Text style={styles.btnTambahLagiText}>+ Tambah File Lagi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          ℹ️ Pengajuan akan dikirim ke admin/atasan untuk direview. Status akan
          diperbarui setelah diproses.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.btnSubmit, submitting && styles.btnDisabled]}
        onPress={submitIzin}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.btnSubmitText}>📤 Kirim Pengajuan</Text>
        )}
      </TouchableOpacity>

      {/* Modal Pilih Jenis Izin */}
      <Modal visible={showJenisPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pilih Jenis Pengajuan</Text>
            {JENIS_IZIN.map((j) => (
              <TouchableOpacity
                key={j.key}
                style={[
                  styles.jenisItem,
                  form.jenis === j.key && styles.jenisItemActive,
                ]}
                onPress={() => {
                  setForm((prev) => ({ ...prev, jenis: j.key }));
                  setShowJenisPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.jenisItemLabel,
                    form.jenis === j.key && { color: "white" },
                  ]}
                >
                  {j.label}
                </Text>
                <Text
                  style={[
                    styles.jenisItemDesc,
                    form.jenis === j.key && { color: "rgba(255,255,255,0.8)" },
                  ]}
                >
                  {j.desc}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.btnBatalModal}
              onPress={() => setShowJenisPicker(false)}
            >
              <Text style={styles.btnBatalModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Pilih Sumber File */}
      <Modal visible={showAttachPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Lampiran</Text>
            <TouchableOpacity
              style={styles.attachOptionBtn}
              onPress={pickFromCamera}
            >
              <Text style={styles.attachOptionIcon}>📷</Text>
              <View>
                <Text style={styles.attachOptionLabel}>Ambil Foto</Text>
                <Text style={styles.attachOptionDesc}>
                  Buka kamera untuk foto langsung
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachOptionBtn}
              onPress={pickFromGallery}
            >
              <Text style={styles.attachOptionIcon}>🖼️</Text>
              <View>
                <Text style={styles.attachOptionLabel}>Pilih dari Galeri</Text>
                <Text style={styles.attachOptionDesc}>
                  Pilih foto dari galeri HP
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachOptionBtn}
              onPress={pickDocument}
            >
              <Text style={styles.attachOptionIcon}>📄</Text>
              <View>
                <Text style={styles.attachOptionLabel}>Pilih Dokumen PDF</Text>
                <Text style={styles.attachOptionDesc}>
                  Upload surat dokter atau dokumen PDF
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnBatalModal}
              onPress={() => setShowAttachPicker(false)}
            >
              <Text style={styles.btnBatalModalText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  // ─── Main Render ───────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === "riwayat" && styles.tabActive]}
          onPress={() => setTab("riwayat")}
        >
          <Text
            style={[styles.tabText, tab === "riwayat" && styles.tabTextActive]}
          >
            📋 Riwayat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, tab === "ajukan" && styles.tabActive]}
          onPress={() => setTab("ajukan")}
        >
          <Text
            style={[styles.tabText, tab === "ajukan" && styles.tabTextActive]}
          >
            ✏️ Ajukan
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "riwayat" && renderRiwayat()}
      {tab === "ajukan" && renderAjukan()}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#dc2626" },
  tabText: { fontSize: 13, color: "#9ca3af", fontWeight: "600" },
  tabTextActive: { color: "#dc2626" },

  // Riwayat
  izinCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  izinHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  izinJenis: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: "700" },
  izinTanggal: { marginBottom: 6 },
  izinTanggalText: { fontSize: 13, color: "#6b7280" },
  izinAlasan: { fontSize: 13, color: "#374151", lineHeight: 20 },
  attachmentInfo: {
    marginTop: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  attachmentInfoText: { fontSize: 12, color: "#15803d", fontWeight: "600" },
  catatanReview: {
    marginTop: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#dc2626",
  },
  catatanReviewLabel: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "700",
    marginBottom: 2,
  },
  catatanReviewText: { fontSize: 13, color: "#374151" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: "#9ca3af", fontWeight: "600" },
  btnAjukanEmpty: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  btnAjukanEmptyText: { color: "white", fontWeight: "700", fontSize: 14 },

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
  picker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 16,
  },
  pickerText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  pickerArrow: { color: "#9ca3af", fontSize: 12 },
  durasiCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  durasiText: { fontSize: 14, color: "#1d4ed8", fontWeight: "600" },

  // Attachment
  attachSection: { marginBottom: 16 },
  attachHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  btnTambahFile: {
    backgroundColor: "#dc2626",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnTambahFileText: { color: "white", fontSize: 12, fontWeight: "700" },
  attachPlaceholder: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    backgroundColor: "white",
    gap: 6,
  },
  attachPlaceholderIcon: { fontSize: 32 },
  attachPlaceholderText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  attachPlaceholderHint: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  attachList: { gap: 8 },
  attachItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  attachThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  attachPdfThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  attachPdfIcon: { fontSize: 24 },
  attachItemInfo: { flex: 1, gap: 2 },
  attachItemName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  attachItemSize: { fontSize: 11, color: "#9ca3af" },
  attachItemType: { fontSize: 11, color: "#6b7280" },
  attachRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  attachRemoveText: { fontSize: 12, color: "#dc2626", fontWeight: "700" },
  btnTambahLagi: {
    borderWidth: 1.5,
    borderColor: "#dc2626",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderStyle: "dashed",
  },
  btnTambahLagiText: { color: "#dc2626", fontSize: 13, fontWeight: "700" },

  // Attach Option Modal
  attachOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    gap: 14,
  },
  attachOptionIcon: { fontSize: 28 },
  attachOptionLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  attachOptionDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  // Info & Submit
  infoBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  infoText: { fontSize: 12, color: "#15803d", lineHeight: 18 },
  btnSubmit: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 32,
  },
  btnSubmitText: { color: "white", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.7 },

  // Modal
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
  jenisItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  jenisItemActive: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  jenisItemLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  jenisItemDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  btnBatalModal: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnBatalModalText: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
