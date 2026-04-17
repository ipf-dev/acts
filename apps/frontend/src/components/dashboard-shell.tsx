import { useEffect, useState } from "react";
import type React from "react";
import {
  BookMarked,
  BookOpenText,
  Clock3,
  FolderOpen,
  type LucideIcon,
  LogOut,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Users
} from "lucide-react";
import { dashboardApi } from "../api/client";
import type { AuthSessionView } from "../api/types";
import { cn } from "../lib/utils";
import { HubSidebarPanel } from "../pages/hub/hub-sidebar-panel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./ui/dropdown-menu";
import { ActsLogo } from "./acts-logo";

export type DashboardNavigationKey = "assets" | "series" | "admin";
export type AdminTabKey = "users" | "features" | "policy" | "asset-tags" | "audit";
type PrimaryNavigationKey = DashboardNavigationKey;

interface DashboardShellProps {
  activeAdminTab: AdminTabKey;
  activeNavigationKey: DashboardNavigationKey;
  children: React.ReactNode;
  hubNavigationRefreshKey: number;
  onAdminTabChange: (tab: AdminTabKey) => void;
  onNavigate: (navigationKey: DashboardNavigationKey) => void;
  onOpenHubEpisode: (episodeKey: string) => void;
  selectedHubEpisodeKey: string | null;
  session: AuthSessionView;
}

interface PrimaryInternalNavigationItem {
  icon: LucideIcon;
  key: PrimaryNavigationKey;
  label: string;
  type: "internal";
}

type PrimaryNavigationItem = PrimaryInternalNavigationItem;

const primaryNavigationItems: readonly PrimaryNavigationItem[] = [
  { icon: FolderOpen, key: "assets", label: "에셋", type: "internal" },
  { icon: BookMarked, key: "series", label: "시리즈", type: "internal" },
  { icon: ShieldCheck, key: "admin", label: "관리자", type: "internal" }
];

interface AdminSidebarItem {
  description: string;
  icon: LucideIcon;
  key: AdminTabKey;
  label: string;
}

const adminSidebarItems: readonly AdminSidebarItem[] = [
  { description: "조직 지정, 역할 관리", icon: Users, key: "users", label: "사용자 관리" },
  { description: "사용자별 기능 접근 권한", icon: SlidersHorizontal, key: "features", label: "기능 권한" },
  { description: "보관 기간, 복구 정책", icon: Settings2, key: "policy", label: "정책 설정" },
  { description: "캐릭터, 장소, 키워드 태그", icon: Tags, key: "asset-tags", label: "태그 관리" },
  { description: "로그인, 권한, 정책 이력", icon: Clock3, key: "audit", label: "감사 로그" }
];

function isPrimaryNavigationVisible(
  item: PrimaryInternalNavigationItem,
  options: { hasAssetLibraryAccess: boolean; isAdmin: boolean }
): boolean {
  if (item.key === "assets" || item.key === "series") {
    return options.hasAssetLibraryAccess;
  }

  if (item.key === "admin") {
    return options.isAdmin;
  }

  return true;
}

