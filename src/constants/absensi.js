export const TIPE_ABSENSI = [
  {
    key: "masuk_kantor",
    icon: "business-outline",
    label: "Masuk Kantor",
    desc: "Absen masuk di kantor",
  },
  {
    key: "visit",
    icon: "car-outline",
    label: "Visit",
    desc: "Kunjungan ke lokasi",
  },
  { key: "wfh", icon: "home-outline", label: "WFH", desc: "Kerja dari rumah" },
];

export const getTipeLabel = (key) =>
  TIPE_ABSENSI.find((t) => t.key === key)?.label ?? key;

export const getTipeIcon = (key) =>
  TIPE_ABSENSI.find((t) => t.key === key)?.icon ?? "help-circle-outline";