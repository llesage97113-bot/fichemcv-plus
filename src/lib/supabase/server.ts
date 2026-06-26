import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieResponse = Pick<NextResponse, "cookies" | "headers">;

export async function createClient(response?: CookieResponse) {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            response?.cookies.set(name, value, options);
            cookieStore.set(name, value, options);
          });
          Object.entries(headers).forEach(([name, value]) => {
            response?.headers.set(name, value);
          });
        } catch {
          // Peut être appelé depuis un Server Component.
          // Le middleware/proxy prendra ensuite le relais pour rafraîchir la session.
        }
      },
    },
  });
}
