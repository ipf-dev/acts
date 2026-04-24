import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { Briefcase, ChevronDown, Plus } from "lucide-react";
import { dashboardApi } from "../../api/client";
import type {
  ProjectCreateInputView,
  ProjectNavigationView,
  ProjectOrganizationOptionView,
  ProjectStatusView,
  ProjectSummaryView
} from "../../api/types";
import { cn } from "../../lib/utils";
import { ProjectFormModal } from "./project-form-modal";
import {
  formatProjectDeadlineLabel,
  getProjectStatusBadgeClassName,
  projectStatusLabelMap
} from "./project-utils";

interface ProjectSidebarPanelProps {
  onOpenProject: (projectKey: string) => void;
  projectNavigationRefreshKey: number;
  selectedProjectKey: string | null;
}

const sectionOrder: readonly ProjectStatusView[] = ["ONGOING", "IN_PROGRESS", "COMPLETED"];

const emptyNavigation: ProjectNavigationView = {
  ongoing: [],
  inProgress: [],
  completed: []
};

const secondaryActionButtonClassName =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none";

function projectsForStatus(navigation: ProjectNavigationView, status: ProjectStatusView): ProjectSummaryView[] {
  switch (status) {
    case "ONGOING":
      return navigation.ongoing;
    case "IN_PROGRESS":
      return navigation.inProgress;
    case "COMPLETED":
      return navigation.completed;
    default:
      return [];
  }
}

