export const DASHBOARD_STATIC_PATHS = ["/"] as const;

export type DashboardPath = (typeof DASHBOARD_STATIC_PATHS)[number];

export function normalizeDashboardPath(pathname: string): DashboardPath {
  return pathname === "/" ? "/" : "/";
}

