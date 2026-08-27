import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AttachSourcePicker from "../components/izin/AttachSourcePicker";
import JenisIzinPicker from "../components/izin/JenisIzinPicker";
import { JENIS_IZIN, STATUS_COLOR } from "../constants/izin";
import useAttachments from "../hooks/useAttachments";
import api from "../services/api";
import styles from "./IzinScreen.styles";

export default function IzinScreen() {
  const [tab, setTab] = useState("riwayat");
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showJenisPicker, setShowJenisPicker] = useState(false);
  const [showAttachPicker, setShowAttachPicker] = useState(false);
  const {
    attachments,
    pickFromCamera,
    pickFromGallery,
    pickDocument,
    removeAttachment,
    resetAttachments,
    formatFileSize,
  } = useAttachments();
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
              resetAttachments();
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
      <JenisIzinPicker
        visible={showJenisPicker}
        jenis={form.jenis}
        onSelect={(key) => {
          setForm((prev) => ({ ...prev, jenis: key }));
          setShowJenisPicker(false);
        }}
        onClose={() => setShowJenisPicker(false)}
      />

      {/* Modal Pilih Sumber File */}
      <AttachSourcePicker
        visible={showAttachPicker}
        onCamera={() => {
          setShowAttachPicker(false);
          pickFromCamera();
        }}
        onGallery={() => {
          setShowAttachPicker(false);
          pickFromGallery();
        }}
        onDocument={() => {
          setShowAttachPicker(false);
          pickDocument();
        }}
        onClose={() => setShowAttachPicker(false)}
      />
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