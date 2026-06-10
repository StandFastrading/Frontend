import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getEnv } from "@/config/env";
import { ROUTES } from "@/config/routes";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/desk",
  "/rules-risk",
  "/journal",
  "/trades",
  "/account",
];
const AUTH_PREFIXES = ["/auth"];
const ONBOARDING_PREFIX = "/onboarding";

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PREFIXES.some((p) => path.startsWith(p));
  const isOnboarding = path.startsWith(ONBOARDING_PREFIX);

  // Public surface (splash, marketing, docs, etc.) skips Supabase entirely
  // so the site renders even without env vars on a marketing-only deploy.
  if (!isProtected && !isAuthPage && !isOnboarding) {
    return NextResponse.next({ request });
  }

  let env: ReturnType<typeof getEnv>;
  try {
    env = getEnv();
  } catch {
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

  // Onboarding status. profiles.onboarding_complete is the durable source of
  // truth. user_metadata is only a positive fast-path cache — it's set true at
  // completion but rides on the session token, which can carry stale claims
  // (e.g. a beta session minted before onboarding). So: trust metadata when it
  // says true (it's never falsely true), otherwise confirm against profiles.
  // This keeps the already-onboarded steady state query-free while fixing the
  // stale-token bounce that sent freshly-onboarded users back to /onboarding.
  let onboarded = user?.user_metadata?.onboarding_complete === true;
  if (user && !onboarded && (isAuthPage || isProtected)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();
    onboarded = profile?.onboarding_complete === true;
  }

  // Signed in but on /auth → bounce to dashboard or onboarding.
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = onboarded ? ROUTES.dashboard : ROUTES.onboarding;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Not signed in but trying to access a protected route or /onboarding.
  if ((isProtected || isOnboarding) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.auth;
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Signed in but onboarding not complete → bounce to /onboarding from any
  // protected route. /onboarding itself is allowed through.
  if (isProtected && user && !onboarded) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.onboarding;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Onboarded users can still revisit /onboarding/* — the sidebar exposes
  // it as a way to redo the wizard if their trading style changes. The
  // post-sign-in bounce above already prevents the accidental-entry case
  // we used to redirect away from here.

  return response;
}
