import type { AuthSessionView } from "./types";

export const GOOGLE_LOGIN_PATH = "/api/auth/login/google";

const LOGIN_FAILURE_MESSAGES: Record<string, string> = {
  domain_mismatch: "허용된 Google Workspace 도메인 계정만 ACTS에 로그인할 수 있습니다.",
  account_deactivated: "비활성화된 계정입니다. 관리자에게 문의해 주세요.",
  email_missing: "Google 계정에서 이메일 정보를 가져오지 못했습니다.",
  email_not_verified: "Google 계정 이메일 인증이 필요합니다.",
  google_oauth_not_configured: "백엔드에 Google OAuth 설정이 아직 연결되지 않았습니다.",
  login_failed: "로그인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
};

export function createAnonymousSession(): AuthSessionView {
  return {
    authenticated: false,
    loginConfigured: false,
    allowedDomains: ["iportfolio.co.kr", "spindlebooks.com"],
    allowedFeatureKeys: [],
    user: null
  };
}

export function formatAllowedDomains(allowedDomains: readonly string[]): string {
  return allowedDomains.map((domain) => `@${domain}`).join(", ");
}

export function getLoginFailureMessage(search: string): string | null {
  const params = new URLSearchParams(search);
  const code = params.get("loginError");

  if (!code) {
    return null;
  }

  return LOGIN_FAILURE_MESSAGES[code] ?? "알 수 없는 로그인 오류가 발생했습니다.";
}

export function clearLoginRedirectState(location: Location = window.location): void {
  const nextUrl = new URL(location.href);
  const hadRedirectState =
    nextUrl.searchParams.has("login") || nextUrl.searchParams.has("loginError");

  if (!hadRedirectState) {
    return;
  }

  nextUrl.searchParams.delete("login");
  nextUrl.searchParams.delete("loginError");

  const nextSearch = nextUrl.searchParams.toString();
  const nextPath = `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextUrl.hash}`;
  window.history.replaceState({}, document.title, nextPath);
}
