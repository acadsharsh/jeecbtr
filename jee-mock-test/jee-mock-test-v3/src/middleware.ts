import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/auth/sign-in", "/auth/sign-up"];

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          req.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: req.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = req.nextUrl;

  const isPublicTestPage = pathname.startsWith("/tests/") &&
    !pathname.includes("/attempt") && !pathname.includes("/results");
  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith("/auth/"));
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && !isPublicRoute && !isPublicTestPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/auth/sign-in", req.url));
  }

  if (user && pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