export function DashboardShell({
  activeAdminTab,
  activeNavigationKey,
  children,
  hubNavigationRefreshKey,
  onAdminTabChange,
  onNavigate,
  onOpenHubEpisode,
  selectedHubEpisodeKey,
  session
}: DashboardShellProps): React.JSX.Element {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (activeNavigationKey === "admin" && session.user?.role !== "ADMIN") {
      onNavigate("assets");
    }
  }, [activeNavigationKey, onNavigate, session.user?.role]);

  const hasAssetLibraryAccess =
    !session.authenticated || session.allowedFeatureKeys.includes("ASSET_LIBRARY");
  const isAdmin = session.user?.role === "ADMIN";
  const activePrimaryNavigationKey: PrimaryNavigationKey = activeNavigationKey;
  const visiblePrimaryNavigationItems = primaryNavigationItems.filter((item) =>
    isPrimaryNavigationVisible(item, {
      hasAssetLibraryAccess,
      isAdmin
    })
  );
  const currentUser = session.user;
  const roleLabel =
    currentUser?.role === "ADMIN" ? "관리자" : currentUser?.role === "USER" ? "일반 사용자" : "게스트";
  const accountSummaryItems = [
    { label: "이름", value: currentUser?.displayName ?? "게스트" },
    { label: "역할", value: roleLabel },
    { label: "조직", value: currentUser?.organizationName ?? "조직 미지정" }
  ];

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await dashboardApi.logout();
    } finally {
      window.location.assign("/");
    }
  }

  function handlePrimaryNavigation(key: PrimaryNavigationKey): void {
    onNavigate(key);
  }

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

  function renderAdminSidebar(): React.JSX.Element {
    return (
      <aside className="sticky top-0 hidden max-h-screen border-r border-sidebar-border bg-white/88 backdrop-blur-sm lg:flex lg:flex-col">
        <div className="flex h-[84px] items-center border-b border-sidebar-border px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Admin
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              관리자 설정
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1">
            {adminSidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.key === activeAdminTab;

              return (
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all",
                    isActive
                      ? "border border-border bg-card text-foreground shadow-sm"
                      : "border border-transparent text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground"
                  )}
                  key={item.key}
                  onClick={() => onAdminTabChange(item.key)}
                  type="button"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      isActive
                        ? "bg-accent text-foreground"
                        : "bg-accent/50 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <div className={cn(
          "grid min-h-screen",
          activePrimaryNavigationKey === "assets"
            ? "lg:grid-cols-[96px_1fr]"
            : "lg:grid-cols-[96px_320px_1fr]"
        )}>
          <aside className="sticky top-0 hidden max-h-screen border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
            <div className="border-b border-sidebar-border px-3 py-3">
              <button
                className="flex w-full items-center justify-center rounded-2xl px-2 py-3 transition-colors hover:bg-accent/70"
                onClick={() => handlePrimaryNavigation("assets")}
                type="button"
              >
                <ActsLogo className="items-center" imageClassName="h-9" />
              </button>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
              {visiblePrimaryNavigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === activePrimaryNavigationKey;

                return (
                  <button
                    className={cn(
                      "flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[11px] font-medium transition-all",
                      isActive
                        ? "bg-accent text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                    key={item.key}
                    onClick={() => handlePrimaryNavigation(item.key)}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-sidebar-border px-3 py-3">
              <a
                className="flex w-full flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                href="/acts-user-manual.html"
                rel="noreferrer"
                target="_blank"
              >
                <BookOpenText className="h-5 w-5" />
                <span>매뉴얼</span>
              </a>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex w-full items-center justify-center rounded-2xl px-2 py-2 transition-colors hover:bg-accent"
                    type="button"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700">
                      {(currentUser?.displayName ?? "A").slice(0, 1)}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 rounded-2xl" side="right">
                  {renderAccountMenuContent()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </aside>

          {activePrimaryNavigationKey === "series" ? (
            <HubSidebarPanel
              hubNavigationRefreshKey={hubNavigationRefreshKey}
              onOpenHubEpisode={onOpenHubEpisode}
              selectedHubEpisodeKey={selectedHubEpisodeKey}
            />
          ) : activePrimaryNavigationKey === "admin" ? renderAdminSidebar() : null}

          <div className="flex min-h-screen flex-col">
            <main className="flex-1 px-4 py-6 lg:px-6 lg:py-6">
              {visiblePrimaryNavigationItems.length === 0 ? (
                <div className="flex min-h-[60vh] items-center justify-center">
                  <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
                    <p className="text-lg font-semibold">허용된 기능이 없습니다</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      현재 계정에는 접근 가능한 기능이 없습니다. 관리자에게 권한 설정을 요청하세요.
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
    </>
  );
}
