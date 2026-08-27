import { Ionicons } from "@expo/vector-icons";
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
import { getJenisIcon, JENIS_IZIN, STATUS_COLOR } from "../constants/izin";
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
        Alert.alert("Berhasil!", res.message, [
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
                  <View style={styles.izinJenisRow}>
                    <Ionicons
                      name={getJenisIcon(item.jenis)}
                      size={16}
                      color="#374151"
                    />
                    <Text style={styles.izinJenis}>
                      {getJenisLabel(item.jenis)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.bg },
                    ]}
                  >
                    <Ionicons
                      name={statusInfo.icon}
                      size={12}
                      color={statusInfo.text}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[styles.statusText, { color: statusInfo.text }]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.izinTanggalRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color="#6b7280"
                  />
                  <Text style={styles.izinTanggalText}>
                    {item.tanggal_mulai}
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
                    <Ionicons
                      name="attach-outline"
                      size={13}
                      color="#15803d"
                    />
                    <Text style={styles.attachmentInfoText}>
                      {item.attachments.length} lampiran
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
              <Ionicons name="document-text-outline" size={44} color="#d1d5db" />
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
      <View style={styles.formTitleRow}>
        <Ionicons name="create-outline" size={20} color="#111827" />
        <Text style={[styles.formTitle, { marginBottom: 0 }]}>
          Ajukan Izin / Sakit / Cuti
        </Text>
      </View>

      {/* Jenis */}
      <Text style={styles.label}>Jenis Pengajuan *</Text>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setShowJenisPicker(true)}
      >
        <View style={styles.pickerValueRow}>
          <Ionicons
            name={getJenisIcon(form.jenis)}
            size={17}
            color="#dc2626"
          />
          <Text style={styles.pickerText}>{getJenisLabel(form.jenis)}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="#9ca3af" />
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
          <Ionicons name="calendar-outline" size={16} color="#1d4ed8" />
          <Text style={styles.durasiText}>
            Durasi:{" "}
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
            <Ionicons name="add" size={14} color="white" />
            <Text style={styles.btnTambahFileText}>Tambah File</Text>
          </TouchableOpacity>
        </View>

        {/* Daftar file yang dipilih */}
        {attachments.length === 0 ? (
          <TouchableOpacity
            style={styles.attachPlaceholder}
            onPress={() => setShowAttachPicker(true)}
          >
            <Ionicons name="attach-outline" size={30} color="#9ca3af" />
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
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color="#dc2626"
                    />
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
                  <View style={styles.attachItemTypeRow}>
                    <Ionicons
                      name={file.type === "image" ? "image-outline" : "document-outline"}
                      size={11}
                      color="#6b7280"
                    />
                    <Text style={styles.attachItemType}>
                      {file.type === "image" ? "Foto" : "PDF"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.attachRemoveBtn}
                  onPress={() => removeAttachment(file.id)}
                >
                  <Ionicons name="close" size={14} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.btnTambahLagi}
              onPress={() => setShowAttachPicker(true)}
            >
              <Ionicons name="add" size={15} color="#dc2626" />
              <Text style={styles.btnTambahLagiText}>Tambah File Lagi</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#15803d" />
        <Text style={styles.infoText}>
          Pengajuan akan dikirim ke admin/atasan untuk direview. Status akan
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="paper-plane-outline" size={17} color="white" />
            <Text style={styles.btnSubmitText}>Kirim Pengajuan</Text>
          </View>
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
          style={[
            styles.tabItem,
            { flexDirection: "row", justifyContent: "center", gap: 6 },
            tab === "riwayat" && styles.tabActive,
          ]}
          onPress={() => setTab("riwayat")}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={tab === "riwayat" ? "#dc2626" : "#9ca3af"}
          />
          <Text
            style={[styles.tabText, tab === "riwayat" && styles.tabTextActive]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            { flexDirection: "row", justifyContent: "center", gap: 6 },
            tab === "ajukan" && styles.tabActive,
          ]}
          onPress={() => setTab("ajukan")}
        >
          <Ionicons
            name="create-outline"
            size={15}
            color={tab === "ajukan" ? "#dc2626" : "#9ca3af"}
          />
          <Text
            style={[styles.tabText, tab === "ajukan" && styles.tabTextActive]}
          >
            Ajukan
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "riwayat" && renderRiwayat()}
      {tab === "ajukan" && renderAjukan()}
    </View>
  );
}