import { useEffect, useState } from "react";
import type React from "react";
import {
  AlertTriangle,
  Clock3,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Tags,
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
import { cn, isBlank } from "../../lib/utils";
import type {
  AdminAssetTagCatalogView,
  AssetRetentionPolicyView,
  DeletedAssetView,
  AppFeatureKeyView,
  AppFeatureView,
  AuditLogView,
  AuthSessionView,
  AuthUserView,
  OrganizationOptionView,
  UserFeatureAuthorizationView
} from "../../api/types";
import { AdminAssetTagManagement } from "./admin-asset-tag-management-panel";

interface AdminPageProps {
  adminUsers: AuthUserView[];
  assetTagCatalog: AdminAssetTagCatalogView | null;
  assetRetentionPolicy: AssetRetentionPolicyView | null;
  auditLogs: AuditLogView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  deletedAssets: DeletedAssetView[];
  isSavingPolicy: boolean;
  isSavingAssignment: boolean;
  isSavingAssetTags: boolean;
  isSavingFeatureAccess: boolean;
  onPromoteUserToAdmin: (email: string) => Promise<void>;
  onCreateCharacter: (name: { name: string; aliases: string[] }) => Promise<void>;
  onDeleteAssetTagValue: (tagType: "CHARACTER" | "LOCATION" | "KEYWORD", value: string) => Promise<void>;
  onDeleteCharacter: (characterId: number) => Promise<void>;
  onMergeAssetTags: (
    tagType: "CHARACTER" | "LOCATION" | "KEYWORD",
    sourceValue: string,
    targetValue: string
  ) => Promise<void>;
  onRenameAssetTag: (
    tagType: "CHARACTER" | "LOCATION" | "KEYWORD",
    currentValue: string,
    nextValue: string
  ) => Promise<void>;
  onRestoreDeletedAsset: (assetId: number) => Promise<void>;
  onSaveAssetRetentionPolicy: (policy: AssetRetentionPolicyView) => Promise<void>;
  onUpdateCharacter: (characterId: number, input: { name: string; aliases: string[] }) => Promise<void>;
  onSaveUserFeatureAccess: (email: string, allowedFeatureKeys: AppFeatureKeyView[]) => Promise<void>;
  onSaveManualAssignment: (email: string, organizationId: number) => Promise<void>;
  organizations: OrganizationOptionView[];
  promotingUserEmail: string | null;
  processingDeletedAssetId: number | null;
  session: AuthSessionView;
  userFeatureAuthorizations: UserFeatureAuthorizationView[];
}

interface UserAssignmentDraft {
  organizationId: string;
}

interface UserFeatureAccessDraft {
  allowedFeatureKeys: AppFeatureKeyView[];
}

type FeatureAccessFilter = "ALL" | "ALLOWED" | "DENIED" | "CHANGED";

const auditTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short"
});

const auditActionLabelMap: Record<string, string> = {
  ASSET_ACCESS_DENIED: "자산 접근 차단",
  ASSET_ACCESS_SCOPE_UPDATED: "자산 열람 조직 변경",
  ASSET_EXPORTED: "자산 내보내기",
  ASSET_RESTORED: "자산 복구",
  ASSET_RETENTION_POLICY_UPDATED: "정책 변경",
  LOGIN_SUCCESS: "로그인 성공",
  USER_FEATURE_ACCESS_UPDATED: "기능 권한 변경",
  USER_ASSIGNMENT_UPDATED: "사용자 조직 변경",
  USER_ROLE_PROMOTED: "관리자 승격",
  VIEWER_ALLOWLIST_ADDED: "전사 열람자 추가",
  VIEWER_ALLOWLIST_REMOVED: "전사 열람자 제거"
};

const auditCategoryLabelMap: Record<string, string> = {
  AUTH: "로그인",
  PERMISSION: "권한",
  POLICY: "정책"
};

