export const JENIS_IZIN = [
  {
    key: "izin",
    icon: "document-text-outline",
    label: "Izin",
    desc: "Izin tidak masuk kerja",
  },
  {
    key: "sakit",
    icon: "medkit-outline",
    label: "Sakit",
    desc: "Tidak masuk karena sakit",
  },
  {
    key: "cuti",
    icon: "sunny-outline",
    label: "Cuti",
    desc: "Cuti tahunan",
  },
  {
    key: "dinas_luar",
    icon: "airplane-outline",
    label: "Dinas Luar",
    desc: "Tugas ke luar kota/kantor",
  },
];

export const getJenisLabel = (key) =>
  JENIS_IZIN.find((j) => j.key === key)?.label ?? key;

export const getJenisIcon = (key) =>
  JENIS_IZIN.find((j) => j.key === key)?.icon ?? "help-circle-outline";

export const STATUS_COLOR = {
  pending: {
    bg: "#fef3c7",
    text: "#92400e",
    label: "Menunggu",
    icon: "time-outline",
  },
  disetujui: {
    bg: "#dcfce7",
    text: "#14532d",
    label: "Disetujui",
    icon: "checkmark-circle",
  },
  ditolak: {
    bg: "#fee2e2",
    text: "#991b1b",
    label: "Ditolak",
    icon: "close-circle",
  },
};