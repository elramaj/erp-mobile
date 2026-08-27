import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import styles from "../../screens/GudangScreen.styles";
import api from "../../services/api";

const SATUAN_UMUM = ["pcs", "unit", "box", "pack", "kg", "liter", "meter"];

// Form ringkas buat daftarin barang baru langsung dari lapangan —
// biasanya kepicu setelah scan barcode yang belum terdaftar di sistem.
export default function TambahBarangModal({
  visible,
  kodeAwal,
  onClose,
  onSuccess,
}) {
  const [kode, setKode] = useState("");
  const [nama, setNama] = useState("");
  const [satuan, setSatuan] = useState("pcs");
  const [kategoriId, setKategoriId] = useState(null);
  const [stokMinimum, setStokMinimum] = useState("0");
  const [hasSn, setHasSn] = useState(false);
  const [kategoriList, setKategoriList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (visible) {
      setKode(kodeAwal ?? "");
      setNama("");
      setSatuan("pcs");
      setKategoriId(null);
      setStokMinimum("0");
      setHasSn(false);
      setErrorMsg("");
      loadKategori();
    }
  }, [visible, kodeAwal]);

  const loadKategori = async () => {
    try {
      const res = await api("/gudang/kategori");
      if (res.success) setKategoriList(res.data);
    } catch (err) {
      // Kategori opsional — kalau gagal load, form tetap bisa dipakai tanpa kategori
    }
  };

  const submit = async () => {
    if (!kode.trim() || !nama.trim() || !satuan.trim()) {
      setErrorMsg("Kode, nama, dan satuan wajib diisi.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await api("/gudang/barang", "POST", {
        kode_barang: kode.trim(),
        nama_barang: nama.trim(),
        satuan: satuan.trim(),
        kategori_id: kategoriId,
        stok_minimum: parseInt(stokMinimum || "0", 10),
        has_sn: hasSn,
      });
      if (res.success) {
        onSuccess(res.data);
      } else {
        setErrorMsg(res.message ?? "Gagal menyimpan barang.");
      }
    } catch (err) {
      setErrorMsg("Gagal menyimpan barang. Cek koneksi ke server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: "#f3f4f6",
          }}
        >
          <Ionicons name="add-circle-outline" size={22} color="#dc2626" />
          <Text style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}>
            Daftarkan Barang Baru
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.label}>Kode Barang *</Text>
          <TextInput
            style={styles.input}
            placeholder="Hasil scan / ketik manual"
            placeholderTextColor="#9ca3af"
            value={kode}
            onChangeText={setKode}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Nama Barang *</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Kabel HDMI 2m"
            placeholderTextColor="#9ca3af"
            value={nama}
            onChangeText={setNama}
          />

          <Text style={styles.label}>Satuan *</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {SATUAN_UMUM.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setSatuan(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: satuan === s ? "#dc2626" : "#e5e7eb",
                  backgroundColor: satuan === s ? "#dc2626" : "white",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: satuan === s ? "white" : "#374151",
                  }}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Atau ketik satuan lain..."
            placeholderTextColor="#9ca3af"
            value={SATUAN_UMUM.includes(satuan) ? "" : satuan}
            onChangeText={setSatuan}
          />

          {kategoriList.length > 0 && (
            <>
              <Text style={styles.label}>Kategori (opsional)</Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => setKategoriId(null)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: kategoriId === null ? "#dc2626" : "#e5e7eb",
                    backgroundColor: kategoriId === null ? "#dc2626" : "white",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: kategoriId === null ? "white" : "#374151",
                    }}
                  >
                    Tanpa kategori
                  </Text>
                </TouchableOpacity>
                {kategoriList.map((k) => (
                  <TouchableOpacity
                    key={k.id}
                    onPress={() => setKategoriId(k.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: kategoriId === k.id ? "#dc2626" : "#e5e7eb",
                      backgroundColor: kategoriId === k.id ? "#dc2626" : "white",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: kategoriId === k.id ? "white" : "#374151",
                      }}
                    >
                      {k.nama}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Stok Minimum (buat alert stok menipis)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={stokMinimum}
            onChangeText={setStokMinimum}
          />

          <TouchableOpacity
            onPress={() => setHasSn((v) => !v)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 12,
              marginBottom: 12,
            }}
          >
            <Ionicons
              name={hasSn ? "checkbox" : "square-outline"}
              size={22}
              color={hasSn ? "#dc2626" : "#9ca3af"}
            />
            <Text style={{ fontSize: 14, color: "#374151" }}>
              Barang ini butuh Serial Number per unit
            </Text>
          </TouchableOpacity>

          {errorMsg ? (
            <Text style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>
              {errorMsg}
            </Text>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.btnBatalModal, { flex: 1, marginTop: 0 }]}
              onPress={onClose}
            >
              <Text style={styles.btnBatalModalText}>Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnSubmit,
                { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
                submitting && styles.btnDisabled,
              ]}
              onPress={submit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="white" />
                  <Text style={styles.btnSubmitText}>Simpan Barang</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}