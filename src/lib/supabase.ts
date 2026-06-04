import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";

// Pulling securely from environment variables only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy-url-for-build.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key-for-build";

export function useClerkSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken({ template: "supabase" });
          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set("Authorization", `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [getToken]);
}

// Still exposing standard client for API routes or anonymous Server Actions
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
