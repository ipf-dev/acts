import { useState } from "react";
import {
  AlertTriangle,
  Clock3,
  LockKeyhole,
  Search,
  Shield,
  Sparkles,
  Users
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import { isBlank } from "../../lib/utils";
import type {
  AppHealthView,
  AuditLogView,
  AuthSessionView,
  AuthUserView,
  DepartmentOptionView,
  TeamOptionView,
  ViewerAllowlistEntryView
} from "../../dashboard-types";

interface DashboardHomePageProps {
  adminUsers: AuthUserView[];
  auditLogs: AuditLogView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  departments: DepartmentOptionView[];
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingAssignment: boolean;
  isSavingAllowlist: boolean;
  onAddViewerAllowlist: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRemoveViewerAllowlist: (email: string) => Promise<void>;
  onSaveManualAssignment: (
    email: string,
    departmentId: number,
    teamId: number,
    positionTitle: string
  ) => Promise<void>;
  session: AuthSessionView;
  teams: TeamOptionView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}

interface UserAssignmentDraft {
  departmentId: string;
  positionTitle: string;
  teamId: string;
}

const auditTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short"
});

const auditActionLabelMap: Record<string, string> = {
  USER_ASSIGNMENT_UPDATED: "사용자 부서/팀 변경",
  VIEWER_ALLOWLIST_ADDED: "전사 열람자 추가",
  VIEWER_ALLOWLIST_REMOVED: "전사 열람자 제거"
};

