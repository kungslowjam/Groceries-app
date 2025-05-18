// services/ocrService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as FileSystem from "expo-file-system";

const GEMINI_API_KEY = "AIzaSyBNslYOwf1Eh1BVStD9p6Qq5CWY-iIZNwU";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/* helper ------------------------------------------------------------ */
function getMimeType(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase();
  return ext === "png" ? "image/png" : "image/jpeg";
}

/* public ------------------------------------------------------------ */
export type OCRItem = { name: string; price: number; category: string };
export async function extractTextFromImage(
  uri: string
): Promise<{ store: string; items: OCRItem[] }> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
From the receipt image, return ONLY valid JSON in this exact shape:

{
  "store":  "<store name>",
  "items": [
    { "name": "<item>", "price": <number>, "category": "<Fruits|Veggies|Dairy|Bakery>" },
    ...
  ]
}

- Choose ONE of the four category strings for every item.
- If you’re unsure, default to "Bakery".
`;

    const result = await model.generateContent([
      { inlineData: { mimeType: getMimeType(uri), data: base64 } },
      prompt,
    ]);

    const raw = result.response.text();
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return {
      store: parsed.store ?? "Unknown Store",
      items: parsed.items ?? [],
    };
  } catch (err) {
    console.error("❌ Gemini OCR parse error:", err);
    return { store: "Unknown Store", items: [] };
  }
}
