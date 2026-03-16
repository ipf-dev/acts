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
  AuthSessionView,
  AuthUserView,
  DepartmentOptionView
} from "../../dashboard-types";

interface DashboardHomePageProps {
  adminUsers: AuthUserView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  departments: DepartmentOptionView[];
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingAssignment: boolean;
  onLogout: () => Promise<void>;
  onSaveManualAssignment: (email: string, departmentId: number, positionTitle: string) => Promise<void>;
  session: AuthSessionView;
}

interface UserAssignmentDraft {
  departmentId: string;
  positionTitle: string;
}

export function DashboardHomePage({
  adminUsers,
  authErrorMessage,
  authSuccessMessage,
  departments,
  health,
  healthErrorMessage,
  isLoading,
  isSavingAssignment,
  onLogout,
  onSaveManualAssignment,
  session
}: DashboardHomePageProps): React.JSX.Element {
  const [draftsByEmail, setDraftsByEmail] = useState<Record<string, UserAssignmentDraft>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const healthLabel = isLoading ? "Checking" : health?.ok ? "Connected" : "Unavailable";
  const healthMessage = isLoading
    ? "Calling the Spring Boot backend."
      : healthErrorMessage
      ? healthErrorMessage
      : `Connected to ${health?.service}.`;
  const currentUser = session.user;
  const defaultTab = "users";

  const permissionRules = [
    {
      description: "Google Workspace 계정 인증 후에도 ACTS 내부 역할에 따라 접근 범위를 구분합니다.",
      title: "일반 사용자",
      tone: "bg-zinc-100 text-zinc-700"
    },
    {
      description: "현재 구현 범위에서는 수동 팀/부서 지정과 운영자용 사용자 확인이 핵심입니다.",
      title: "Admin",
      tone: "bg-rose-100 text-rose-700"
    },
    {
      description: "로그인 자체는 @iportfolio.co.kr 도메인으로만 허용됩니다.",
      title: "로그인 정책",
      tone: "bg-sky-100 text-sky-700"
    },
    {
      description: "자동 부서 추론은 제거했고, 미지정 사용자는 관리자 판단으로 연결합니다.",
      title: "수동 지정",
      tone: "bg-violet-100 text-violet-700"
    }
  ];

  const signedInSummary = [
    { label: "이름", value: currentUser?.displayName ?? "미로그인" },
    { label: "역할", value: currentUser?.role ?? "게스트" },
    { label: "부서", value: currentUser?.departmentName ?? "지정 전" },
    { label: "직급", value: currentUser?.positionTitle ?? "미지정" }
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
      positionTitle: user.positionTitle ?? ""
    };
  }

  function updateDraft(email: string, partialDraft: Partial<UserAssignmentDraft>): void {
    setDraftsByEmail((currentDrafts) => {
      const previousDraft = currentDrafts[email] ?? { departmentId: "", positionTitle: "" };
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

    if (isBlank(draft.departmentId)) {
      return;
    }

    await onSaveManualAssignment(user.email, Number(draft.departmentId), draft.positionTitle);
    setDraftsByEmail((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[user.email];
      return nextDrafts;
    });
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
              이미지에서 가져온 정보 구조를 기준으로, 지금 구현된 Google SSO와
              수동 사용자 지정 플로우만 담은 운영 화면입니다.
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
                기능은 auth/admin MVP에 맞게 축소했고, 레이아웃 뼈대만 참조했습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs className="space-y-6" defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl bg-transparent p-0">
          <TabsTrigger className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="users">
            <Users className="mr-2 h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="allowlist">
            <Shield className="mr-2 h-4 w-4" />
            권한/Allowlist
          </TabsTrigger>
          <TabsTrigger className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="policy">
            <LockKeyhole className="mr-2 h-4 w-4" />
            정책 설정
          </TabsTrigger>
          <TabsTrigger className="rounded-full border border-border bg-card px-4 py-2 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" value="audit">
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
                  Google SSO 세션과 내부 사용자 할당 상태를 한곳에서 확인합니다.
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

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                    PostgreSQL에 저장된 사용자와 부서 수동 지정 상태를 관리합니다. 자동 매핑은 이후 단계에서 붙입니다.
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
                    권한 모델은 아직 확정 전이라 현재는 부서와 직급 수동 지정만 저장합니다.
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
                              const canSaveAssignment = !isSavingAssignment && !isBlank(draft.departmentId);

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
                                  <td className="min-w-48 px-4 py-4">
                                    <Select
                                      onChange={(event) =>
                                        updateDraft(user.email, { departmentId: event.target.value })
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
                                  <td className="min-w-40 px-4 py-4">
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
                                    <label className="inline-flex cursor-not-allowed items-center">
                                      <input
                                        checked={user.companyWideViewer}
                                        className="h-5 w-9 cursor-not-allowed rounded-full accent-primary"
                                        disabled
                                        type="checkbox"
                                      />
                                    </label>
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
                              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
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
                    관리자 권한이 있는 계정으로 로그인하면 여기서 사용자별 부서와 직급을 저장할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allowlist">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>권한/Allowlist</CardTitle>
                <CardDescription>
                  부서 자동 매핑 규칙과 상세 권한 모델은 아직 확정 전입니다. 현재는 사용자 관리 탭에서 수동 부서 지정을 먼저 운영합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                  권한 테이블과 자동 매핑 규칙은 다음 단계에서 확정합니다. 현재는 PostgreSQL에 저장되는 부서 수동 지정과 사용자 디렉터리만 운영합니다.
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>권한 규칙 요약</CardTitle>
                <CardDescription>
                  Figma의 정책 카드 구조만 가져오고, 현재 구현된 규칙만 요약했습니다.
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
                정책 편집 화면은 아직 구현하지 않았습니다. 현재는 도메인 제한 Google SSO와 관리자 수동 지정만 운영합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                정책 세부 편집은 MVP 다음 단계에서 다룹니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>감사 로그</CardTitle>
              <CardDescription>
                감사 로그 화면은 Figma에는 있었지만, 현재 개발 플로우에서는 범위에 넣지 않았습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
                로그인과 관리자 지정 이력은 이후 persistence 단계에서 함께 추가할 예정입니다.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