export function DashboardHomePage({
  adminUsers,
  auditLogs,
  authErrorMessage,
  authSuccessMessage,
  departments,
  health,
  healthErrorMessage,
  isLoading,
  isSavingAssignment,
  isSavingAllowlist,
  onAddViewerAllowlist,
  onLogout,
  onRemoveViewerAllowlist,
  onSaveManualAssignment,
  session,
  teams,
  viewerAllowlist
}: DashboardHomePageProps): React.JSX.Element {
  const [allowlistEmail, setAllowlistEmail] = useState("");
  const [draftsByEmail, setDraftsByEmail] = useState<Record<string, UserAssignmentDraft>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const healthLabel = isLoading ? "Checking" : health?.ok ? "Connected" : "Unavailable";
  const healthMessage = isLoading
    ? "Calling the Spring Boot backend."
      : healthErrorMessage
      ? healthErrorMessage
      : `Connected to ${health?.service}.`;
  const currentUser = session.user;

  const permissionRules = [
    {
      description: "Google SSO는 @iportfolio.co.kr 도메인으로 제한하고, 로그인 성공은 시스템 로그에 남깁니다.",
      title: "로그인 정책",
      tone: "bg-sky-100 text-sky-700"
    },
    {
      description: "최초 로그인 사용자는 미지정 상태로 저장하고, 팀/부서는 관리자 화면에서 수동으로 지정합니다.",
      title: "수동 지정",
      tone: "bg-violet-100 text-violet-700"
    },
    {
      description: "전사 열람자는 이메일 allowlist로 관리하며 수정 즉시 권한을 다시 계산합니다.",
      title: "전사 열람자",
      tone: "bg-emerald-100 text-emerald-700"
    },
    {
      description: "사용자 지정과 allowlist 변경은 전후 값과 변경자를 감사 로그에 남깁니다.",
      title: "감사 로그",
      tone: "bg-rose-100 text-rose-700"
    }
  ];

  const signedInSummary = [
    { label: "이름", value: currentUser?.displayName ?? "미로그인" },
    { label: "역할", value: currentUser?.role ?? "게스트" },
    { label: "팀", value: currentUser?.teamName ?? "지정 전" },
    { label: "부서", value: currentUser?.departmentName ?? "지정 전" },
    { label: "직급", value: currentUser?.positionTitle ?? "미지정" },
    { label: "전사 열람", value: currentUser?.companyWideViewer ? "허용" : "미허용" }
  ];

  const visibleUsers = adminUsers.filter((user) => {
    if (isBlank(searchQuery)) {
      return true;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();
    return (
      user.displayName.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery)
    );
  });

  function getDraft(user: AuthUserView): UserAssignmentDraft {
    return draftsByEmail[user.email] ?? {
      departmentId: user.departmentId?.toString() ?? "",
      positionTitle: user.positionTitle ?? "",
      teamId: user.teamId?.toString() ?? ""
    };
  }

  function getTeamsForDepartment(departmentId: string): TeamOptionView[] {
    if (isBlank(departmentId)) {
      return [];
    }

    return teams.filter((team) => team.departmentId === Number(departmentId));
  }

  function updateDraft(email: string, partialDraft: Partial<UserAssignmentDraft>): void {
    setDraftsByEmail((currentDrafts) => {
      const previousDraft = currentDrafts[email] ?? {
        departmentId: "",
        positionTitle: "",
        teamId: ""
      };

      return {
        ...currentDrafts,
        [email]: {
          ...previousDraft,
          ...partialDraft
        }
      };
    });
  }

  async function handleAssignmentSave(user: AuthUserView): Promise<void> {
    const draft = getDraft(user);

    if (isBlank(draft.departmentId) || isBlank(draft.teamId)) {
      return;
    }

    await onSaveManualAssignment(
      user.email,
      Number(draft.departmentId),
      Number(draft.teamId),
      draft.positionTitle
    );
    setDraftsByEmail((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[user.email];
      return nextDrafts;
    });
  }

  async function handleViewerAllowlistSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (isBlank(allowlistEmail)) {
      return;
    }

    await onAddViewerAllowlist(allowlistEmail.trim());
    setAllowlistEmail("");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <Badge className="rounded-full px-3 py-1" variant="secondary">
            관리자 설정
          </Badge>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">관리자 설정</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              자동 매핑은 제외하고, 현재는 PostgreSQL 기반 사용자 디렉터리와 전사 열람자 allowlist를
              운영하는 화면입니다.
            </p>
          </div>
        </div>

        <Card className="max-w-sm border-primary/10 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-5">
            <div className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Figma skeleton only</p>
              <p className="text-sm text-muted-foreground">
                기능은 auth/admin 범위에 맞춰 축소했고, 정보 구조와 운영 UI 톤만 반영했습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs className="space-y-6" defaultValue="users">
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
          <TabsTrigger
            className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            value="users"
          >
            <Users className="mr-2 h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            value="allowlist"
          >
            <Shield className="mr-2 h-4 w-4" />
            권한/Allowlist
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            value="policy"
          >
            <LockKeyhole className="mr-2 h-4 w-4" />
            정책 설정
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            value="audit"
          >
            <Clock3 className="mr-2 h-4 w-4" />
            감사 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>현재 로그인 상태</CardTitle>
                <CardDescription>
                  Google SSO 세션과 현재 사용자에 계산된 조직/권한 상태를 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={session.authenticated ? "success" : "warning"}>
                    {session.authenticated ? "Signed in" : "로그인 필요"}
                  </Badge>
                  <Badge variant="outline">@{session.allowedDomain}</Badge>
                  <Badge variant={health?.ok ? "success" : "warning"}>
                    Backend {healthLabel}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {signedInSummary.map((item) => (
                    <div className="rounded-2xl border border-border bg-muted/40 p-4" key={item.label}>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                  {session.authenticated
                    ? `로그인 계정 ${currentUser?.email} 로 접속 중입니다. ${healthMessage}`
                    : `현재는 ${session.allowedDomain} 도메인 계정만 로그인할 수 있습니다.`}
                </div>

                <div className="flex flex-wrap gap-3">
                  {session.authenticated ? (
                    <Button onClick={() => void onLogout()} variant="secondary">
                      Sign out
                    </Button>
                  ) : (
                    <Button asChild>
                      <a href={GOOGLE_LOGIN_PATH}>Continue with Google</a>
                    </Button>
                  )}
                </div>

                {authSuccessMessage ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <p>{authSuccessMessage}</p>
                  </div>
                ) : null}

                {authErrorMessage ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <p>{authErrorMessage}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>사용자 관리</CardTitle>
                  <CardDescription>
                    최초 로그인 사용자는 미지정 상태로 저장되며, 관리자가 팀/부서를 수동 지정하면 즉시
                    권한을 다시 계산합니다.
                  </CardDescription>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="이름 또는 이메일로 검색..."
                      value={searchQuery}
                    />
                  </div>
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    자동 매핑은 아직 꺼두고, 관리자 지정과 감사 로그만 먼저 구현했습니다.
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/40 text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">사용자</th>
                            <th className="px-4 py-3 font-medium">이메일</th>
                            <th className="px-4 py-3 font-medium">부서</th>
                            <th className="px-4 py-3 font-medium">팀</th>
                            <th className="px-4 py-3 font-medium">직급</th>
                            <th className="px-4 py-3 font-medium">역할</th>
                            <th className="px-4 py-3 font-medium">전사 열람자</th>
                            <th className="px-4 py-3 font-medium">액션</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {visibleUsers.length > 0 ? (
                            visibleUsers.map((user) => {
                              const draft = getDraft(user);
                              const availableTeams = getTeamsForDepartment(draft.departmentId);
                              const canSaveAssignment =
                                !isSavingAssignment &&
                                !isBlank(draft.departmentId) &&
                                !isBlank(draft.teamId);

                              return (
                                <tr className="align-top" key={user.email}>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                        {user.displayName.slice(0, 1)}
                                      </div>
                                      <div>
                                        <p className="font-medium">{user.displayName}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          {user.mappingMode === "MANUAL" ? "수동 지정됨" : "지정 필요"}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-muted-foreground">{user.email}</td>
                                  <td className="min-w-44 px-4 py-4">
                                    <Select
                                      onChange={(event) =>
                                        updateDraft(user.email, {
                                          departmentId: event.target.value,
                                          teamId: ""
                                        })
                                      }
                                      value={draft.departmentId}
                                    >
                                      <option value="">부서를 선택하세요</option>
                                      {departments.map((department) => (
                                        <option key={department.id} value={department.id}>
                                          {department.name}
                                        </option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="min-w-44 px-4 py-4">
                                    <Select
                                      disabled={isBlank(draft.departmentId)}
                                      onChange={(event) =>
                                        updateDraft(user.email, { teamId: event.target.value })
                                      }
                                      value={draft.teamId}
                                    >
                                      <option value="">팀을 선택하세요</option>
                                      {availableTeams.map((team) => (
                                        <option key={team.id} value={team.id}>
                                          {team.name}
                                        </option>
                                      ))}
                                    </Select>
                                  </td>
                                  <td className="min-w-36 px-4 py-4">
                                    <Input
                                      onChange={(event) =>
                                        updateDraft(user.email, { positionTitle: event.target.value })
                                      }
                                      placeholder="직급 입력"
                                      value={draft.positionTitle}
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>
                                      {user.role === "ADMIN" ? "Admin" : "일반"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4">
                                    <Badge variant={user.companyWideViewer ? "success" : "outline"}>
                                      {user.companyWideViewer ? "허용" : "미허용"}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-4">
                                    <Button
                                      disabled={!canSaveAssignment}
                                      onClick={() => void handleAssignmentSave(user)}
                                      size="sm"
                                      type="button"
                                      variant="secondary"
                                    >
                                      {isSavingAssignment ? "저장 중..." : "저장"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                                검색 조건에 맞는 사용자가 없습니다. 먼저 사용자가 로그인하면 여기에 나타납니다.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 사용자별 팀/부서와 직급을 저장할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allowlist">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>전사 열람자 Allowlist</CardTitle>
                <CardDescription>
                  대표이사/부사장, 본부장, 팀장 등 전사 열람자를 이메일 allowlist로 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  <>
                    <form
                      className="grid gap-3 md:grid-cols-[1fr_auto]"
                      onSubmit={(event) => void handleViewerAllowlistSubmit(event)}
                    >
                      <Input
                        onChange={(event) => setAllowlistEmail(event.target.value)}
                        placeholder="이메일 주소 (예: leader@iportfolio.co.kr)"
                        type="email"
                        value={allowlistEmail}
                      />
                      <Button disabled={isSavingAllowlist || isBlank(allowlistEmail)} type="submit">
                        {isSavingAllowlist ? "추가 중..." : "추가"}
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {viewerAllowlist.length > 0 ? (
                        viewerAllowlist.map((entry) => (
                          <div
                            className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between"
                            key={entry.email}
                          >
                            <div>
                              <p className="font-medium">{entry.email}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                등록일 {auditTimeFormatter.format(new Date(entry.createdAt))}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant={entry.effectiveCompanyWideViewer ? "success" : "outline"}>
                                {entry.effectiveCompanyWideViewer ? "전사 열람 허용" : "미허용"}
                              </Badge>
                              <Button
                                disabled={isSavingAllowlist}
                                onClick={() => void onRemoveViewerAllowlist(entry.email)}
                                type="button"
                                variant="destructive"
                              >
                                제거
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                          아직 등록된 전사 열람자 allowlist가 없습니다.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 allowlist를 수정할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>권한 규칙 요약</CardTitle>
                <CardDescription>
                  현재 구현된 조직/권한 규칙만 요약합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {permissionRules.map((rule) => (
                  <div className={`rounded-2xl p-4 ${rule.tone}`} key={rule.title}>
                    <p className="font-medium">{rule.title}</p>
                    <p className="mt-2 text-sm leading-6">{rule.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policy">
          <Card>
            <CardHeader>
              <CardTitle>정책 설정</CardTitle>
              <CardDescription>
                자동 매핑 규칙과 상세 권한 체계는 아직 미정입니다. 현재는 수동 지정, allowlist, 감사 로그까지 구현했습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                자동 매핑 원천 데이터와 세부 권한 모델이 확정되면 이 탭에 정책 편집 화면을 붙일 예정입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>감사 로그</CardTitle>
              <CardDescription>
                사용자 조직 변경과 전사 열람자 allowlist 변경의 전후 값과 변경자를 기록합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLogs.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/40 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">시각</th>
                          <th className="px-4 py-3 font-medium">액션</th>
                          <th className="px-4 py-3 font-medium">대상</th>
                          <th className="px-4 py-3 font-medium">변경자</th>
                          <th className="px-4 py-3 font-medium">이전 값</th>
                          <th className="px-4 py-3 font-medium">이후 값</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {auditLogs.map((log) => (
                          <tr className="align-top" key={log.id}>
                            <td className="px-4 py-4 text-muted-foreground">
                              {auditTimeFormatter.format(new Date(log.createdAt))}
                            </td>
                            <td className="px-4 py-4 font-medium">
                              {auditActionLabelMap[log.actionType] ?? log.actionType}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{log.targetEmail}</td>
                            <td className="px-4 py-4 text-muted-foreground">{log.actorEmail}</td>
                            <td className="max-w-sm px-4 py-4">
                              <code className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                                {log.beforeState ?? "-"}
                              </code>
                            </td>
                            <td className="max-w-sm px-4 py-4">
                              <code className="whitespace-pre-wrap break-all text-xs text-muted-foreground">
                                {log.afterState ?? "-"}
                              </code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                  아직 기록된 감사 로그가 없습니다.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
