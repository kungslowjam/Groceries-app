// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ดึงค่าจาก env (อย่าใช้ !)  
const SUPABASE_URL       = process.env.SUPABASE_URL;  
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY;  

// ตรวจสอบ runtime ว่ามีค่าจริงหรือไม่  
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {  
  throw new Error(
    'Missing Supabase config. ' +
    'กรุณาตั้ง SUPABASE_URL และ SUPABASE_ANON_KEY ใน env ให้ถูกต้อง'
  );  
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