export function AdminPage({
  adminUsers,
  assetTagCatalog,
  assetRetentionPolicy,
  auditLogs,
  authErrorMessage,
  authSuccessMessage,
  deletedAssets,
  isSavingPolicy,
  isSavingAssignment,
  isSavingAssetTags,
  isSavingFeatureAccess,
  onPromoteUserToAdmin,
  onCreateCharacter,
  onDeleteAssetTagValue,
  onDeleteCharacter,
  onMergeAssetTags,
  onRenameAssetTag,
  onRestoreDeletedAsset,
  onSaveAssetRetentionPolicy,
  onUpdateCharacter,
  onSaveUserFeatureAccess,
  onSaveManualAssignment,
  organizations,
  promotingUserEmail,
  processingDeletedAssetId,
  session,
  userFeatureAuthorizations
}: AdminPageProps): React.JSX.Element {
  const [auditFilter, setAuditFilter] = useState("ALL");
  const [draftsByEmail, setDraftsByEmail] = useState<Record<string, UserAssignmentDraft>>({});
  const [featureDraftsByEmail, setFeatureDraftsByEmail] = useState<Record<string, UserFeatureAccessDraft>>({});
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [featureStatusFilter, setFeatureStatusFilter] = useState<FeatureAccessFilter>("ALL");
  const [featureUserQuery, setFeatureUserQuery] = useState("");
  const [policyDraft, setPolicyDraft] = useState<AssetRetentionPolicyView | null>(assetRetentionPolicy);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFeatureUserEmail, setSelectedFeatureUserEmail] = useState("");
  const currentUser = session.user;

  useEffect(() => {
    setPolicyDraft(assetRetentionPolicy);
  }, [assetRetentionPolicy]);

  useEffect(() => {
    if (userFeatureAuthorizations.length === 0) {
      setSelectedFeatureUserEmail("");
      return;
    }

    const hasSelectedUser = userFeatureAuthorizations.some((user) => user.email === selectedFeatureUserEmail);
    if (!hasSelectedUser) {
      setSelectedFeatureUserEmail(userFeatureAuthorizations[0].email);
    }
  }, [selectedFeatureUserEmail, userFeatureAuthorizations]);

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

  const hiddenAuditActionTypes = new Set(["VIEWER_ALLOWLIST_ADDED", "VIEWER_ALLOWLIST_REMOVED", "ASSET_EXPORTED"]);
  const visibleAuditLogs = auditLogs.filter((log) => {
    if (hiddenAuditActionTypes.has(log.actionType)) {
      return false;
    }

    if (auditFilter === "ALL") {
      return true;
    }

    return log.category === auditFilter;
  });
  const visibleFeatureUsers = userFeatureAuthorizations.filter((user) => {
    if (isBlank(featureUserQuery)) {
      return true;
    }

    const normalizedQuery = featureUserQuery.trim().toLowerCase();
    return (
      user.displayName.toLowerCase().includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      (user.organizationName ?? "").toLowerCase().includes(normalizedQuery)
    );
  });
  const selectedFeatureUser =
    userFeatureAuthorizations.find((user) => user.email === selectedFeatureUserEmail) ?? null;
  const selectedFeatureDraft = selectedFeatureUser ? getFeatureDraft(selectedFeatureUser) : null;
  const selectedFeatureCatalog = selectedFeatureUser
    ? [...selectedFeatureUser.allowedFeatures, ...selectedFeatureUser.deniedFeatures].sort(
        (left, right) => featureSortOrder(left) - featureSortOrder(right)
      )
    : [];
  const selectedSavedAllowedFeatureKeys = new Set(
    selectedFeatureUser?.allowedFeatures.map((feature) => feature.key) ?? []
  );
  const selectedChangedFeatureKeySet = new Set(
    selectedFeatureCatalog
      .filter(
        (feature) =>
          selectedFeatureDraft?.allowedFeatureKeys.includes(feature.key) !==
          selectedSavedAllowedFeatureKeys.has(feature.key)
      )
      .map((feature) => feature.key)
  );
  const selectedAllowedCount = selectedFeatureDraft?.allowedFeatureKeys.length ?? 0;
  const selectedDeniedCount = selectedFeatureCatalog.length - selectedAllowedCount;
  const selectedFeatureChangeCount = selectedChangedFeatureKeySet.size;
  const changedFeatureUserCount = visibleFeatureUsers.filter((user) => countChangedFeatures(user) > 0).length;
  const visibleSelectedFeatures = selectedFeatureCatalog
    .filter((feature) => {
      const normalizedQuery = featureSearchQuery.trim().toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 ||
        feature.label.toLowerCase().includes(normalizedQuery) ||
        feature.description.toLowerCase().includes(normalizedQuery) ||
        feature.key.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      const isAllowed = selectedFeatureDraft?.allowedFeatureKeys.includes(feature.key) ?? false;
      const isChanged = selectedChangedFeatureKeySet.has(feature.key);

      switch (featureStatusFilter) {
        case "ALLOWED":
          return isAllowed;
        case "DENIED":
          return !isAllowed;
        case "CHANGED":
          return isChanged;
        default:
          return true;
      }
    })
    .sort((left, right) => {
      const changedDelta =
        Number(selectedChangedFeatureKeySet.has(right.key)) - Number(selectedChangedFeatureKeySet.has(left.key));
      if (changedDelta !== 0) {
        return changedDelta;
      }

      return featureSortOrder(left) - featureSortOrder(right);
    });

  function getDraft(user: AuthUserView): UserAssignmentDraft {
    return draftsByEmail[user.email] ?? {
      organizationId: user.organizationId?.toString() ?? ""
    };
  }

  function updateDraft(email: string, partialDraft: Partial<UserAssignmentDraft>): void {
    setDraftsByEmail((currentDrafts) => {
      const previousDraft = currentDrafts[email] ?? {
        organizationId: ""
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

  function getFeatureDraft(user: UserFeatureAuthorizationView): UserFeatureAccessDraft {
    return featureDraftsByEmail[user.email] ?? {
      allowedFeatureKeys: user.allowedFeatures.map((feature) => feature.key)
    };
  }

  function updateFeatureDraft(email: string, nextAllowedFeatureKeys: AppFeatureKeyView[]): void {
    setFeatureDraftsByEmail((currentDrafts) => ({
      ...currentDrafts,
      [email]: {
        allowedFeatureKeys: nextAllowedFeatureKeys
      }
    }));
  }

  function setFeatureAccess(
    user: UserFeatureAuthorizationView,
    featureKey: AppFeatureKeyView,
    nextAllowed: boolean
  ): void {
    const draft = getFeatureDraft(user);
    const nextAllowedFeatureKeys = nextAllowed
      ? Array.from(new Set([...draft.allowedFeatureKeys, featureKey]))
      : draft.allowedFeatureKeys.filter((currentFeatureKey) => currentFeatureKey !== featureKey);

    updateFeatureDraft(user.email, nextAllowedFeatureKeys);
  }

  function featureSortOrder(feature: AppFeatureView): number {
    const order = ["ASSET_LIBRARY"];
    const index = order.indexOf(feature.key);
    return index === -1 ? order.length : index;
  }

  function countChangedFeatures(user: UserFeatureAuthorizationView): number {
    const savedAllowedFeatureKeys = new Set(user.allowedFeatures.map((feature) => feature.key));
    const draft = getFeatureDraft(user);
    const featureCatalog = [...user.allowedFeatures, ...user.deniedFeatures];

    return featureCatalog.filter(
      (feature) => draft.allowedFeatureKeys.includes(feature.key) !== savedAllowedFeatureKeys.has(feature.key)
    ).length;
  }

  function resetFeatureDraft(email: string): void {
    setFeatureDraftsByEmail((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[email];
      return nextDrafts;
    });
  }

  async function handleAssignmentSave(user: AuthUserView): Promise<void> {
    const draft = getDraft(user);

    if (isBlank(draft.organizationId)) {
      return;
    }

    await onSaveManualAssignment(user.email, Number(draft.organizationId));
    setDraftsByEmail((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[user.email];
      return nextDrafts;
    });
  }

  async function handleRoleSelectChange(user: AuthUserView, nextRole: AuthUserView["role"]): Promise<void> {
    if (nextRole === user.role) {
      return;
    }

    if (nextRole !== "ADMIN") {
      return;
    }

    const confirmed = window.confirm(
      `${user.displayName} (${user.email}) 사용자를 ADMIN으로 승격하시겠습니까?\n다음 로그인부터 관리자 권한이 반영됩니다.`
    );
    if (!confirmed) {
      return;
    }

    await onPromoteUserToAdmin(user.email);
  }

  async function handleFeatureAccessSave(user: UserFeatureAuthorizationView): Promise<void> {
    const draft = getFeatureDraft(user);
    await onSaveUserFeatureAccess(user.email, draft.allowedFeatureKeys);
    resetFeatureDraft(user.email);
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
            value="features"
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            기능 권한
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
            value="asset-tags"
          >
            <Tags className="mr-2 h-4 w-4" />
            태그 관리
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
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle>사용자 관리</CardTitle>
                  <CardDescription>
                    최초 로그인 사용자는 미지정 상태로 저장되며, 관리자가 조직을 수동 지정해
                    계정 메타데이터를 정리합니다.
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
                </div>
              </CardHeader>
              <CardContent>
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  <div className="overflow-hidden rounded-[20px] border border-border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/70 text-left text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">사용자</th>
                            <th className="px-4 py-3 font-medium">이메일</th>
                            <th className="px-4 py-3 font-medium">조직</th>
                            <th className="px-4 py-3 font-medium">역할</th>
                            <th className="px-4 py-3 font-medium">액션</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                          {visibleUsers.length > 0 ? (
                            visibleUsers.map((user) => {
                              const draft = getDraft(user);
                              const currentOrganizationId = user.organizationId?.toString() ?? "";
                              const canSaveAssignment =
                                !isSavingAssignment &&
                                !promotingUserEmail &&
                                !isBlank(draft.organizationId) &&
                                draft.organizationId !== currentOrganizationId;
                              const isPromotingUser = promotingUserEmail === user.email;

                              return (
                                <tr className="align-middle" key={user.email}>
                                  <td className="px-4 py-3.5">
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold leading-5">{user.displayName}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{user.email}</td>
                                  <td className="min-w-48 px-4 py-3.5">
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
                                  <td className="min-w-40 px-4 py-3.5">
                                    <Select
                                      disabled={Boolean(promotingUserEmail) || user.role === "ADMIN"}
                                      onValueChange={(value) =>
                                        void handleRoleSelectChange(user, value as AuthUserView["role"])
                                      }
                                      value={user.role}
                                    >
                                      <SelectTrigger className="h-10 rounded-xl">
                                        <SelectValue placeholder="역할을 선택하세요" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="USER">일반 사용자</SelectItem>
                                        <SelectItem value="ADMIN">
                                          {isPromotingUser ? "승격 중..." : "ADMIN"}
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-3.5">
                                    <Button
                                      className="h-9 rounded-xl px-3"
                                      disabled={!canSaveAssignment}
                                      onClick={() => void handleAssignmentSave(user)}
                                      size="sm"
                                      type="button"
                                      variant="secondary"
                                    >
                                      {isSavingAssignment ? "저장 중..." : "조직 저장"}
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
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
                    관리자 권한이 있는 계정으로 로그인하면 여기서 사용자별 조직을 저장할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features">
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader>
                <CardTitle>권한 대상 사용자</CardTitle>
                <CardDescription>
                  사용자를 먼저 찾고 선택한 뒤, 오른쪽에서 기능별 Allow/Deny를 한 번에
                  조정합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  userFeatureAuthorizations.length > 0 ? (
                    <>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          aria-label="기능 권한 대상 사용자 검색"
                          className="h-11 rounded-xl border-0 bg-muted pl-11 shadow-none"
                          onChange={(event) => setFeatureUserQuery(event.target.value)}
                          placeholder="이름, 이메일, 조직으로 사용자 찾기"
                          value={featureUserQuery}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <p>총 {visibleFeatureUsers.length}명 표시</p>
                        <p>저장 전 변경 {changedFeatureUserCount}명</p>
                      </div>

                      {visibleFeatureUsers.length > 0 ? (
                        <div className="space-y-2">
                          {visibleFeatureUsers.map((user) => {
                            const isSelected = user.email === selectedFeatureUserEmail;
                            const changedCount = countChangedFeatures(user);
                            const featureCount = user.allowedFeatures.length + user.deniedFeatures.length;

                            return (
                              <button
                                aria-pressed={isSelected}
                                className={cn(
                                  "w-full rounded-[20px] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                  isSelected
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/35"
                                )}
                                key={user.email}
                                onClick={() => setSelectedFeatureUserEmail(user.email)}
                                type="button"
                              >
                                <span className="flex items-start justify-between gap-3">
                                  <span className="min-w-0">
                                    <span className="block truncate font-semibold">{user.displayName}</span>
                                    <span className="mt-1 block truncate text-sm text-muted-foreground">
                                      {user.email}
                                    </span>
                                  </span>
                                  <span className="flex shrink-0 flex-col items-end gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                        user.role === "ADMIN"
                                          ? "border-transparent bg-primary text-primary-foreground"
                                          : "border-border text-foreground"
                                      )}
                                    >
                                      {user.role === "ADMIN" ? "Admin" : "User"}
                                    </span>
                                    {changedCount > 0 ? (
                                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                                        변경 {changedCount}
                                      </span>
                                    ) : null}
                                  </span>
                                </span>
                                <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span>{user.organizationName ?? "조직 미지정"}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {user.featureAccessLocked
                                      ? "모든 기능 Allow 고정"
                                      : `관리 대상 기능 ${featureCount}개`}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                          검색 조건에 맞는 사용자가 없습니다.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                      아직 로그인한 사용자가 없어 기능 권한 대상을 표시할 수 없습니다.
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 사용자별 기능 Allow/Deny를 저장할 수 있습니다.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-border shadow-none">
              <CardHeader>
                <CardTitle>기능 권한 매트릭스</CardTitle>
                <CardDescription>
                  기능별 상태, 저장 전 변경 여부, 실제 연결 여부를 같은 행에서 확인하고 바로
                  Allow/Deny를 바꿉니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {session.authenticated && currentUser?.role === "ADMIN" ? (
                  selectedFeatureUser ? (
                  <>
                    <div className="space-y-4 rounded-[24px] border border-border bg-muted/20 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-lg font-semibold">{selectedFeatureUser.displayName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedFeatureUser.email}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={selectedFeatureUser.role === "ADMIN" ? "default" : "outline"}>
                            {selectedFeatureUser.role === "ADMIN" ? "Admin" : "일반 사용자"}
                          </Badge>
                          <Badge variant={selectedFeatureUser.featureAccessLocked ? "warning" : "secondary"}>
                            {selectedFeatureUser.featureAccessLocked ? "모든 기능 Allow 고정" : "개별 편집 가능"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            조직
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {selectedFeatureUser.organizationName ?? "조직 미지정"}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            현재 상태
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            Allow {selectedAllowedCount}개 · Deny {selectedDeniedCount}개
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            저장 전 변경
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {selectedFeatureChangeCount === 0
                              ? "없음"
                              : `${selectedFeatureChangeCount}개 기능이 바뀌었습니다.`}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            반영 방식
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {selectedFeatureUser.featureAccessLocked
                              ? "Admin은 저장 없이 항상 전체 접근"
                              : "저장하면 즉시 API 권한에 반영"}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium">기능별 Allow/Deny를 한 화면에서 조정합니다.</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedFeatureUser.featureAccessLocked
                              ? "Admin 계정은 기능 권한을 별도로 저장하지 않습니다."
                              : selectedFeatureChangeCount > 0
                                ? `저장 전 변경 ${selectedFeatureChangeCount}개를 검토한 뒤 저장하세요.`
                                : "변경된 기능이 없습니다."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="h-10 rounded-xl px-4"
                            disabled={
                              isSavingFeatureAccess ||
                              selectedFeatureUser.featureAccessLocked ||
                              selectedFeatureChangeCount === 0
                            }
                            onClick={() => resetFeatureDraft(selectedFeatureUser.email)}
                            type="button"
                            variant="outline"
                          >
                            초기화
                          </Button>
                          <Button
                            className="h-10 rounded-xl px-4"
                            disabled={
                              isSavingFeatureAccess ||
                              selectedFeatureUser.featureAccessLocked ||
                              selectedFeatureChangeCount === 0
                            }
                            onClick={() => void handleFeatureAccessSave(selectedFeatureUser)}
                            type="button"
                          >
                            {selectedFeatureUser.featureAccessLocked
                              ? "Admin 고정"
                              : isSavingFeatureAccess
                                ? "저장 중..."
                                : "기능 권한 저장"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          aria-label="기능 검색"
                          className="h-11 rounded-xl border-0 bg-muted pl-11 shadow-none"
                          onChange={(event) => setFeatureSearchQuery(event.target.value)}
                          placeholder="기능 이름, 설명, 키로 검색"
                          value={featureSearchQuery}
                        />
                      </div>
                      <Select
                        onValueChange={(value) => setFeatureStatusFilter(value as FeatureAccessFilter)}
                        value={featureStatusFilter}
                      >
                        <SelectTrigger className="h-11 rounded-xl border-border bg-background">
                          <SelectValue placeholder="상태 필터" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">전체 기능</SelectItem>
                          <SelectItem value="ALLOWED">Allow만</SelectItem>
                          <SelectItem value="DENIED">Deny만</SelectItem>
                          <SelectItem value="CHANGED">변경된 항목만</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {visibleSelectedFeatures.length > 0 ? (
                      <div className="space-y-3">
                        {visibleSelectedFeatures.map((feature) => {
                          const isAllowed =
                            selectedFeatureDraft?.allowedFeatureKeys.includes(feature.key) ?? false;
                          const isChanged = selectedChangedFeatureKeySet.has(feature.key);
                          const actionDisabled =
                            isSavingFeatureAccess || selectedFeatureUser.featureAccessLocked;

                          return (
                            <div
                              className="flex flex-col gap-4 rounded-[22px] border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between"
                              key={feature.key}
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold">{feature.label}</p>
                                  <Badge variant={isAllowed ? "success" : "outline"}>
                                    {isAllowed ? "Allow" : "Deny"}
                                  </Badge>
                                  {isChanged ? <Badge variant="warning">저장 전 변경</Badge> : null}
                                  <Badge variant={feature.implemented ? "secondary" : "outline"}>
                                    {feature.implemented ? "운영 중" : "준비 중"}
                                  </Badge>
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">
                                  {feature.description}
                                </p>
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {feature.key}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-border bg-muted/20 p-1">
                                <button
                                  aria-pressed={isAllowed}
                                  className={cn(
                                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    isAllowed
                                      ? "bg-emerald-500 text-white shadow-sm"
                                      : "text-muted-foreground hover:bg-background"
                                  )}
                                  disabled={actionDisabled}
                                  onClick={() => setFeatureAccess(selectedFeatureUser, feature.key, true)}
                                  type="button"
                                >
                                  Allow
                                </button>
                                <button
                                  aria-pressed={!isAllowed}
                                  className={cn(
                                    "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                    !isAllowed
                                      ? "bg-slate-900 text-white shadow-sm"
                                      : "text-muted-foreground hover:bg-background"
                                  )}
                                  disabled={actionDisabled}
                                  onClick={() => setFeatureAccess(selectedFeatureUser, feature.key, false)}
                                  type="button"
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                        현재 필터 조건에 맞는 기능이 없습니다.
                      </div>
                    )}
                  </>
                  ) : userFeatureAuthorizations.length > 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    먼저 사용자를 선택하세요.
                  </div>
                  ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    아직 로그인한 사용자가 없어 기능 권한 대상을 표시할 수 없습니다.
                  </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                    관리자 권한이 있는 계정으로 로그인하면 여기서 기능 권한 매트릭스를 사용할 수 있습니다.
                  </div>
                )}
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

        <TabsContent value="asset-tags">
          <AdminAssetTagManagement
            catalog={assetTagCatalog}
            isSaving={isSavingAssetTags}
            onCreateCharacter={onCreateCharacter}
            onDeleteCharacter={onDeleteCharacter}
            onDeleteTagValue={onDeleteAssetTagValue}
            onMergeTags={onMergeAssetTags}
            onRenameTag={onRenameAssetTag}
            onUpdateCharacter={onUpdateCharacter}
          />
        </TabsContent>

        <TabsContent value="audit">
          <Card className="rounded-[24px] border-border shadow-none">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>감사 로그</CardTitle>
                <CardDescription>
                  로그인, 사용자 조직/역할 변경, 자산 정책 변경, 복구 이력을 저장하고 조회합니다.
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
