import { createClient } from "@supabase/supabase-js";

// Adding explicit fallbacks so the app works without needing to restart the Next.js dev server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bgmkfhdxvngasyeznmpr.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbWtmaGR4dm5nYXN5ZXpubXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjIwMTgsImV4cCI6MjA5MDE5ODAxOH0.FixJnOSdAmh1W6tsT5dW11kM_UugK1j362lHZa-pbxk";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
