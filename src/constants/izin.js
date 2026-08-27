export const JENIS_IZIN = [
  { key: "izin", label: "📋 Izin", desc: "Izin tidak masuk kerja" },
  { key: "sakit", label: "🏥 Sakit", desc: "Tidak masuk karena sakit" },
  { key: "cuti", label: "🌴 Cuti", desc: "Cuti tahunan" },
  {
    key: "dinas_luar",
    label: "✈️ Dinas Luar",
    desc: "Tugas ke luar kota/kantor",
  },
];

export const getJenisLabel = (key) =>
  JENIS_IZIN.find((j) => j.key === key)?.label ?? key;

export const STATUS_COLOR = {
  pending: { bg: "#fef3c7", text: "#92400e", label: "⏳ Menunggu" },
  disetujui: { bg: "#dcfce7", text: "#14532d", label: "✅ Disetujui" },
  ditolak: { bg: "#fee2e2", text: "#991b1b", label: "❌ Ditolak" },
};