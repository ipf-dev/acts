import {
  Bell,
  BookOpen,
  Clapperboard,
  FolderOpen,
  ImagePlus,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";

interface DashboardShellProps {
  title: string;
  children: React.ReactNode;
}

const navigationItems = [
  { icon: LayoutDashboard, label: "대시보드" },
  { icon: FolderOpen, label: "자산 라이브러리" },
  { icon: Sparkles, label: "프롬프트 허브" },
  { icon: WandSparkles, label: "AI 시나리오" },
  { icon: ImagePlus, label: "AI 이미지 생성" },
  { icon: BookOpen, label: "도서 관리" },
  { icon: Clapperboard, label: "화면설계서" },
  { icon: ShieldCheck, label: "관리자 설정", active: true }
];

export function DashboardShell({ title, children }: DashboardShellProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border bg-sidebar lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d5dfc,#9c8cff)] text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title.toUpperCase()}</p>
              <p className="truncate text-xs text-muted-foreground">AI Contents Tech Studio</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1 px-3 py-5">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    item.active && "bg-muted text-foreground shadow-sm"
                  )}
                  key={item.label}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border px-4 py-5">
            <div className="rounded-2xl border border-sidebar-border bg-background/80 p-4">
              <p className="text-sm font-medium">관리자 워크스페이스</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                현재 화면은 Figma 구조를 참고한 관리자 설정 골격입니다.
              </p>
              <Badge className="mt-3" variant="secondary">
                MVP shell
              </Badge>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
            <div className="flex flex-col gap-3 px-4 py-4 lg:px-6">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d5dfc,#9c8cff)] text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">AI Contents Tech Studio</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-full border-transparent bg-muted pl-10 text-sm shadow-none"
                    placeholder="애셋 검색... (캐릭터, 태그, 키워드)"
                    readOnly
                  />
                </div>

                <button
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm"
                  type="button"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-destructive" />
                </button>

                <div className="hidden min-w-[180px] items-center justify-end gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm md:flex">
                  <div className="text-right">
                    <p className="text-sm font-medium">ACTS 운영</p>
                    <p className="text-xs text-muted-foreground">관리자 설정 프리뷰</p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    A
                  </div>
                </div>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
                {navigationItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm",
                        item.active && "bg-primary text-primary-foreground"
                      )}
                      key={item.label}
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

          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
