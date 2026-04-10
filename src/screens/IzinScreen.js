import { useEffect, useState } from "react";
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
  const [tab, setTab] = useState("riwayat"); // riwayat | ajukan
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showJenisPicker, setShowJenisPicker] = useState(false);
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

    setSubmitting(true);
    try {
      const res = await api("/izin", "POST", form);
      if (res.success) {
        Alert.alert("✅ Berhasil!", res.message, [
          {
            text: "OK",
            onPress: () => {
              setTab("riwayat");
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

      {/* Modal Pilih Jenis */}
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
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Tab Bar */}
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
