// Dev-only mock auth state. Real Supabase login is wired up but not used by
// the current form flows — these cookies let middleware grant access without
// a real session until backend auth is connected. Cookies (not localStorage)
// because middleware needs to read them on every request.

export const MOCK_SESSION_COOKIE = "sf_mock_session";
export const MOCK_ONBOARDED_COOKIE = "sf_mock_onboarded";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function setMockSession() {
  setCookie(MOCK_SESSION_COOKIE, "1");
}

export function setMockOnboarded() {
  setCookie(MOCK_ONBOARDED_COOKIE, "1");
}

export function clearMockSession() {
  clearCookie(MOCK_SESSION_COOKIE);
  clearCookie(MOCK_ONBOARDED_COOKIE);
}
