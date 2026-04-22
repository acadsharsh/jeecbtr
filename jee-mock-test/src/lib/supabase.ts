import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─── Browser client — uses @supabase/ssr so session is stored in cookies ──
// Cookies are required so the middleware (createServerClient) can read the
// session on every request. The old createClient() stored the session in
// localStorage, which the middleware cannot see, causing the reload loop.
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── Service role client — server only, new instance each call ────────────
export function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
