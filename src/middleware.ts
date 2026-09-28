import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const FALLBACK_URL = "https://lumrqtxmdcrjxjxzrqau.supabase.co";
  const FALLBACK_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1bXJxdHhtZGNyanhqeHpycWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0NjU0MDcsImV4cCI6MjEwNjA0MTQwN30.icWubZZEdIk1aX_TvcYn8xuS4_WabCSDvokDVvfXz0E";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect internal routes if user is not authenticated
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/juri") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/peserta");

  if (!user && isProtectedRoute) {
    // If not logged in, redirect to /masuk
    const url = request.nextUrl.clone();
    url.pathname = "/masuk";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If logged in, check role and active status for route authorization
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "peserta";
    const isActive = profile?.is_active ?? true;

    // Blokir akun nonaktif (kecuali super_admin agar tidak terjadi lockout sistem)
    if (!isActive && role !== "super_admin") {
      // Paksa sign out di sisi server agar session token tidak bisa dipakai lagi
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("error", "nonaktif");
      return NextResponse.redirect(url);
    }

    // RBAC logic
    if (pathname.startsWith("/dashboard") && role !== "seksi_acara" && role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = role === "juri" ? "/juri" : role === "media_center" ? "/media" : "/peserta";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/juri") && role !== "juri" && role !== "seksi_acara" && role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/peserta";
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/media") && role !== "media_center" && role !== "seksi_acara" && role !== "super_admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/peserta";
      return NextResponse.redirect(url);
    }
  }

  // If logged in and visiting auth pages (/masuk, /daftar), redirect to respective home
  if (user && (pathname === "/masuk" || pathname === "/daftar")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "peserta";
    const url = request.nextUrl.clone();
    url.pathname =
      role === "seksi_acara" || role === "super_admin"
        ? "/dashboard"
        : role === "juri"
        ? "/juri"
        : role === "media_center"
        ? "/media"
        : "/peserta";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
