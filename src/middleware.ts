import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Fallback ke Supabase project aktif (xdfwxvsgbopapwlrbzwj)
const FALLBACK_URL = "https://xdfwxvsgbopapwlrbzwj.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZnd4dnNnYm9wYXB3bHJiendqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNDA1NTYsImV4cCI6MjEwOTgxNjU1Nn0.1yfQRlP_LPYw0AyFSPZ3iafIZs_KzULr250rSxlKo5o";

// Timeout guard agar middleware tidak pernah terkena Vercel 504 MIDDLEWARE_INVOCATION_TIMEOUT
function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const pathname = request.nextUrl.pathname;

  // Protect internal routes if user is not authenticated
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/juri") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/peserta");

  const isAuthRoute = pathname === "/masuk" || pathname === "/daftar";

  // OPTIMASI LOG INGESTION & PERFORMA EDGE:
  // Lewati rute publik (/monitor, /lomba, /jadwal, /galeri, dsb.) tanpa menyentuh database
  if (!isProtectedRoute && !isAuthRoute) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

        try {
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

// Batasi durasi getUser maksimal 2.5 detik agar tidak 504 timeout di Vercel Edge
const userResult = await withTimeout(
  supabase.auth.getUser(),
  2500,
  { data: { user: null }, error: new Error("Auth timeout") } as any
);
const user = userResult?.data?.user;

    if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // If logged in, check role and active status for route authorization
    if (user && isProtectedRoute) {
      const profilePromise = supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();

      const profileResult = await withTimeout(profilePromise, 2000, { data: null, error: null } as any);
      const profile = profileResult?.data;

      const role = profile?.role || "peserta";
      const isActive = profile?.is_active ?? true;

      // Blokir akun nonaktif (kecuali super_admin)
      if (!isActive && role !== "super_admin") {
        await withTimeout(supabase.auth.signOut(), 1000, null as any);
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

          if (
            (pathname.startsWith("/dashboard/pengaturan/backup-restore") ||
              pathname.startsWith("/dashboard/pengaturan/simulasi-juri")) &&
            role !== "super_admin"
          ) {
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard/pengaturan";
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

        // Khusus role peserta: Cek tanggal buka akses
        if (pathname.startsWith("/peserta") && role === "peserta") {
          const accessSettingPromise = supabase
            .from("event_settings")
            .select("value")
            .eq("key", "participant_access_start_date")
            .maybeSingle();

            const accessSettingResult = await withTimeout(accessSettingPromise, 1500, { data: null, error: null } as any);
            const accessSetting = accessSettingResult?.data;

              const rawDate = typeof accessSetting?.value === "string" ? accessSetting.value.trim() : "";
              if (rawDate) {
                let targetMs = NaN;
                if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                  targetMs = new Date(`${rawDate}T00:00:00+07:00`).getTime();
                } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rawDate)) {
                  targetMs = new Date(
                    rawDate.includes("+") || rawDate.endsWith("Z") ? rawDate : `${rawDate}:00+07:00`.slice(0, 25)
                  ).getTime();
                } else {
                  targetMs = new Date(rawDate).getTime();
                }

                  if (!isNaN(targetMs) && Date.now() < targetMs) {
                    await withTimeout(supabase.auth.signOut(), 1000, null as any);
                    const url = request.nextUrl.clone();
                    url.pathname = "/masuk";
                    url.searchParams.set("error", "belum_dibuka");
                    return NextResponse.redirect(url);
                  }
                }
              }
            }

            // If logged in and visiting auth pages (/masuk, /daftar)
            if (user && (pathname === "/masuk" || pathname === "/daftar")) {
              const profilePromise = supabase
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

              const profileResult = await withTimeout(profilePromise, 1500, { data: null, error: null } as any);
              const role = profileResult?.data?.role || "peserta";

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
          } catch (error) {
            console.error("Middleware Supabase execution error/timeout:", error);
            // Jangan biarkan 504 menghentikan navigasi
            if (isProtectedRoute) {
              const url = request.nextUrl.clone();
              url.pathname = "/masuk";
              url.searchParams.set("redirect", pathname);
              return NextResponse.redirect(url);
            }
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
