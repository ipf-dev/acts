import { useEffect, useState } from "react";
import type React from "react";
import { LogIn } from "lucide-react";
import { clearLoginRedirectState, getLoginFailureMessage, GOOGLE_LOGIN_PATH } from "../../api/auth";
import { ActsLogo } from "../../components/acts-logo";
import { Button } from "../../components/ui/button";

interface LandingPageProps {
  isLoading: boolean;
  loginConfigured: boolean;
}

export function LandingPage({
  isLoading,
  loginConfigured
}: LandingPageProps): React.JSX.Element {
  const [authErrorMessage] = useState(() => getLoginFailureMessage(window.location.search));

  useEffect(() => {
    clearLoginRedirectState();
  }, []);

  return (
    <div className="landing-shell relative flex min-h-screen items-center justify-center overflow-hidden px-6 text-slate-900">
      <div className="landing-orb absolute left-[6%] top-[14%] h-[460px] w-[460px] rounded-full bg-[#7f69c7]/14" />
      <div className="landing-orb landing-orb--delayed absolute right-[8%] top-[16%] h-[320px] w-[320px] rounded-full bg-[#cdc0f2]/24" />
      <div className="landing-orb absolute bottom-[8%] left-[50%] h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[#fbf9ff]/70" />

      <main className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <ActsLogo
          className="items-center"
          imageClassName="h-28 sm:h-32"
          tagline="AI Contents Tech Studio"
          taglineClassName="text-[10px] tracking-[0.34em] text-[#8f84b5]"
        />

        <p className="text-sm leading-6 text-slate-600">
          ACTS는 사내 Google Workspace 계정으로만 접속할 수 있습니다.
        </p>

        {authErrorMessage ? (
          <div className="w-full rounded-2xl border border-destructive/15 bg-white/65 px-4 py-3 text-sm leading-6 text-destructive backdrop-blur-sm">
            {authErrorMessage}
          </div>
        ) : null}

        {loginConfigured && !isLoading ? (
          <Button
            asChild
            className="h-12 w-full rounded-2xl bg-[#6d4ae2] text-white shadow-[0_18px_40px_rgba(109,74,226,0.34)] hover:bg-[#5b38cf]"
            size="lg"
          >
            <a href={GOOGLE_LOGIN_PATH}>
              <LogIn className="h-4 w-4" />
              Google로 계속하기
            </a>
          </Button>
        ) : (
          <Button
            className="h-12 w-full rounded-2xl bg-slate-300 text-slate-700 hover:bg-slate-300"
            disabled
            size="lg"
          >
            {isLoading ? "세션 확인 중..." : "OAuth 설정 필요"}
          </Button>
        )}
      </main>
    </div>
  );
}
