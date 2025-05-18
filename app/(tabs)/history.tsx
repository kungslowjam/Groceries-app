import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useI18n } from "../../lib/i18n";

// Define types
type Item = { id: string; name: string; price: number };
type Session = { id: string; timestamp: string; store?: string; items: Item[] };

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [search, setSearch] = useState("");
  const [animVals, setAnimVals] = useState<{ [id: string]: Animated.Value }>({});

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const saved = await AsyncStorage.getItem("SHOPPER_HISTORY");
          if (saved) {
            const data: Session[] = JSON.parse(saved);
            setSessions(data);
            // set animation values
            const anims: { [id: string]: Animated.Value } = {};
            data.forEach(s => { anims[s.id] = new Animated.Value(0); });
            setAnimVals(anims);
            // animate in
            data.forEach(s => {
              Animated.timing(anims[s.id], {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }).start();
            });
          }
        } catch (e) {
          console.warn("Failed to load history.", e);
        }
      })();
    }, [])
  );

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert("Delete Session", "Are you sure you want to delete this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // animate out
            Animated.timing(animVals[sessionId], {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              const newSessions = sessions.filter((s) => s.id !== sessionId);
              setSessions(newSessions);
              AsyncStorage.setItem("SHOPPER_HISTORY", JSON.stringify(newSessions));
            });
          } catch {
            Alert.alert("Error", "Failed to delete session.");
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to delete all history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          setSessions([]);
          await AsyncStorage.setItem("SHOPPER_HISTORY", JSON.stringify([]));
        },
      },
    ]);
  };

  // Filter sessions by search
  const filteredSessions = sessions.filter(s => {
    const q = search.toLowerCase();
    return (
      s.store?.toLowerCase().includes(q) ||
      s.items.some(i => i.name.toLowerCase().includes(q)) ||
      formatDate(s.timestamp).includes(q)
    );
  });

  // Color palette for session cards
  const cardColors = ["#1E293B", "#232D4D", "#283655", "#334155"];
  const iconList = ["calendar", "store", "clock", "receipt"];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🕘 {t('history')}</Text>

      {/* Search & Total */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <TextInput
          style={styles.search}
          placeholder="Search by store, item, date..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        <Pressable onPress={handleClearAll} style={styles.clearAllBtn}>
          <MaterialCommunityIcons name="delete-sweep" size={24} color="#EF4444" />
        </Pressable>
      </View>
      {/* <Text style={styles.totalText}>{t('total')}: ${totalSpend.toFixed(2)}</Text> */}

      {filteredSessions.length === 0 ? (
        <Text style={styles.empty}>{t('noSavedSessions')}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {filteredSessions.map((session, idx) => {
            const total = session.items.reduce((sum, i) => sum + i.price, 0);
            const itemCount = session.items.length;
            const cardColor = cardColors[idx % cardColors.length];
            const iconName = iconList[idx % iconList.length] as any;
            return (
              <Animated.View
                key={session.id}
                style={{
                  opacity: animVals[session.id] || 1,
                  transform: [{ scale: animVals[session.id] || 1 }],
                  marginBottom: 18,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 6,
                }}
              >
                <View
                  style={{
                    borderRadius: 20,
                    backgroundColor: cardColor,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: "#334155",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialCommunityIcons name={iconName} size={24} color="#FACC15" />
                      <Text style={{ color: "#60A5FA", fontWeight: "700", fontSize: 16 }}>
                        {formatDate(session.timestamp)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteSession(session.id)}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? "#EF4444" : "#232D4D",
                        borderRadius: 8,
                        padding: 6,
                      })}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={24}
                        color="#EF4444"
                      />
                    </Pressable>
                  </View>
                  <Text style={{ color: "#FACC15", fontSize: 15, fontWeight: "600" }}>
                    🏪 {session.store || "Unknown Store"}
                  </Text>
                  <Text style={{ color: "#A5B4FC", fontSize: 13, marginBottom: 2 }}>
                    {itemCount} items
                  </Text>
                  <FlatList
                    data={session.items}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                        <Text style={{ color: "#FFF", fontSize: 16 }}>{item.name}</Text>
                        <Text style={{ color: "#FFF", fontSize: 16 }}>${item.price.toFixed(2)}</Text>
                      </View>
                    )}
                    scrollEnabled={false}
                  />
                  <View style={{ borderTopColor: "#334155", borderTopWidth: 1, marginTop: 10, paddingTop: 8 }}>
                    <Text style={{ textAlign: "right", color: "#A5B4FC", fontWeight: "700", fontSize: 16 }}>
                      Total: ${total.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 16 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 16,
  },
  search: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFF",
    fontSize: 16,
    marginRight: 8,
  },
  clearAllBtn: {
    backgroundColor: "#232D4D",
    borderRadius: 8,
    padding: 8,
  },
  scroll: { paddingBottom: 80 },
  empty: { color: "#94A3B8", fontStyle: "italic", textAlign: "center" },
  sessionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionTime: {
    color: "#60A5FA",
    fontWeight: "600",
    fontSize: 15,
  },
  sessionStore: {
    color: "#FACC15",
    fontSize: 14,
    marginTop: 2,
    marginBottom: 2,
  },
  sessionCount: {
    color: "#A5B4FC",
    fontSize: 13,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemName: { color: "#FFF", fontSize: 16 },
  itemPrice: { color: "#FFF", fontSize: 16 },
  sessionFooter: {
    borderTopColor: "#334155",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  totalText: {
    // textAlign: "right",
    // color: "#A5B4FC",
    // fontWeight: "600",
    // fontSize: 16,
    // marginBottom: 4,
  },
});