export function ProjectSidebarPanel({
  onOpenProject,
  projectNavigationRefreshKey,
  selectedProjectKey
}: ProjectSidebarPanelProps): React.JSX.Element {
  const [navigation, setNavigation] = useState<ProjectNavigationView>(emptyNavigation);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedStatuses, setExpandedStatuses] = useState<ProjectStatusView[]>([
    "ONGOING",
    "IN_PROGRESS",
    "COMPLETED"
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDeadline, setCreateDeadline] = useState("");
  const [createIsOngoing, setCreateIsOngoing] = useState(false);
  const [createOrganizationId, setCreateOrganizationId] = useState<number | null>(null);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const [organizationOptions, setOrganizationOptions] = useState<ProjectOrganizationOptionView[]>([]);

  const loadNavigation = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await dashboardApi.getProjectNavigation();
      setNavigation(response);
    } catch {
      setNavigation(emptyNavigation);
      setErrorMessage("프로젝트 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNavigation();
  }, [loadNavigation, projectNavigationRefreshKey]);

  function toggleStatus(status: ProjectStatusView): void {
    setExpandedStatuses((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status]
    );
  }

  async function ensureOrganizationOptions(): Promise<void> {
    if (organizationOptions.length > 0) {
      return;
    }
    try {
      const options = await dashboardApi.listProjectOrganizations();
      setOrganizationOptions(options);
      if (options.length === 0) {
        setCreateErrorMessage("등록된 담당 팀이 없습니다. 관리자에게 조직 설정을 요청하세요.");
      }
    } catch {
      setCreateErrorMessage("담당 팀 정보를 불러오지 못했습니다.");
    }
  }

  function handleOpenCreate(): void {
    setCreateName("");
    setCreateDescription("");
    setCreateDeadline("");
    setCreateIsOngoing(false);
    setCreateOrganizationId(null);
    setCreateErrorMessage(null);
    setIsCreateOpen(true);
    void ensureOrganizationOptions();
  }

  function handleCloseCreate(): void {
    if (isCreating) {
      return;
    }
    setIsCreateOpen(false);
    setCreateErrorMessage(null);
  }

  async function handleSubmitCreate(): Promise<void> {
    if (createOrganizationId === null) {
      setCreateErrorMessage("담당 팀을 선택해주세요.");
      return;
    }

    setIsCreating(true);
    setCreateErrorMessage(null);

    try {
      const input: ProjectCreateInputView = {
        name: createName,
        description: createDescription.trim() ? createDescription : null,
        organizationId: createOrganizationId,
        deadline: createIsOngoing ? null : createDeadline ? createDeadline : null
      };
      const created = await dashboardApi.createProject(input);
      setIsCreateOpen(false);
      await loadNavigation();
      onOpenProject(created.key);
    } catch {
      setCreateErrorMessage("프로젝트 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <aside className="sticky top-0 hidden max-h-screen border-r border-sidebar-border bg-white/88 backdrop-blur-sm lg:flex lg:flex-col">
        <div className="flex h-[84px] items-center border-b border-sidebar-border px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Projects
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">프로젝트</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <section className="rounded-[26px] border border-border bg-card/95 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
              <p className="text-sm font-semibold text-foreground">프로젝트</p>
              <button
                aria-label="프로젝트 추가"
                className={secondaryActionButtonClassName}
                onClick={handleOpenCreate}
                title="프로젝트 추가"
                type="button"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {errorMessage ? (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              ) : isLoading ? (
                <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  프로젝트를 불러오는 중입니다.
                </div>
              ) : (
                sectionOrder.map((status) => {
                  const projects = projectsForStatus(navigation, status);
                  const isExpanded = expandedStatuses.includes(status);

                  return (
                    <div
                      className="rounded-2xl border border-border/80 bg-background/90 px-2 py-2"
                      key={status}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          aria-expanded={isExpanded}
                          aria-label={`${projectStatusLabelMap[status]} 펼치기`}
                          className={secondaryActionButtonClassName}
                          onClick={() => toggleStatus(status)}
                          type="button"
                        >
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", !isExpanded && "-rotate-90")}
                          />
                        </button>
                        <button
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/60"
                          onClick={() => toggleStatus(status)}
                          type="button"
                        >
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-[2rem] items-center justify-center rounded-full px-2 text-[11px] font-medium",
                              getProjectStatusBadgeClassName(status)
                            )}
                          >
                            {projectStatusLabelMap[status]}
                          </span>
                          <span className="text-xs text-muted-foreground">{projects.length}개</span>
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-2 space-y-1 pl-8">
                          {projects.length === 0 ? (
                            <p className="px-2 py-2 text-xs text-muted-foreground">
                              등록된 프로젝트가 없습니다.
                            </p>
                          ) : (
                            projects.map((project) => {
                              const isSelected = project.key === selectedProjectKey;
                              return (
                                <button
                                  className={cn(
                                    "flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left transition-colors",
                                    isSelected
                                      ? "bg-accent text-foreground"
                                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                  )}
                                  key={project.key}
                                  onClick={() => onOpenProject(project.key)}
                                  type="button"
                                >
                                  <span className="flex w-full items-center gap-2">
                                    <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate text-sm font-medium">{project.name}</span>
                                  </span>
                                  <span className="flex w-full items-center gap-2 pl-5 text-[11px] text-muted-foreground">
                                    <span className="truncate">{project.organizationName}</span>
                                    {status !== "COMPLETED" ? (
                                      <>
                                        <span>&bull;</span>
                                        <span className="truncate">
                                          {formatProjectDeadlineLabel(project.deadline)}
                                        </span>
                                      </>
                                    ) : null}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </aside>

      <ProjectFormModal
        deadline={createDeadline}
        description={createDescription}
        errorMessage={createErrorMessage}
        isOngoing={createIsOngoing}
        isOpen={isCreateOpen}
        isSaving={isCreating}
        mode="CREATE"
        name={createName}
        onClose={handleCloseCreate}
        onDeadlineChange={setCreateDeadline}
        onDescriptionChange={setCreateDescription}
        onNameChange={setCreateName}
        onOngoingChange={setCreateIsOngoing}
        onOrganizationChange={setCreateOrganizationId}
        onSubmit={() => void handleSubmitCreate()}
        organizationId={createOrganizationId}
        organizationOptions={organizationOptions}
      />
    </>
  );
}
