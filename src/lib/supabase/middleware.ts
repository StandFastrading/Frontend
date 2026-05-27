import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";
import {
  MOCK_ONBOARDED_COOKIE,
  MOCK_SESSION_COOKIE,
} from "@/features/auth/mock-session";

const PROTECTED_PREFIXES = ["/dashboard", "/desk", "/rules-risk", "/journal", "/trades", "/account"];
const AUTH_PREFIXES = ["/auth"];

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p));

  const hasMockSession =
    request.cookies.get(MOCK_SESSION_COOKIE)?.value === "1";
  const hasMockOnboarded =
    request.cookies.get(MOCK_ONBOARDED_COOKIE)?.value === "1";

  // Mock auth fast path — present in dev until real Supabase login is wired
  // into the form flows. Takes precedence over Supabase so the cookie is the
  // single source of truth and we don't double-redirect.
  if (hasMockSession) {
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = hasMockOnboarded ? ROUTES.dashboard : ROUTES.onboarding;
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (isProtected && !hasMockOnboarded) {
      const url = request.nextUrl.clone();
      url.pathname = ROUTES.onboarding;
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // Public paths (incl. splash `/`) skip Supabase entirely — keeps the site
  // serving even when Supabase env vars are absent (e.g. splash-only deploy).
  if (!isProtected) {
    return NextResponse.next({ request });
  }

  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
  } catch {
    // Env not configured on this deploy → can't check session. Pass through;
    // the page itself will surface a clearer error if it actually renders.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.auth;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
