// HomePage.tsx
import { extractTextFromImage } from "@/services/ocrService";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import type React from "react";
import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	Modal,
	Pressable,
	SafeAreaView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

type Category = { id: string; icon: IconData; label: string };
type Item = { id: string; name: string; price: number };
type IconData = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const STORAGE_KEY = "SHOPPER_ITEMS";

const categories: Category[] = [
  { id: "1", icon: "fruit-cherries", label: "Fruits" },
  { id: "2", icon: "leaf", label: "Veggies" },
  { id: "3", icon: "cow", label: "Dairy" },
  { id: "4", icon: "bread-slice", label: "Bakery" },
];

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [store, setStore] = useState("");

  const total = items.reduce((sum, item) => sum + item.price, 0).toFixed(2);

  /* ----------------------- load / save items ----------------------- */
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setItems(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to load items.", e);
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) =>
      console.warn("Failed to save items.", e),
    );
  }, [items]);

  /* ----------------------------- OCR ------------------------------- */
  const runOCR = async (uri: string) => {
    try {
      setLoading(true);
      const { store, items } = await extractTextFromImage(uri);
      setStore(store?.trim() || "");
      setItems(items.map((item, i) => ({ id: String(i + 1), ...item })));
    } catch {
      Alert.alert("Error", "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------- image acquisition ------------------------ */
  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera permission is required!");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await runOCR(uri);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await runOCR(uri);
    }
  };

  const askPickOrCamera = () => {
    Alert.alert("Scan Receipt", "Choose input method", [
      { text: "📷 Camera", onPress: handleCamera },
      { text: "🖼 Gallery", onPress: handlePickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  /* ------------------------ item handlers -------------------------- */
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    try {
      const oldData = await AsyncStorage.getItem("SHOPPER_HISTORY");
      const history = oldData ? JSON.parse(oldData) : [];

      const session = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        store: store.trim() || undefined,
        items,
      };

      const newHistory = [session, ...history];
      await AsyncStorage.setItem("SHOPPER_HISTORY", JSON.stringify(newHistory));

      Alert.alert("Saved", "Session saved to history!");
    } catch (err) {
      console.warn("Save error:", err);
      Alert.alert("Error", "Save failed");
    }
  };

  const handleClearAll = () => {
    if (!items.length) return;
    Alert.alert("Clear All", "Remove all items?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
		setStore("");           // ← clear detected store
		setImageUri(null);      // ← clear preview image
        setItems([]);
          await AsyncStorage.removeItem(STORAGE_KEY);
        },
      },
    ]);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditPrice(item.price.toString());
    setModalVisible(true);
  };

  const saveEditedItem = () => {
    const price = Number.parseFloat(editPrice);
    if (!editName.trim() || Number.isNaN(price)) {
      Alert.alert("Invalid input", "Enter valid name and price.");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === editingItem?.id ? { ...i, name: editName.trim(), price } : i,
      ),
    );
    setModalVisible(false);
  };

  /* ---------------------------- render ----------------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* ------------ Header ------------ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.small}>Hello,</Text>
          <Text style={styles.large}>Hi Shopper</Text>
        </View>
        <Image source={{ uri: "https://i.pravatar.cc/100" }} style={styles.avatar} />
      </View>

      {/* ----------- Content ------------ */}
      <FlatList
        data={items.filter((i) =>
          i.name.toLowerCase().includes(search.toLowerCase()),
        )}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <>
            {/* Latest Scan Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Latest Scan</Text>
                <Feather name="chevron-right" size={20} color="#FFF" />
              </View>
              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.cardLabel}>Items</Text>
                  <Text style={styles.cardValue}>{items.length}</Text>
                </View>
                <View>
                  <Text style={styles.cardLabel}>Total</Text>
                  <Text style={styles.cardValue}>${total}</Text>
                </View>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.search}>
              <Feather name="search" size={20} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search items"
                placeholderTextColor="#6B7280"
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {/* Categories */}
            <View style={styles.categoryRow}>
              {categories.map((cat) => (
                <Pressable key={cat.id} style={styles.categoryBtn}>
                  <MaterialCommunityIcons name={cat.icon} size={24} color="#60A5FA" />
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Scanned Items Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scanned Items</Text>
              <View style={styles.sectionRight}>
                <Text style={styles.totalText}>Total: ${total}</Text>
                <Pressable onPress={handleSave} style={styles.saveIcon}>
                  <MaterialCommunityIcons name="content-save-outline" size={30} color="#60A5FA" />
                </Pressable>
                <Pressable onPress={handleClearAll} style={styles.clearIcon}>
                  <MaterialCommunityIcons name="trash-can-outline" size={30} color="#EF4444" />
                </Pressable>
              </View>
            </View>

            {/* ---------- ⬇️ Store row อยู่ตรงนี้ ⬇️ ---------- */}
            {!!store && (
              <View style={styles.storeFooter}>
                <Text style={styles.storeLabel}>Store</Text>
                <Text style={styles.storeName}>{store}</Text>
              </View>
            )}
            {/* ----------------------------------------------- */}

            {loading && <ActivityIndicator size="small" color="#60A5FA" />}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View>
              <Text style={styles.itemText}>{item.name}</Text>
              <Text style={styles.itemText}>${item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.itemActions}>
              <Pressable onPress={() => handleEditItem(item)}>
                <Feather name="edit" size={18} color="#60A5FA" />
              </Pressable>
              <Pressable onPress={() => handleDeleteItem(item.id)}>
                <Feather name="trash-2" size={18} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        )}
        ListFooterComponent={
          imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.footerImage} />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Floating Scan Button */}
      <Pressable style={styles.fab} onPress={askPickOrCamera}>
        <Feather name="camera" size={28} color="#FFF" />
      </Pressable>

      {/* Edit Item Modal */}
      {editingItem && (
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#ccc"
                style={styles.input}
              />
              <TextInput
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="Price"
                keyboardType="decimal-pad"
                placeholderTextColor="#ccc"
                style={styles.input}
              />
              <View style={styles.modalButtons}>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Text style={{ color: "#ccc" }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveEditedItem}>
                  <Text style={{ color: "#60A5FA" }}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* ---------------------------- styles ----------------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  small: { color: "#94A3B8", fontSize: 16 },
  large: { color: "#FFF", fontSize: 28, fontWeight: "700" },
  avatar: { width: 48, height: 48, borderRadius: 24 },

  /* Latest Scan card */
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  cardLabel: { color: "#94A3B8", fontSize: 14, textAlign: "center" },
  cardValue: { color: "#FFF", fontSize: 16, fontWeight: "600", textAlign: "center" },

  /* Search */
  search: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 24,
  },
  searchInput: { flex: 1, marginLeft: 8, color: "#FFF", fontSize: 16 },

  /* Categories */
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  categoryBtn: {
    backgroundColor: "#1E293B",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    width: 72,
  },
  categoryLabel: { color: "#FFF", fontSize: 12, marginTop: 6, textAlign: "center" },

  /* Scanned items section */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
  },
  sectionTitle: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  sectionRight: { flexDirection: "row", alignItems: "center" },
  totalText: { color: "#8ed98d", fontSize: 18, marginRight: 8 },
  saveIcon: { marginHorizontal: 14},
  clearIcon: { padding: 4 },

  /* Item row */
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemText: { color: "#FFF", fontSize: 16 },
  itemActions: { flexDirection: "row", gap: 12 },

  /* Store row (ตอนนี้อยู่ด้านบนสุดของ list) */
  storeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  storeLabel: { color: "#94A3B8", fontSize: 16 },
  storeName: { color: "#FACC15", fontSize: 16, fontWeight: "600" },

  /* Footer image */
  footerImage: { width: "100%", height: 200, marginTop: 12, borderRadius: 16 },

  /* Floating action button */
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    backgroundColor: "#6366F1",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    width: "80%",
  },
  modalTitle: { color: "#FFF", fontSize: 18, fontWeight: "600", marginBottom: 12 },
  input: {
    backgroundColor: "#334155",
    borderRadius: 8,
    padding: 10,
    color: "#FFF",
    marginBottom: 12,
  },
  modalButtons: { flexDirection: "row", justifyContent: "space-between" },
});
