import { useEffect, useState } from "react";
import type React from "react";
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { createDashboardApi } from "../api/client";
import type { AuthSessionView } from "../api/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

export type DashboardNavigationKey = "assets" | "admin";

interface DashboardShellProps {
  activeNavigationKey: DashboardNavigationKey;
  assetSearchQuery: string;
  children: React.ReactNode;
  onNavigate: (navigationKey: DashboardNavigationKey) => void;
  onSearchAssetLibrary: (value: string) => void;
  session: AuthSessionView;
  title: string;
}

const dashboardApi = createDashboardApi();

const navigationItems = [
  { icon: FolderOpen, key: "assets" as const, label: "자산 라이브러리" },
  { icon: ShieldCheck, key: "admin" as const, label: "관리자 설정" }
];

export function DashboardShell({
  activeNavigationKey,
  assetSearchQuery,
  children,
  onNavigate,
  onSearchAssetLibrary,
  session,
  title
}: DashboardShellProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (activeNavigationKey === "admin" && session.user?.role !== "ADMIN") {
      onNavigate("assets");
    }
  }, [activeNavigationKey, onNavigate, session.user?.role]);

  const hasAssetLibraryAccess =
    !session.authenticated || session.allowedFeatureKeys.includes("ASSET_LIBRARY");

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await dashboardApi.logout();
    } finally {
      window.location.assign("/");
    }
  }

  const visibleNavigationItems = navigationItems.filter(
    (item) =>
      (item.key !== "admin" || session.user?.role === "ADMIN") &&
      (item.key !== "assets" || hasAssetLibraryAccess)
  );
  const activeNavigationItem =
    visibleNavigationItems.find((item) => item.key === activeNavigationKey) ?? visibleNavigationItems[0];
  const currentUser = session.user;
  const showAssetSearch = activeNavigationKey === "assets" && hasAssetLibraryAccess;
  const roleLabel = currentUser?.role === "ADMIN" ? "관리자" : currentUser?.role === "USER" ? "일반 사용자" : "게스트";
  const accountSummaryItems = [
    { label: "이름", value: currentUser?.displayName ?? "게스트" },
    { label: "역할", value: roleLabel },
    { label: "조직", value: currentUser?.organizationName ?? "조직 미지정" }
  ];

  function renderAccountMenuContent(): React.JSX.Element {
    return (
      <>
        <div className="space-y-3 px-3 py-3">
          <div>
            <p className="text-sm font-semibold">{currentUser?.displayName ?? "게스트"}</p>
            <p className="mt-1 text-xs text-muted-foreground">계정 정보</p>
          </div>
          <div className="space-y-2 text-sm">
            {accountSummaryItems.map((item) => (
              <div className="flex items-center justify-between gap-3" key={item.label}>
                <span className="text-muted-foreground">{item.label}</span>
                <span className="text-right font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleLogout()}>
          <LogOut className="h-4 w-4" />
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside
          className={cn(
            "hidden border-r border-sidebar-border bg-sidebar transition-all duration-200 lg:flex lg:flex-col",
            collapsed ? "lg:w-[68px]" : "lg:w-[250px]"
          )}
        >
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
              onClick={() => onNavigate("assets")}
              type="button"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium uppercase">{title}</p>
                <p className="truncate text-[11px] text-muted-foreground">AI Contents Tech Studio</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 space-y-1 px-2 py-3">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground",
                    item.key === activeNavigationKey && "bg-accent text-foreground"
                  )}
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  type="button"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span>{item.label}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="px-2 pb-2">
            <button
              className="flex h-9 w-full items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setCollapsed((currentValue) => !currentValue)}
              type="button"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent/70"
                  type="button"
                >
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700">
                    {(currentUser?.displayName ?? "A").slice(0, 1)}
                  </div>
                  {!collapsed ? (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {currentUser?.displayName ?? "게스트"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {currentUser ? "이름을 눌러 계정 정보 보기" : "로그인이 필요합니다"}
                      </p>
                    </div>
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 rounded-2xl" side="top">
                {renderAccountMenuContent()}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold uppercase">{title}</p>
                  <p className="truncate text-xs text-muted-foreground">AI Contents Tech Studio</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-medium"
                      type="button"
                    >
                      {(currentUser?.displayName ?? "A").slice(0, 1)}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-2xl" side="bottom">
                    {renderAccountMenuContent()}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {showAssetSearch ? (
                  <div className="relative w-full max-w-[450px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-11 rounded-xl border-0 bg-muted pl-9 shadow-none"
                      onChange={(event) => onSearchAssetLibrary(event.target.value)}
                      placeholder="애셋 검색... (캐릭터, 태그, 키워드)"
                      value={assetSearchQuery}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
                    <p className="mt-1 text-sm font-medium">{activeNavigationItem?.label ?? "접근 불가"}</p>
                  </div>
                )}

                {currentUser ? (
                  <div className="hidden text-right lg:block">
                    <p className="text-sm font-medium">{currentUser.organizationName ?? "조직 미지정"}</p>
                  </div>
                ) : null}
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
                {visibleNavigationItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm",
                        item.key === activeNavigationKey && "border-primary/20 bg-primary text-primary-foreground"
                      )}
                      key={item.key}
                      onClick={() => onNavigate(item.key)}
                      type="button"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-6">
            {visibleNavigationItems.length === 0 ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
                  <p className="text-lg font-semibold">허용된 기능이 없습니다</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    현재 계정에는 접근 가능한 좌측 기능이 없습니다. 관리자에게 기능 권한 Allow 설정을 요청하세요.
                  </p>
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
