import { MaterialCommunityIcons } from "@expo/vector-icons";
/* ------------------------------------------------------------------ */
/*  AnalyticsPage.tsx – no forEach / no assignment-in-expression       */
/* ------------------------------------------------------------------ */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-chart-kit";

/* ---------- constants & types ---------- */
const CATEGORIES = ["Fruits", "Dairy", "Bakery", "Snacks"] as const;
type Category = (typeof CATEGORIES)[number];

type Item    = { id: string; name: string; price: number; category: Category | "Others" };
type Session = { id: string; timestamp: string; items: Item[] };

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

const CAT_ICONS: Record<Category | "Others", keyof typeof MaterialCommunityIcons.glyphMap> = {
  Fruits: "fruit-cherries",
  Dairy:  "cow",
  Bakery: "bread-slice",
  Snacks: "food",
  Others: "shape",
};

/* ------------------------------------------------------------------ */
export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  /* load history on focus */
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem("SHOPPER_HISTORY");
          if (!raw) return;

          const parsed: Session[] = JSON.parse(raw);
          const cleaned: Session[] = [];

          for (const s of parsed) {
            const items: Item[] = [];
            for (const it of s.items) {
              items.push({ ...it, price: Number.isFinite(+it.price) ? +it.price : 0 });
            }
            cleaned.push({ ...s, items });
          }
          setSessions(cleaned);
        } catch {
          Alert.alert("Error", "Failed to load history.");
        }
      })();
    }, [])
  );

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
  const months: string[] = [];
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

  /* ---------- render ---------- */
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Analytics</Text>

      {/* Monthly Spending */}
      <View style={styles.card}>
        <Text style={styles.h2}>Monthly Spending</Text>
        {dataPoints.some((v) => v > 0) ? (
          <LineChart
            data={{ labels, datasets: [{ data: dataPoints, color: () => COLORS.blue }] }}
            width={width}
            height={200}
            chartConfig={chartConfig}
            style={styles.chart}
            bezier
            segments={4}
            fromZero
          />
        ) : <Text style={styles.noData}>No data</Text>}
      </View>

      {/* Category Spending */}
      <View style={styles.card}>
        <Text style={styles.h2}>Spending by Category</Text>

        {pieData.some((d) => d.amount > 0) ? (
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
            />

            {/* custom legend with icons + amounts */}
            <View style={styles.legendRow}>
              {pieData.map((slice) => (
                <View key={slice.name} style={styles.legendItem}>
                  <MaterialCommunityIcons
                    name={CAT_ICONS[slice.name as Category | "Others"]}
                    size={16}
                    color={slice.color}
                    style={styles.legendIcon} // Apply style from StyleSheet
                  />
                  <Text style={styles.legendLabel}>{slice.name}</Text>
                  <Text style={styles.legendAmount}> ${slice.amount}</Text>
                </View>
              ))}
            </View>
          </>
        ) : <Text style={styles.noData}>No data</Text>}
      </View>
    </ScrollView>
  );
}

/* ---------- chart config & styles ---------- */
const chartConfig = {
  backgroundGradientFrom: COLORS.card,
  backgroundGradientTo:   COLORS.card,
  decimalPlaces: 0,
  color:      () => COLORS.text,
  labelColor: () => COLORS.sub,
  propsForDots:            { r: "4", strokeWidth: "2", stroke: COLORS.blue },
  propsForBackgroundLines: { strokeDasharray: "3 3", stroke: COLORS.grid },
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
    justifyContent: "center", // Center items in the row
    marginTop: 16,             // More space above the legend
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.grid, // Background for "pill" look
    borderRadius: 16,             // Rounded corners for "pill"
    paddingVertical: 3,
    paddingHorizontal: 6,
    margin: 5,                   // Spacing around each item
  },
  legendIcon: {
    marginRight: 6, // Space between icon and label
  },
  legendLabel:{
    color: COLORS.text,
    fontSize: 12,
  },
  legendAmount:{
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6, // Space between label and amount
  },
});