import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://100.125.34.26:8000/api";

const api = async (endpoint, method = "GET", body = null) => {
  const token = await AsyncStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  return data;
};

export default api;
