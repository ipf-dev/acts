import { useState } from "react";
import {
  AlertTriangle,
  Clock3,
  LockKeyhole,
  Shield,
  Sparkles,
  UserCog,
  Users
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import { isBlank } from "../../lib/utils";
import type { AppHealthView, AuthSessionView, AuthUserView } from "../../dashboard-types";

interface DashboardHomePageProps {
  adminUsers: AuthUserView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingAssignment: boolean;
  onLogout: () => Promise<void>;
  onSaveManualAssignment: (
    email: string,
    teamName: string,
    departmentName: string
  ) => Promise<void>;
  session: AuthSessionView;
}

interface ManualAssignmentFormState {
  departmentName: string;
  email: string;
  teamName: string;
}

export function DashboardHomePage({
  adminUsers,
  authErrorMessage,
  authSuccessMessage,
  health,
  healthErrorMessage,
  isLoading,
  isSavingAssignment,
  onLogout,
  onSaveManualAssignment,
  session
}: DashboardHomePageProps): React.JSX.Element {
  const [formState, setFormState] = useState<ManualAssignmentFormState>({
    departmentName: "",
    email: "",
    teamName: ""
  });
  const healthLabel = isLoading ? "Checking" : health?.ok ? "Connected" : "Unavailable";
  const healthMessage = isLoading
    ? "Calling the Spring Boot backend."
      : healthErrorMessage
      ? healthErrorMessage
      : `Connected to ${health?.service}.`;
  const currentUser = session.user;
  const canSaveAssignment =
    !isSavingAssignment &&
    !isBlank(formState.email) &&
    !isBlank(formState.teamName) &&
    !isBlank(formState.departmentName);
  const defaultTab = session.authenticated && currentUser?.role === "ADMIN" ? "allowlist" : "users";

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
    { label: "팀", value: currentUser?.teamName ?? "지정 전" },
    { label: "부서", value: currentUser?.departmentName ?? "지정 전" }
  ];

  async function handleAssignmentSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onSaveManualAssignment(formState.email, formState.teamName, formState.departmentName);
    setFormState({
      departmentName: "",
      email: "",
      teamName: ""
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
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
              <CardHeader>
                <CardTitle>접근 정책 요약</CardTitle>
                <CardDescription>
                  현재 MVP에서 실제로 적용되는 인증 및 운영 규칙만 보여줍니다.
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

        <TabsContent value="allowlist">
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>사용자 수동 지정</CardTitle>
                <CardDescription>
                  이메일로 부서를 추론하지 않기 때문에, 관리자 판단으로 팀과 부서를 연결합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  <>
                    <form className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]" onSubmit={(event) => void handleAssignmentSubmit(event)}>
                      <Input
                        onChange={(event) =>
                          setFormState((currentState) => ({
                            ...currentState,
                            email: event.target.value
                          }))
                        }
                        placeholder="이메일 주소 (예: name@iportfolio.co.kr)"
                        type="email"
                        value={formState.email}
                      />
                      <Input
                        onChange={(event) =>
                          setFormState((currentState) => ({
                            ...currentState,
                            teamName: event.target.value
                          }))
                        }
                        placeholder="팀 이름"
                        value={formState.teamName}
                      />
                      <Input
                        onChange={(event) =>
                          setFormState((currentState) => ({
                            ...currentState,
                            departmentName: event.target.value
                          }))
                        }
                        placeholder="부서 이름"
                        value={formState.departmentName}
                      />
                      <Button disabled={!canSaveAssignment} type="submit">
                        {isSavingAssignment ? "저장 중..." : "추가"}
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {adminUsers.length > 0 ? (
                        adminUsers.map((user) => (
                          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between" key={user.email}>
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <UserCog className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{user.displayName}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{user.teamName}</Badge>
                              <Badge variant="outline">{user.departmentName}</Badge>
                              <Badge variant={user.mappingMode === "MANUAL" ? "secondary" : "warning"}>
                                {user.mappingMode}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                          아직 조회된 사용자가 없습니다. 먼저 사용자가 로그인한 뒤 관리자 지정이 가능합니다.
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 팀/부서 수동 지정을 처리할 수 있습니다.
                  </div>
                )}
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
