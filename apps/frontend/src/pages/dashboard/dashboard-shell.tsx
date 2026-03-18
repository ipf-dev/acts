import {
  FolderOpen,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type DashboardNavigationKey = "assets" | "admin";

interface DashboardShellProps {
  activeNavigationKey: DashboardNavigationKey;
  title: string;
  children: React.ReactNode;
  onNavigate: (navigationKey: DashboardNavigationKey) => void;
}

const navigationItems = [
  { icon: FolderOpen, key: "assets" as const, label: "자산 라이브러리" },
  { icon: ShieldCheck, key: "admin" as const, label: "관리자 설정" }
];

export function DashboardShell({
  activeNavigationKey,
  title,
  children,
  onNavigate
}: DashboardShellProps): React.JSX.Element {
  const activeNavigationItem =
    navigationItems.find((item) => item.key === activeNavigationKey) ?? navigationItems[0];

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
                    item.key === activeNavigationKey && "bg-muted text-foreground shadow-sm"
                  )}
                  key={item.label}
                  onClick={() => onNavigate(item.key)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
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

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Workspace
                </p>
                <p className="mt-1 text-sm font-medium">{activeNavigationItem.label}</p>
              </div>

              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
                {navigationItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm",
                        item.key === activeNavigationKey && "bg-primary text-primary-foreground",
                      )}
                      key={item.label}
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

          <main className="flex-1 px-4 py-6 lg:px-6 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
