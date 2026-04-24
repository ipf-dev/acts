import type { ProjectStatusView } from "../../api/types";

export const projectStatusLabelMap: Record<ProjectStatusView, string> = {
  ONGOING: "상시",
  IN_PROGRESS: "진행중",
  COMPLETED: "완료"
};

const deadlineFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

export function formatProjectDeadlineLabel(deadline: string | null): string {
  if (!deadline) {
    return "마감일 없음";
  }

  const parsed = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return deadline;
  }
  return deadlineFormatter.format(parsed).replace(/\.$/, "");
}

export function getProjectStatusBadgeClassName(status: ProjectStatusView): string {
  switch (status) {
    case "ONGOING":
      return "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100";
    case "IN_PROGRESS":
      return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100";
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function getProjectStatusDotClassName(status: ProjectStatusView): string {
  switch (status) {
    case "ONGOING":
      return "bg-sky-500";
    case "IN_PROGRESS":
      return "bg-amber-500";
    case "COMPLETED":
      return "bg-emerald-500";
    default:
      return "bg-muted-foreground";
  }
}

