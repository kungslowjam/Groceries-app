import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuid } from "uuid";

/** ----------  shared types  ---------- */
export type Item = {
  id: string;
  name: string;
  price: number;
  /** optional until your OCR page really assigns it */
  category?: string;
};

export type Session = {
  id: string;
  timestamp: string;     // ISO string keeps “YYYY-MM” easy to slice
  store?: string;
  items: Item[];
};

/** ----------  storage helpers  ---------- */
const KEY = "SHOPPER_HISTORY";

export async function loadHistory(): Promise<Session[]> {
  const json = await AsyncStorage.getItem(KEY);
  return json ? (JSON.parse(json) as Session[]) : [];
}

export async function saveHistory(sessions: Session[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(sessions));
}

/** Convenience for the OCR page so you never forget an id/timestamp */
export async function addSession(
  items: Item[],
  store?: string
): Promise<void> {
  const newOne: Session = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    store,
    items,
  };
  const all = await loadHistory();
  await saveHistory([newOne, ...all]);
}
