import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://erp.merakinusa.id/api";

const api = async (
  endpoint,
  method = "GET",
  body = null,
  isMultipart = false,
) => {
  const token = await AsyncStorage.getItem("token");

  const headers = {
    Accept: "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Kalau bukan multipart, set Content-Type JSON
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  // Kalau multipart (FormData), JANGAN set Content-Type
  // biarkan fetch set otomatis dengan boundary

  const config = { method, headers };

  if (body) {
    if (isMultipart) {
      config.body = body; // FormData langsung
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await response.json();
    return data;
  } catch (err) {
    console.log("API Error:", err);
    throw err;
  }
};

export default api;
