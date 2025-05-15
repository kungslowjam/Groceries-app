import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Define types
type Item = { id: string; name: string; price: number };
type Session = { id: string; timestamp: string; store?: string; items: Item[] };

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const saved = await AsyncStorage.getItem("SHOPPER_HISTORY");
          if (saved) {
            setSessions(JSON.parse(saved));
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
            const newSessions = sessions.filter((s) => s.id !== sessionId);
            setSessions(newSessions);
            await AsyncStorage.setItem("SHOPPER_HISTORY", JSON.stringify(newSessions));
          } catch {
            Alert.alert("Error", "Failed to delete session.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🕘 History</Text>

      {sessions.length === 0 ? (
        <Text style={styles.empty}>No saved sessions.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {sessions.map((session) => {
            const total = session.items.reduce((sum, i) => sum + i.price, 0);
            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <View>
                    <Text style={styles.sessionTime}>{session.timestamp}</Text>
                    <Text style={styles.sessionStore}>🏪 {session.store || "Unknown Store"}</Text>
                  </View>
                  <Pressable onPress={() => handleDeleteSession(session.id)}>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={30}
                      color="#EF4444"
                    />
                  </Pressable>
                </View>

                <FlatList
                  data={session.items}
                  keyExtractor={(i) => i.id}
                  renderItem={({ item }) => (
                    <View style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                  )}
                  scrollEnabled={false}
                />

                <View style={styles.sessionFooter}>
                  <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
                </View>
              </View>
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
  scroll: { paddingBottom: 80 },
  empty: { color: "#94A3B8", fontStyle: "italic", textAlign: "center" },

  sessionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionTime: {
    color: "#60A5FA",
    fontWeight: "600",
  },
  sessionStore: {
    color: "#FACC15",
    fontSize: 14,
    marginTop: 2,
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
    textAlign: "right",
    color: "#A5B4FC",
    fontWeight: "600",
    fontSize: 16,
  },
});
