import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  Users
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import { isBlank } from "../../lib/utils";
import type {
  AssetRetentionPolicyView,
  DeletedAssetView,
  AppHealthView,
  AuditLogView,
  AuthSessionView,
  AuthUserView,
  OrganizationOptionView,
  ViewerAllowlistEntryView
} from "../../dashboard-types";

interface DashboardHomePageProps {
  adminUsers: AuthUserView[];
  assetRetentionPolicy: AssetRetentionPolicyView | null;
  auditLogs: AuditLogView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  deletedAssets: DeletedAssetView[];
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingPolicy: boolean;
  isSavingAssignment: boolean;
  isSavingAllowlist: boolean;
  onAddViewerAllowlist: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRemoveViewerAllowlist: (email: string) => Promise<void>;
  onRestoreDeletedAsset: (assetId: number) => Promise<void>;
  onSaveAssetRetentionPolicy: (policy: AssetRetentionPolicyView) => Promise<void>;
  onSaveManualAssignment: (
    email: string,
    organizationId: number,
    positionTitle: string
  ) => Promise<void>;
  organizations: OrganizationOptionView[];
  processingDeletedAssetId: number | null;
  session: AuthSessionView;
  viewerAllowlist: ViewerAllowlistEntryView[];
}

interface UserAssignmentDraft {
  organizationId: string;
  positionTitle: string;
}

const auditTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short"
});

const auditActionLabelMap: Record<string, string> = {
  ASSET_RESTORED: "자산 복구",
  ASSET_RETENTION_POLICY_UPDATED: "정책 변경",
  LOGIN_SUCCESS: "로그인 성공",
  USER_ASSIGNMENT_UPDATED: "사용자 조직 변경",
  VIEWER_ALLOWLIST_ADDED: "전사 열람자 추가",
  VIEWER_ALLOWLIST_REMOVED: "전사 열람자 제거"
};

const auditCategoryLabelMap: Record<string, string> = {
  AUTH: "로그인",
  PERMISSION: "권한",
  POLICY: "정책"
};

