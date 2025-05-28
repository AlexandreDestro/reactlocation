import { useState, useEffect } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  Alert,
} from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import SQLite from "expo-sqlite";

import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";

// Abre ou cria o banco de dados SQLite
const db = SQLite.openDatabase("locations.db");

export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false); // Dark Mode
  const [isLoading, setIsLoading] = useState(false); // Loading
  const [locations, setLocations] = useState([]); // Localizações

  // Tema
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    myOwnProperty: true,
    colors: myColors.colors,
  });

  // 👉 Criação da tabela no SQLite
  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, latitude REAL, longitude REAL);"
      );
    });

    loadDarkMode();
    loadLocations();
  }, []);

  // 👉 Tema Dark/Light
  useEffect(() => {
    if (isSwitchOn) {
      setTheme({ ...theme, colors: myColorsDark.colors });
    } else {
      setTheme({ ...theme, colors: myColors.colors });
    }
  }, [isSwitchOn]);

  // 👉 Carrega Dark Mode salvo
  async function loadDarkMode() {
    try {
      const value = await AsyncStorage.getItem("darkMode");
      if (value !== null) {
        setIsSwitchOn(JSON.parse(value));
      }
    } catch (e) {
      console.error("Erro ao carregar dark mode:", e);
    }
  }

  // 👉 Alterna Dark Mode
  async function onToggleSwitch() {
    try {
      const newValue = !isSwitchOn;
      setIsSwitchOn(newValue);
      await AsyncStorage.setItem("darkMode", JSON.stringify(newValue));
    } catch (e) {
      console.error("Erro ao salvar dark mode:", e);
    }
  }

  // 👉 Captura localização
  async function getLocation() {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Permissão para localização foi negada.");
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      await saveLocation(coords);
      await loadLocations();
    } catch (error) {
      console.error("Erro ao obter localização:", error);
    }
    setIsLoading(false);
  }

  // 👉 Salva localização no SQLite
  async function saveLocation(coords) {
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO locations (latitude, longitude) VALUES (?, ?);",
        [coords.latitude, coords.longitude]
      );
    });
  }

  // 👉 Carrega localizações do SQLite
  async function loadLocations() {
    setIsLoading(true);
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM locations;",
        [],
        (_, { rows: { _array } }) => {
          setLocations(_array);
        },
        (t, error) => {
          console.error("Erro ao carregar locations", error);
          return false;
        }
      );
    });
    setIsLoading(false);
  }

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location BASE" />
      </Appbar.Header>
      <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
        <View style={styles.containerDarkMode}>
          <Text>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>

        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          onPress={getLocation}
        >
          Capturar localização
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={`Latitude: ${item.latitude} | Longitude: ${item.longitude}`}
            />
          )}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
    flex: 1,
  },
});
