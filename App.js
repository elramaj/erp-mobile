import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import AbsensiScreen from "./src/screens/AbsensiScreen";
import GudangScreen from "./src/screens/GudangScreen";
import IzinScreen from "./src/screens/IzinScreen";
import LoginScreen from "./src/screens/LoginScreen";

SplashScreen.preventAutoHideAsync();

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
  const bisaAksesGudang = user && ROLE_GUDANG.includes(Number(user.role_id));

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
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    prepareApp();
  }, []);

  const prepareApp = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      if (token && userStr) {
        setUser(JSON.parse(userStr));
        setIsLoggedIn(true);
      }
      // Simulasi splash screen 2 detik
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setAppReady(true);
      setLoading(false);
    }
  };

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#dc2626",
        }}
        onLayout={onLayoutRootView}
      >
        <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
        <Image
          source={require("./assets/images/splash-icon.png")}
          style={{
            width: "100%",
            height: "100%",
            resizeMode: "cover",
          }}
        />
      </View>
    );
  }

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

  function handleLoginSuccess() {
    AsyncStorage.getItem("user").then((userStr) => {
      if (userStr) setUser(JSON.parse(userStr));
    });
    setIsLoggedIn(true);
  }

  function handleLogout() {
    AsyncStorage.removeItem("token");
    AsyncStorage.removeItem("user");
    setUser(null);
    setIsLoggedIn(false);
  }
}

registerRootComponent(App);