export function DashboardHomePage({
  adminUsers,
  assetRetentionPolicy,
  auditLogs,
  authErrorMessage,
  authSuccessMessage,
  deletedAssets,
  health,
  healthErrorMessage,
  isLoading,
  isSavingPolicy,
  isSavingAssignment,
  isSavingAllowlist,
  onAddViewerAllowlist,
  onLogout,
  onRemoveViewerAllowlist,
  onRestoreDeletedAsset,
  onSaveAssetRetentionPolicy,
  onSaveManualAssignment,
  organizations,
  processingDeletedAssetId,
  session,
  viewerAllowlist
}: DashboardHomePageProps): React.JSX.Element {
  const [allowlistEmail, setAllowlistEmail] = useState("");
  const [auditFilter, setAuditFilter] = useState("ALL");
  const [draftsByEmail, setDraftsByEmail] = useState<Record<string, UserAssignmentDraft>>({});
  const [policyDraft, setPolicyDraft] = useState<AssetRetentionPolicyView | null>(assetRetentionPolicy);
  const [searchQuery, setSearchQuery] = useState("");
  const healthLabel = isLoading ? "Checking" : health?.ok ? "Connected" : "Unavailable";
  const healthMessage = isLoading
    ? "Calling the Spring Boot backend."
    : healthErrorMessage
      ? healthErrorMessage
      : `Connected to ${health?.service}.`;
  const currentUser = session.user;

  useEffect(() => {
    setPolicyDraft(assetRetentionPolicy);
  }, [assetRetentionPolicy]);

  const permissionRules = [
    {
      description:
        "Google SSO는 @iportfolio.co.kr 도메인으로 제한하고, 로그인 성공은 시스템 로그와 감사 로그에 함께 저장합니다.",
      title: "로그인 정책",
      tone: "bg-sky-100 text-sky-700"
    },
    {
      description: "최초 로그인 사용자는 미지정 상태로 저장하고, 조직은 관리자 화면에서 수동으로 지정합니다.",
      title: "수동 지정",
      tone: "bg-violet-100 text-violet-700"
    },
    {
      description: "전사 열람자는 이메일 allowlist로 관리하며 수정 즉시 권한을 다시 계산합니다.",
      title: "전사 열람자",
      tone: "bg-emerald-100 text-emerald-700"
    },
    {
      description: "조직 지정과 allowlist 변경은 전후 값과 변경자를 감사 로그에 남깁니다.",
      title: "감사 로그",
      tone: "bg-rose-100 text-rose-700"
    }
  ];

  const signedInSummary = [
    { label: "이름", value: currentUser?.displayName ?? "미로그인" },
    { label: "역할", value: currentUser?.role ?? "게스트" },
    { label: "조직", value: currentUser?.organizationName ?? "지정 전" },
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

  const visibleAuditLogs = auditLogs.filter((log) => {
    if (auditFilter === "ALL") {
      return true;
    }

    return log.category === auditFilter;
  });

  function getDraft(user: AuthUserView): UserAssignmentDraft {
    return draftsByEmail[user.email] ?? {
      organizationId: user.organizationId?.toString() ?? "",
      positionTitle: user.positionTitle ?? ""
    };
  }

  function updateDraft(email: string, partialDraft: Partial<UserAssignmentDraft>): void {
    setDraftsByEmail((currentDrafts) => {
      const previousDraft = currentDrafts[email] ?? {
        organizationId: "",
        positionTitle: ""
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

    if (isBlank(draft.organizationId)) {
      return;
    }

    await onSaveManualAssignment(user.email, Number(draft.organizationId), draft.positionTitle);
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

  async function handlePolicySave(): Promise<void> {
    if (!policyDraft) {
      return;
    }

    await onSaveAssetRetentionPolicy(policyDraft);
  }

  async function handleRestoreClick(assetId: number): Promise<void> {
    const confirmed = window.confirm("이 자산을 휴지통에서 복구하시겠습니까?");
    if (!confirmed) {
      return;
    }

    await onRestoreDeletedAsset(assetId);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-[32px] font-semibold tracking-tight">관리자 설정</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            사용자 관리, 권한 설정, 정책 관리 및 감사 로그를 확인하세요.
          </p>
        </div>
      </div>

      <Tabs className="space-y-6" defaultValue="users">
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
          <TabsTrigger
            className="rounded-full px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            value="users"
          >
            <Users className="mr-2 h-4 w-4" />
            사용자 관리
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            value="allowlist"
          >
            <Shield className="mr-2 h-4 w-4" />
            권한/Allowlist
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            value="policy"
          >
            <Settings2 className="mr-2 h-4 w-4" />
            정책 설정
          </TabsTrigger>
          <TabsTrigger
            className="rounded-full px-4 py-2 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm"
            value="audit"
          >
            <Clock3 className="mr-2 h-4 w-4" />
            감사 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="space-y-6">
            <Card className="rounded-[24px] border-border shadow-none">
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
                    <div className="rounded-2xl border border-border bg-muted/50 p-4" key={item.label}>
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

            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>사용자 관리</CardTitle>
                  <CardDescription>
                    최초 로그인 사용자는 미지정 상태로 저장되며, 관리자가 조직을 수동 지정하면 즉시
                    권한을 다시 계산합니다.
                  </CardDescription>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-center">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-11 rounded-xl border-0 bg-muted pl-10 shadow-none"
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="이름 또는 이메일로 검색..."
                      value={searchQuery}
                    />
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    조직은 단일 `organizations` 테이블 기준으로 운영합니다.
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  <div className="overflow-hidden rounded-[20px] border border-border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/70 text-left text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">사용자</th>
                            <th className="px-4 py-3 font-medium">이메일</th>
                            <th className="px-4 py-3 font-medium">조직</th>
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
                              const canSaveAssignment =
                                !isSavingAssignment && !isBlank(draft.organizationId);

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
                                      onValueChange={(value) =>
                                        updateDraft(user.email, { organizationId: value })
                                      }
                                      value={draft.organizationId}
                                    >
                                      <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="조직을 선택하세요" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {organizations.map((organization) => (
                                          <SelectItem
                                            key={organization.id}
                                            value={organization.id.toString()}
                                          >
                                            {organization.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
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
                                      className="h-9 rounded-xl px-3"
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
                    관리자 권한이 있는 계정으로 로그인하면 여기서 사용자별 조직과 직급을 저장할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="allowlist">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <Card className="rounded-[24px] border-border shadow-none">
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
                        className="h-11 rounded-xl border-0 bg-muted shadow-none"
                        onChange={(event) => setAllowlistEmail(event.target.value)}
                        placeholder="이메일 주소 (예: leader@iportfolio.co.kr)"
                        type="email"
                        value={allowlistEmail}
                      />
                      <Button
                        className="h-11 rounded-xl px-4"
                        disabled={isSavingAllowlist || isBlank(allowlistEmail)}
                        type="submit"
                      >
                        {isSavingAllowlist ? "추가 중..." : "추가"}
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {viewerAllowlist.length > 0 ? (
                        viewerAllowlist.map((entry) => (
                          <div
                            className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/30 p-4 md:flex-row md:items-center md:justify-between"
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

            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader>
                <CardTitle>권한 규칙 요약</CardTitle>
                <CardDescription>현재 구현된 조직/권한 규칙만 요약합니다.</CardDescription>
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
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader>
                <CardTitle>저장 및 삭제 정책</CardTitle>
                <CardDescription>
                  휴지통 보관 기간과 복구 허용 여부를 설정합니다. 정책이 바뀌면 감사 로그에 저장됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {session.authenticated && currentUser?.role === "ADMIN" && policyDraft ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          휴지통 보관 기간
                        </p>
                        <Input
                          className="mt-3 h-11 rounded-xl border-border bg-background"
                          min={1}
                          onChange={(event) =>
                            setPolicyDraft((currentPolicy) =>
                              currentPolicy
                                ? {
                                    ...currentPolicy,
                                    trashRetentionDays: Number(event.target.value || 0)
                                  }
                                : currentPolicy
                            )
                          }
                          type="number"
                          value={policyDraft.trashRetentionDays}
                        />
                        <p className="mt-2 text-sm text-muted-foreground">
                          삭제된 자산은 휴지통에서 최대 {policyDraft.trashRetentionDays}일 동안 복구 가능합니다.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-muted/30 p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">복구 허용</p>
                        <Select
                          onValueChange={(value) =>
                            setPolicyDraft((currentPolicy) =>
                              currentPolicy
                                ? {
                                    ...currentPolicy,
                                    restoreEnabled: value === "ENABLED"
                                  }
                                : currentPolicy
                            )
                          }
                          value={policyDraft.restoreEnabled ? "ENABLED" : "DISABLED"}
                        >
                          <SelectTrigger className="mt-3 h-11 rounded-xl border-border bg-background">
                            <SelectValue placeholder="복구 허용 여부" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ENABLED">복구 허용</SelectItem>
                            <SelectItem value="DISABLED">복구 비허용</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-sm text-muted-foreground">
                          휴지통에서 자산을 원래 상태로 되돌릴 수 있는지 결정합니다.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/20 p-4">
                      <div className="text-sm text-muted-foreground">
                        마지막 변경:{" "}
                        {policyDraft.updatedByName ?? policyDraft.updatedByEmail} ·{" "}
                        {auditTimeFormatter.format(new Date(policyDraft.updatedAt))}
                      </div>
                      <Button
                        className="h-10 rounded-xl px-4"
                        disabled={isSavingPolicy || policyDraft.trashRetentionDays < 1}
                        onClick={() => void handlePolicySave()}
                        type="button"
                      >
                        {isSavingPolicy ? "정책 저장 중..." : "정책 저장"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 보관 기간과 복구 정책을 설정할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader>
                <CardTitle>휴지통</CardTitle>
                <CardDescription>
                  소프트 삭제된 자산의 복구 가능 기간을 확인하고, 아직 만료되지 않았다면 복구할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  deletedAssets.length > 0 ? (
                    deletedAssets.map((asset) => {
                      const isProcessing = processingDeletedAssetId === asset.id;

                      return (
                        <div
                          className="rounded-2xl border border-border bg-muted/20 p-4"
                          key={asset.id}
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium">{asset.title}</p>
                                <Badge variant="outline">{asset.type}</Badge>
                              </div>
                              <div className="grid gap-1 text-sm text-muted-foreground">
                                <p>제작자 {asset.ownerName} · {asset.organizationName ?? "조직 미지정"}</p>
                                <p>삭제자 {asset.deletedByName ?? asset.deletedByEmail ?? "시스템"}</p>
                                <p>삭제일 {auditTimeFormatter.format(new Date(asset.deletedAt))}</p>
                                <p>복구 만료 {auditTimeFormatter.format(new Date(asset.restoreDeadlineAt))}</p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={asset.canRestore ? "success" : "warning"}>
                                {asset.canRestore ? "복구 가능" : "복구 기간 만료"}
                              </Badge>
                              <Button
                                className="h-9 rounded-xl px-3"
                                disabled={isProcessing || !asset.canRestore}
                                onClick={() => void handleRestoreClick(asset.id)}
                                type="button"
                                variant="outline"
                              >
                                <RotateCcw className="h-4 w-4" />
                                복구
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                      현재 휴지통에 보관 중인 자산이 없습니다.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 휴지통 자산의 복구 상태를 확인하고 복구할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="rounded-[24px] border-border shadow-none">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>감사 로그</CardTitle>
                <CardDescription>
                  로그인, 사용자 조직 변경, 자산 정책 변경, 복구 이력을 저장하고 조회합니다.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="w-full max-w-xs">
                  <Select onValueChange={setAuditFilter} value={auditFilter}>
                    <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                      <SelectValue placeholder="전체 로그" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체 로그</SelectItem>
                      <SelectItem value="AUTH">로그인</SelectItem>
                      <SelectItem value="PERMISSION">권한 변경</SelectItem>
                      <SelectItem value="POLICY">정책</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">{visibleAuditLogs.length}건의 로그</p>
              </div>
            </CardHeader>
            <CardContent>
              {visibleAuditLogs.length > 0 ? (
                <div className="overflow-hidden rounded-[20px] border border-border">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/70 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">유형</th>
                          <th className="px-4 py-3 font-medium">액션</th>
                          <th className="px-4 py-3 font-medium">사용자</th>
                          <th className="px-4 py-3 font-medium">이메일</th>
                          <th className="px-4 py-3 font-medium">상세</th>
                          <th className="px-4 py-3 font-medium">시간</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {visibleAuditLogs.map((log) => (
                          <tr className="align-top" key={log.id}>
                            <td className="px-4 py-4">
                              <Badge variant={log.category === "AUTH" ? "outline" : "secondary"}>
                                {auditCategoryLabelMap[log.category] ?? log.category}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 font-medium">
                              <div className="space-y-2">
                                <p>{auditActionLabelMap[log.actionType] ?? log.actionType}</p>
                                <Badge variant={log.outcome === "SUCCESS" ? "success" : "warning"}>
                                  {log.outcome === "SUCCESS" ? "성공" : "주의"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium">{log.targetName ?? log.actorName ?? "시스템"}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                실행자 {log.actorName ?? log.actorEmail}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{log.targetEmail}</td>
                            <td className="max-w-md px-4 py-4 text-muted-foreground">
                              <p>{log.detail ?? "-"}</p>
                              {log.beforeState || log.afterState ? (
                                <p className="mt-2 text-xs">
                                  변경 전후 값은 감사 로그 원문에 함께 저장됩니다.
                                </p>
                              ) : null}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {auditTimeFormatter.format(new Date(log.createdAt))}
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
