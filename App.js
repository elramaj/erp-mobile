import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { registerRootComponent } from "expo";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AbsensiScreen from "./src/screens/AbsensiScreen";
import GudangScreen from "./src/screens/GudangScreen";
import IzinScreen from "./src/screens/IzinScreen";
import LoginScreen from "./src/screens/LoginScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ROLE_GUDANG = [1, 2, 3, 4, 11];

function HeaderTitle({ user, title }) {
  return (
    <View style={{ flexDirection: "column", justifyContent: "center" }}>
      <Text
        style={{
          color: "white",
          fontSize: 15,
          fontWeight: "800",
          lineHeight: 18,
        }}
      >
        {title}
      </Text>
      {user && (
        <Text
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: 11,
            lineHeight: 14,
            marginTop: 1,
          }}
        >
          {user.name} · {user.company ?? "-"}
        </Text>
      )}
    </View>
  );
}

function LogoutButton({ onLogout }) {
  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: onLogout },
    ]);
  };

  return (
    <TouchableOpacity
      onPress={handleLogout}
      style={{
        marginRight: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 8,
      }}
    >
      <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>
        Logout
      </Text>
    </TouchableOpacity>
  );
}

function MainTabs({ onLogout, user }) {
  const bisaAksesGudang = user && ROLE_GUDANG.includes(user.role_id);

  // DEBUG - hapus setelah masalah solved
  console.log("USER OBJECT:", JSON.stringify(user));
  console.log("ROLE_ID:", user?.role_id);
  console.log("TIPE ROLE_ID:", typeof user?.role_id);
  console.log("BISA AKSES GUDANG:", bisaAksesGudang);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#dc2626",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#f3f4f6",
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        headerStyle: { backgroundColor: "#dc2626" },
        headerTintColor: "white",
        headerTitleStyle: { fontWeight: "800" },
        headerRight: () => <LogoutButton onLogout={onLogout} />,
      }}
    >
      <Tab.Screen
        name="Absensi"
        component={AbsensiScreen}
        options={{
          headerTitle: () => <HeaderTitle user={user} title="🕐 Absensi" />,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>🕐</Text>
          ),
          tabBarLabel: "Absensi",
        }}
      />
      <Tab.Screen
        name="Izin"
        component={IzinScreen}
        options={{
          headerTitle: () => <HeaderTitle user={user} title="📋 Izin / Cuti" />,
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>📋</Text>
          ),
          tabBarLabel: "Izin",
        }}
      />
      {bisaAksesGudang && (
        <Tab.Screen
          name="Gudang"
          component={GudangScreen}
          options={{
            headerTitle: () => <HeaderTitle user={user} title="🏭 Gudang" />,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>🏭</Text>
            ),
            tabBarLabel: "Gudang",
          }}
        />
      )}
    </Tab.Navigator>
  );
}

function App() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    cekLogin();
  }, []);

  const cekLogin = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      console.log("TOKEN:", token);
      console.log("USER DI STORAGE:", userStr);
      if (token && userStr) {
        const userData = JSON.parse(userStr);
        console.log("USER PARSED:", JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.log("Error cek login:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) setUser(JSON.parse(userStr));
    } catch (err) {}
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    setUser(null);
    setIsLoggedIn(false);
  };

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#dc2626" />
        <Text style={{ marginTop: 12, color: "#6b7280" }}>
          Memuat aplikasi...
        </Text>
      </View>
    );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="Main">
            {() => <MainTabs onLogout={handleLogout} user={user} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

registerRootComponent(App);
