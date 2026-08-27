import * as Location from "expo-location";
import { useState } from "react";
import { Linking } from "react-native";
import api from "../services/api";

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ngurusin semua hal yang berhubungan sama GPS: minta izin lokasi,
// ambil koordinat sekarang, dan hitung apakah user ada di dalam radius kantor.
export default function useLokasiAbsensi() {
  const [locationPermission, requestLocationPermission] =
    Location.useForegroundPermissions();
  const [koordinat, setKoordinat] = useState(null);
  const [lokasiValid, setLokasiValid] = useState(false);
  const [jarakMeter, setJarakMeter] = useState(null);

  const cekLokasi = async () => {
    if (!locationPermission?.granted) await requestLocationPermission();
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setKoordinat({ lat: loc.coords.latitude, lng: loc.coords.longitude });

      const res = await api("/absensi/status");
      if (res.lokasi_kantor) {
        const jarak = hitungJarak(
          loc.coords.latitude,
          loc.coords.longitude,
          res.lokasi_kantor.latitude,
          res.lokasi_kantor.longitude,
        );
        setJarakMeter(Math.round(jarak));
        setLokasiValid(jarak <= res.lokasi_kantor.radius_meter);
      }
    } catch (err) {
      console.log("GPS error:", err);
    }
  };

  const bukaPeta = () => {
    if (!koordinat) return;
    Linking.openURL(
      `https://www.google.com/maps?q=${koordinat.lat},${koordinat.lng}`,
    );
  };

  return { koordinat, lokasiValid, jarakMeter, cekLokasi, bukaPeta };
}