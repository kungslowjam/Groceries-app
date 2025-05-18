/* ------------------------------------------------------------------ */
/*  AnalyticsPage.tsx – no forEach / no assignment-in-expression       */
/* ------------------------------------------------------------------ */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useI18n } from "../../lib/i18n";



/* ---------- constants & types ---------- */
const CATEGORIES = ["Fruits", "Dairy", "Bakery", "Snacks"] as const;
type Category = (typeof CATEGORIES)[number];

type Item    = { id: string; name: string; price: number; category: Category | "Others" };
type Session = { id: string; timestamp: string; items: Item[]; store?: string };

const COLORS = {
  bg:   "#0F172A",
  card: "#1E293B",
  text: "#F1F5F9",
  sub:  "#94A3B8",
  grid: "#334155", // Used for legend item background for contrast
  blue: "#60A5FA",
  pie:  ["#38BDF8", "#34D399", "#F97316", "#F43F5E"],
  others: "#64748B",
};

/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [range, setRange] = useState<'month' | '3months' | 'year'>('month');
  const fadeAnim = useState(new Animated.Value(0))[0];

  /* load history on focus */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem("SHOPPER_HISTORY");
          if (!raw) return;
          const parsed: Session[] = JSON.parse(raw);
          setSessions(parsed);
        } catch {
          Alert.alert("Error", "Failed to load history.");
        }
      })();
    }, [])
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [range, sessions, fadeAnim]);

  /* ---------- monthly totals ---------- */
  const monthTotals: Record<string, number> = {};
  for (const s of sessions) {
    const key = s.timestamp.slice(0, 7);        // YYYY-MM
    let sum = 0;
    for (const it of s.items) sum += it.price;
    monthTotals[key] = Math.round((monthTotals[key] ?? 0) + sum);
  }

  /* months: this month → next 6 */
  const now = new Date();
  let months: string[] = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const labels = months.map((ym) => {
    const [y, m] = ym.split("-");
    return new Date(+y, +m - 1).toLocaleString("en-US", { month: "short" });
  });
  const dataPoints = months.map((ym) => monthTotals[ym] ?? 0);

  /* ---------- category totals ---------- */
  const catTotals: Record<Category, number> = { Fruits: 0, Dairy: 0, Bakery: 0, Snacks: 0 };
  let others = 0;

  for (const s of sessions) {
    for (const it of s.items) {
      if (CATEGORIES.includes(it.category as Category)) {
        catTotals[it.category as Category] += it.price;
      } else {
        others += it.price;
      }
    }
  }

  /* round numbers – avoid assignment in expression */
  for (const cat of CATEGORIES) {
    const rounded = Math.round(catTotals[cat]);
    catTotals[cat] = rounded;
  }
  others = Math.round(others);

  const pieData = [
    ...CATEGORIES.map((cat, idx) => ({
      name: cat,
      amount: catTotals[cat],
      color: COLORS.pie[idx],
    })),
    ...(others > 0 ? [{ name: "Others", amount: others, color: COLORS.others }] : []),
  ];

  /* ---------- layout sizes ---------- */
  const width = Dimensions.get("window").width - 96;

  /* ---------- Time Range Filter ---------- */
  let filteredSessions: Session[] = [];
  if (range === 'month') {
    const ym = now.toISOString().slice(0, 7);
    filteredSessions = sessions.filter(s => s.timestamp.slice(0, 7) === ym);
  } else if (range === 'year') {
    const y = now.getFullYear().toString();
    filteredSessions = sessions.filter(s => s.timestamp.slice(0, 4) === y);
  } else {
    filteredSessions = sessions;
  }

  /* ---------- Comparison ---------- */
  let prevSessions: Session[] = [];
  if (range === 'month') {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1);
    const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    prevSessions = sessions.filter(s => s.timestamp.slice(0, 7) === prevYm);
  } else if (range === 'year') {
    const prevY = (now.getFullYear() - 1).toString();
    prevSessions = sessions.filter(s => s.timestamp.slice(0, 4) === prevY);
  }
  const thisTotal = filteredSessions.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + i.price, 0), 0);
  const prevTotal = prevSessions.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + i.price, 0), 0);
  const percentChange = prevTotal === 0 ? null : ((thisTotal - prevTotal) / prevTotal) * 100;

  /* ---------- Top 3 Items ---------- */
  const allItems = filteredSessions.flatMap(s => s.items);
  const topMap: Record<string, number> = {};
  allItems.forEach(i => { topMap[i.name] = (topMap[i.name] || 0) + i.price; });
  const top3 = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

  /* ---------- Export CSV ---------- */
  const exportCSV = async () => {
    const csv = filteredSessions.map(s =>
      `${s.timestamp},${s.store ?? ''},${s.items.map(i => `${i.name}:${i.price}`).join('|')}`
    ).join('\n');
    const fileUri = FileSystem.documentDirectory + 'history.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
  };

  /* ---------- render ---------- */
  return (
    <Animated.ScrollView style={[styles.container, { opacity: fadeAnim }]} contentContainerStyle={styles.inner}>
      {/* Header + Filter */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="chart-bar" size={28} color="#6366F1" style={{ marginRight: 10 }} />
          <Text style={[styles.title, { marginBottom: 0 }]}>{t('analyse')}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { key: 'month', label: t('monthlySpending') },
            { key: 'year', label: 'YTD' },
          ].map(opt => (
            <Pressable
              key={opt.key}
              style={{
                backgroundColor: range === opt.key ? '#6366F1' : '#1E293B',
                borderRadius: 12,
                paddingHorizontal: 18,
                paddingVertical: 8,
              }}
              onPress={() => setRange(opt.key as any)}
            >
              <Text style={{
                color: range === opt.key ? '#FFF' : '#94A3B8',
                fontWeight: '700',
                fontSize: 15,
              }}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Comparison */}
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        {percentChange !== null && (
          <Text style={{ color: percentChange >= 0 ? '#22C55E' : '#EF4444', fontWeight: '700' }}>
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(1)}% {percentChange >= 0 ? '↑' : '↓'} {t('compareToPrev')}
          </Text>
        )}
      </View>

      {/* Line Chart */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#60A5FA" style={{ marginRight: 8 }} />
            <Text style={styles.chartTitle}>{t('monthlySpendChart')}</Text>
          </View>
          <LineChart
            data={{ labels, datasets: [{ data: dataPoints, color: () => COLORS.blue }] }}
            width={width}
            height={200}
            chartConfig={chartConfig}
            style={{ ...styles.chart, borderRadius: 20 }}
            bezier
            segments={4}
            fromZero
          />
        </View>
      </Animated.View>

      {/* Pie Chart + Legend */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="chart-pie" size={20} color="#FACC15" style={{ marginRight: 8 }} />
            <Text style={styles.chartTitle}>{t('categorySpendChart')}</Text>
          </View>
          {pieData.some(d => d.amount > 0) ? (
            <>
              <PieChart
                data={pieData}
                width={width}
                height={200}
                chartConfig={chartConfig}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="95"
                hasLegend={false}
                style={{ ...styles.chart, borderRadius: 20 }}
              />
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 12,
                marginTop: 18,
              }}>
                {pieData.map((slice) => {
                  const totalAmount = pieData.reduce((sum, d) => sum + d.amount, 0);
                  const percent = totalAmount > 0 ? ((slice.amount / totalAmount) * 100).toFixed(1) : "0.0";
                  return (
                    <View
                      key={slice.name}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#232D4D',
                        borderRadius: 20,
                        paddingVertical: 8,
                        paddingHorizontal: 18,
                        margin: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.10,
                        shadowRadius: 6,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          slice.name === "Fruits" ? "fruit-cherries"
                          : slice.name === "Dairy" ? "cow"
                          : slice.name === "Bakery" ? "bread-slice"
                          : slice.name === "Snacks" ? "food"
                          : "shape"
                        }
                        size={20}
                        color={slice.color}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={{ color: slice.color, fontWeight: '700', fontSize: 15, marginRight: 6 }}>
                        {slice.name}
                      </Text>
                      <Text style={{ color: "#FFF", fontWeight: '700', fontSize: 15, marginRight: 6 }}>
                        ${slice.amount}
                      </Text>
                      <Text style={{ color: "#FACC15", fontWeight: '700', fontSize: 15 }}>
                        ({percent}%)
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.noData}>{t('noData')}</Text>
          )}
        </View>
      </Animated.View>

      {/* Top 3 Items */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialCommunityIcons name="star" size={20} color="#F472B6" style={{ marginRight: 8 }} />
          <Text style={styles.chartTitle}>{t('top3Items')}</Text>
        </View>
        {top3.length === 0 ? (
          <Text style={styles.noData}>{t('noData')}</Text>
        ) : (
          top3.map(([name, total], idx) => (
            <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }}>
              <Text style={{ color: '#FFF', fontWeight: '600' }}>{idx + 1}. {name}</Text>
              <Text style={{ color: '#60A5FA', fontWeight: '700' }}>${total.toFixed(2)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Export Button */}
      <Pressable
        style={{ backgroundColor: '#60A5FA', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 12 }}
        onPress={exportCSV}
      >
        <Text style={{ color: '#FFF', fontWeight: '700' }}>Export CSV</Text>
      </Pressable>
    </Animated.ScrollView>
  );
}

/* ---------- chart config & styles ---------- */
const chartConfig = {
  backgroundGradientFrom: "#232D4D",
  backgroundGradientTo: "#232D4D",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`, // blue
  labelColor: (opacity = 1) => `rgba(250, 250, 250, ${opacity})`,
  propsForDots: {
    r: "6",
    strokeWidth: "3",
    stroke: "#FACC15", // yellow
    fill: "#60A5FA",
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  propsForBackgroundLines: {
    strokeDasharray: "4 4",
    stroke: "#334155",
  },
  style: {
    borderRadius: 20,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner:     { padding: 16, paddingBottom: 32 }, // Added paddingBottom for scroll
  title:     { fontSize: 24, fontWeight: "700", color: COLORS.text, marginBottom: 16 },

  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 20, marginBottom: 20 },
  h2:   { color: COLORS.text, fontSize: 18, fontWeight: "600", marginBottom: 12 }, // Increased margin

  chart:  { borderRadius: 12 },
  noData: { color: COLORS.sub, textAlign: "center", fontStyle: "italic", paddingVertical: 20 }, // Added padding

  // --- Updated Legend Styles ---
  legendRow:  {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#232D4D",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    margin: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  legendIcon: {
    marginRight: 6, // Space between icon and label
  },
  legendLabel:{
    color: "#FACC15",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 8,
  },
  legendAmount:{
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
  },
  chartTitle: { color: COLORS.text, fontSize: 16, fontWeight: "700", marginBottom: 10, textAlign: "left" },
});