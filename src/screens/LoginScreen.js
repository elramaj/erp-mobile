import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Email dan password wajib diisi!");
      return;
    }

    setLoading(true);
    try {
      const res = await api("/login", "POST", { email, password });
      if (res.success) {
        await AsyncStorage.setItem("token", res.token);
        await AsyncStorage.setItem("user", JSON.stringify(res.user));
        onLoginSuccess();
      } else {
        Alert.alert("Login Gagal", res.message || "Email atau password salah!");
      }
    } catch (err) {
      Alert.alert(
        "Error",
        "Tidak bisa terhubung ke server. Cek koneksi internet!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.appName}>ERP KANTOR</Text>
          <Text style={styles.tagline}>Sistem ERP Terintegrasi</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Selamat Datang 👋</Text>
          <Text style={styles.subtitle}>Masuk untuk melanjutkan</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="nama@perusahaan.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Text style={styles.eyeText}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btnLogin, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Masuk →</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          © 2026 ERP Kantor · Hak cipta dilindungi
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: "#fff" },
  topSection: {
    backgroundColor: "#dc2626",
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 48,
  },
  logo: { width: 80, height: 80, resizeMode: "contain", marginBottom: 16 },
  appName: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1,
  },
  tagline: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 4 },
  formSection: { padding: 28 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#9ca3af", marginBottom: 28 },
  label: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginBottom: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 28,
  },
  passwordInput: { flex: 1, padding: 14, fontSize: 14, color: "#111827" },
  eyeBtn: { paddingHorizontal: 14 },
  eyeText: { fontSize: 18 },
  btnLogin: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  footer: { textAlign: "center", fontSize: 12, color: "#9ca3af", padding: 24 },
});
