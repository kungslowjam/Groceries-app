// HomePage.tsx
import { extractTextFromImage } from "@/services/ocrService";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import Svg, { Circle } from 'react-native-svg';

import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
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
import { loadHistory } from '../../lib/history';
import { supabase } from '../../lib/supabase';

type Category = { id: string; icon: IconData; label: string };
type Item = { id: string; name: string; price: number };
type IconData = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const STORAGE_KEY = "SHOPPER_ITEMS";
const BUDGET_KEY = "SHOPPER_BUDGET";

const categories: Category[] = [
  { id: "1", icon: "fruit-cherries", label: "Fruits" },
  { id: "2", icon: "leaf", label: "Veggies" },
  { id: "3", icon: "cow", label: "Dairy" },
  { id: "4", icon: "bread-slice", label: "Bakery" },
];

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [store, setStore] = useState("");
  const [user, setUser] = useState<any>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [fadeAnim] = useState(new Animated.Value(0));
  const [history, setHistory] = useState<any[]>([]);

  const totalNumber = items.reduce((sum, item) => sum + item.price, 0);
  const total = totalNumber.toFixed(2);
  const isBudgetValid = typeof budget === 'number' && budget > 0;

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(BUDGET_KEY);
      if (saved) setBudget(Number(saved));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const h = await loadHistory();
      setHistory(h);
    })();
  }, []);

  // โหลด history ใหม่ทุกครั้งที่เปลี่ยน tab (focus)
  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const h = await loadHistory();
        setHistory(h);
      })();
    }, [])
  );

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

      // โหลด history ใหม่หลัง save
      const h = await loadHistory();
      setHistory(h);

      // ล้างตะกร้าและข้อมูลที่เกี่ยวข้องหลัง save
      setItems([]);
      setStore("");
      setImageUri(null);

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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSaveBudget = async () => {
    const value = Number(budgetInput);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Please enter a correct budget.");
      return;
    }
    setBudget(value);
    await AsyncStorage.setItem(BUDGET_KEY, value.toString());
    setBudgetInput("");
    Alert.alert("Budget recorded");
  };

  /* ---------------------------- render ----------------------------- */
  const changeMonth = (offset: number) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  const selectedMonthStr = selectedMonth.toISOString().slice(0, 7);
  const prevMonth = new Date(selectedMonth);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const prevMonthStr = prevMonth.toISOString().slice(0, 7);

  const getMonthStats = (monthStr: string) => {
    const sessions = history.filter((s: any) => s.timestamp.slice(0, 7) === monthStr);
    const total = sessions.reduce((sum: number, session: any) => sum + session.items.reduce((s: number, i: any) => s + i.price, 0), 0);
    return {
      total,
      sessions: sessions.length,
      average: sessions.length > 0 ? total / sessions.length : 0,
    };
  };
  const thisMonthStats = getMonthStats(selectedMonthStr);
  const prevMonthStats = getMonthStats(prevMonthStr);

  const percentChange = prevMonthStats.total === 0 ? null : ((thisMonthStats.total - prevMonthStats.total) / prevMonthStats.total) * 100;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [selectedMonthStr, fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      {/* ------------ Header ------------ */}
      <View style={styles.header}>
        <View>
          <Text style={styles.small}>Hello,</Text>
          <Text style={styles.largeMinimal}>
            {user?.user_metadata?.name || user?.email || "Hi Shopper"}
          </Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.avatarShadow}>
          <Image
            source={{
              uri:
                user?.user_metadata?.avatar_url ||
                user?.user_metadata?.picture ||
                "https://i.pravatar.cc/100",
            }}
            style={styles.avatar}
          />
        </Pressable>
      </View>

      {/* ----------- Content ------------ */}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <>
            {/* Monthly Spend Card (ใหม่) */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                backgroundColor: "#6674F6",
                borderRadius: 20,
                padding: 20,
                marginBottom: 24,
                shadowColor: "#A5A8F0",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.18,
                shadowRadius: 24,
                elevation: 12,
                // Neumorphism (outset + inset)
                borderWidth: 1,
                borderColor: "#7C83F6",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: 0.5 }}>Monthly Spend</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => changeMonth(-1)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                    <Feather name="chevron-left" size={22} color="#FFF" />
                  </Pressable>
                  <Pressable onPress={() => changeMonth(1)} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                    <Feather name="chevron-right" size={22} color="#FFF" />
                  </Pressable>
                </View>
              </View>
              <Text style={{ color: "#E0E7FF", fontSize: 14, marginTop: 0, marginBottom: 12, letterSpacing: 0.2 }}>
                {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
                {/* Total */}
                <View style={{ alignItems: "center", minWidth: 80 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color="#FFF" />
                    <Text style={{ color: "#E0E7FF", fontSize: 14, letterSpacing: 0.2 }}>Total</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "700", letterSpacing: 0.5, fontVariant: ["tabular-nums"] }}>${thisMonthStats.total.toFixed(2)}</Text>
                    {percentChange !== null && (
                      <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 2 }}>
                        <Feather
                          name={percentChange >= 0 ? "arrow-up-right" : "arrow-down-right"}
                          size={14}
                          color={percentChange >= 0 ? "#22C55E" : "#EF4444"}
                        />
                        <Text style={{ color: percentChange >= 0 ? "#22C55E" : "#EF4444", fontSize: 13, fontWeight: "600", marginLeft: 2 }}>
                          {percentChange >= 0 ? "+" : ""}{percentChange.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                {/* Sessions */}
                <View style={{ alignItems: "center", minWidth: 80 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name="chart-bar" size={16} color="#FFF" />
                    <Text style={{ color: "#E0E7FF", fontSize: 14, letterSpacing: 0.2 }}>Sessions</Text>
                  </View>
                  <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "600", letterSpacing: 0.5, marginTop: 2 }}>{thisMonthStats.sessions}</Text>
                </View>
                {/* Average */}
                <View style={{ alignItems: "center", minWidth: 80 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <MaterialCommunityIcons name="timer-outline" size={16} color="#FFF" />
                    <Text style={{ color: "#E0E7FF", fontSize: 14, letterSpacing: 0.2 }}>Average</Text>
                  </View>
                  <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "600", letterSpacing: 0.5, marginTop: 2 }}>${thisMonthStats.average.toFixed(2)}</Text>
                </View>
              </View>
            </Animated.View>

            {/* Budget Section (แทน Search Bar) */}
            <View style={{
              backgroundColor: "#6674F6",
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.10,
              shadowRadius: 8,
              elevation: 4,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
                  Your budget status
                </Text>
                <Text style={{ color: "#E0E7FF", fontSize: 14, marginBottom: 12 }}>
                  {budget !== null
                    ? Number(total) > budget
                      ? "You have exceeded your budget!"
                      : "You're on track with your budget."
                    : "Set your budget to track your spending."}
                </Text>
                {budget === null ? (
                  <>
                    <TextInput
                      style={{
                        backgroundColor: "#6361F1",
                        borderRadius: 8,
                        padding: 10,
                        color: "#FFF",
                        marginBottom: 8,
                      }}
                      placeholder="Set your budget (THB)"
                      placeholderTextColor="#ccc"
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="numeric"
                    />
                    <Pressable
                      style={{
                        backgroundColor: "#FFF",
                        padding: 10,
                        borderRadius: 8,
                        alignItems: "center",
                      }}
                      onPress={handleSaveBudget}
                    >
                      <Text style={{ color: "#6366F1", fontWeight: "700" }}>Save budget</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      backgroundColor: "#a5a8f0",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                    onPress={async () => {
                      setBudget(null);
                      await AsyncStorage.removeItem(BUDGET_KEY);
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "600" }}>Remove budget</Text>
                  </Pressable>
                )}
              </View>
              {isBudgetValid && (
                <View style={{ alignItems: "center", marginLeft: 16, justifyContent: "center" }}>
                  <AnimatedProgressRing
                    size={80}
                    strokeWidth={10}
                    progress={Math.min(thisMonthStats.total / budget, 1)}
                    color={thisMonthStats.total > budget ? "#EF4444" : "#6674F6"}
                    bgColor="#E0E7FF"
                    textColor="#FFF"
                  />
                  <Text style={{
                    color: thisMonthStats.total > budget ? "#EF4444" : "#FFF",
                    fontWeight: "700",
                    fontSize: 13,
                    marginTop: 6,
                    alignSelf: "center"
                  }}>
                    {thisMonthStats.total > budget ? "Over budget" : "In budget"}
                  </Text>
                </View>
              )}
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

      {/* Floating Scan Button (modern minimal) */}
      <Pressable style={styles.fabMinimal} onPress={askPickOrCamera}>
        <LinearGradient
          colors={["#6366F1", "#60A5FA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradientMinimal}
        >
          <Feather name="camera" size={28} color="#FFF" />
        </LinearGradient>
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
  largeMinimal: { color: "#FFF", fontSize: 32, fontWeight: "800", letterSpacing: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarShadow: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, borderRadius: 24 },

  /* Latest Scan card */
  cardMinimal: { backgroundColor: "#6674F6", borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
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
  cardLabel: { color: "#FFF", fontSize: 14, textAlign: "center" },
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
  fabMinimal: { position: "absolute", right: 24, bottom: 24, borderRadius: 28, overflow: "hidden", elevation: 6 },
  fabGradientMinimal: { width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 28 },

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

// Animated Progress Ring
function AnimatedProgressRing({ size = 80, strokeWidth = 10, progress = 0, color = "#FACC15", bgColor = "#E0E7FF", duration = 900, textColor = "#FFF" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference},${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{
        position: 'absolute',
        color: textColor,
        fontWeight: '700',
        fontSize: 20,
        letterSpacing: 1,
      }}>{`${Math.round(progress * 100)}%`}</Text>
    </View>
  );
}
