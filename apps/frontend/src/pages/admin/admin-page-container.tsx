import { useEffect, useState } from "react";
import type React from "react";
import { createDashboardApi } from "../../api/client";
import {
  clearLoginRedirectState,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../api/auth";
import type {
  AdminAssetTagCatalogView,
  AppFeatureKeyView,
  AppHealthView,
  AssetRetentionPolicyView,
  AssetTagTypeView,
  AuditLogView,
  AuthSessionView,
  AuthUserView,
  CharacterTagUpsertInput,
  DeletedAssetView,
  OrganizationOptionView,
  UserFeatureAuthorizationView,
  ViewerAllowlistEntryView
} from "../../api/types";
import { AdminPage } from "./admin-page";

interface AdminPageState {
  adminUsers: AuthUserView[];
  assetTagCatalog: AdminAssetTagCatalogView | null;
  assetRetentionPolicy: AssetRetentionPolicyView | null;
  auditLogs: AuditLogView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  deletedAssets: DeletedAssetView[];
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingAllowlist: boolean;
  isSavingAssetTags: boolean;
  isSavingAssignment: boolean;
  isSavingFeatureAccess: boolean;
  isSavingPolicy: boolean;
  organizations: OrganizationOptionView[];
  processingDeletedAssetId: number | null;
  session: AuthSessionView;
  userFeatureAuthorizations: UserFeatureAuthorizationView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}

interface LoadedAdminData {
  adminUsers: AuthUserView[];
  assetTagCatalog: AdminAssetTagCatalogView;
  assetRetentionPolicy: AssetRetentionPolicyView;
  auditLogs: AuditLogView[];
  deletedAssets: DeletedAssetView[];
  featureAuthorizations: UserFeatureAuthorizationView[];
  organizations: OrganizationOptionView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

async function loadAdminData(): Promise<LoadedAdminData> {
  const [
    adminUsers,
    organizations,
    viewerAllowlist,
    auditLogs,
    assetRetentionPolicy,
    deletedAssets,
    featureAuthorizations,
    assetTagCatalog
  ] = await Promise.all([
    dashboardApi.listUsers(),
    dashboardApi.listOrganizations(),
    dashboardApi.listViewerAllowlist(),
    dashboardApi.listAuditLogs(),
    dashboardApi.getAssetRetentionPolicy(),
    dashboardApi.listDeletedAssets(),
    dashboardApi.listUserFeatureAccess(),
    dashboardApi.getAdminAssetTagCatalog()
  ]);

  return {
    adminUsers,
    assetTagCatalog,
    assetRetentionPolicy,
    auditLogs,
    deletedAssets,
    featureAuthorizations,
    organizations,
    viewerAllowlist
  };
}

interface AdminPageContainerProps {
  session: AuthSessionView;
}

export function AdminPageContainer({ session: initialSession }: AdminPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AdminPageState>({
    adminUsers: [],
    assetTagCatalog: null,
    assetRetentionPolicy: null,
    auditLogs: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    deletedAssets: [],
    health: null,
    healthErrorMessage: null,
    isLoading: true,
    isSavingAllowlist: false,
    isSavingAssetTags: false,
    isSavingAssignment: false,
    isSavingFeatureAccess: false,
    isSavingPolicy: false,
    organizations: [],
    processingDeletedAssetId: null,
    session: initialSession,
    userFeatureAuthorizations: [],
    viewerAllowlist: []
  });

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      try {
        const healthResult = await dashboardApi.health().catch((error: unknown) => ({
          errorMessage: error instanceof Error ? error.message : "Unknown error.",
          health: null
        }));

        if (!isActive) {
          return;
        }

        let adminData: LoadedAdminData | null = null;
        let authErrorMessage = getLoginFailureMessage(initialLocationSearch);
        let authSuccessMessage = getLoginSuccessMessage(initialLocationSearch);

        if (initialSession.authenticated && initialSession.user?.role === "ADMIN") {
          try {
            adminData = await loadAdminData();
          } catch (error: unknown) {
            authErrorMessage = error instanceof Error ? error.message : "Unknown error.";
            authSuccessMessage = null;
          }
        }

        const nextState: AdminPageState = {
          adminUsers: adminData?.adminUsers ?? [],
          assetTagCatalog: adminData?.assetTagCatalog ?? null,
          assetRetentionPolicy: adminData?.assetRetentionPolicy ?? null,
          auditLogs: adminData?.auditLogs ?? [],
          authErrorMessage,
          authSuccessMessage,
          deletedAssets: adminData?.deletedAssets ?? [],
          health: "health" in healthResult ? healthResult.health : healthResult,
          healthErrorMessage: "errorMessage" in healthResult ? healthResult.errorMessage : null,
          isLoading: false,
          isSavingAllowlist: false,
          isSavingAssetTags: false,
          isSavingAssignment: false,
          isSavingFeatureAccess: false,
          isSavingPolicy: false,
          organizations: adminData?.organizations ?? [],
          processingDeletedAssetId: null,
          session: initialSession,
          userFeatureAuthorizations: adminData?.featureAuthorizations ?? [],
          viewerAllowlist: adminData?.viewerAllowlist ?? []
        };

        if (isActive) {
          setState(nextState);
        }
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
          authSuccessMessage: null,
          isLoading: false
        }));
      }
    }

    void loadPage();

    return () => {
      isActive = false;
    };
  }, []);

  function applyAdminData(
    currentState: AdminPageState,
    adminData: LoadedAdminData,
    session: AuthSessionView,
    overrides: Partial<AdminPageState> = {}
  ): AdminPageState {
    return {
      ...currentState,
      adminUsers: adminData.adminUsers,
      assetTagCatalog: adminData.assetTagCatalog,
      assetRetentionPolicy: adminData.assetRetentionPolicy,
      auditLogs: adminData.auditLogs,
      deletedAssets: adminData.deletedAssets,
      organizations: adminData.organizations,
      session,
      userFeatureAuthorizations: adminData.featureAuthorizations,
      viewerAllowlist: adminData.viewerAllowlist,
      ...overrides
    };
  }

  async function runAdminMutation(
    busyPatch: Partial<AdminPageState>,
    idlePatch: Partial<AdminPageState>,
    successMessage: string,
    action: () => Promise<void>
  ): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      ...busyPatch
    }));

    try {
      await action();
      const [session, adminData] = await Promise.all([dashboardApi.getSession(), loadAdminData()]);

      setState((currentState) =>
        applyAdminData(currentState, adminData, session, {
          authSuccessMessage: successMessage,
          ...idlePatch
        })
      );
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        ...idlePatch
      }));
    }
  }

  async function handleLogout(): Promise<void> {
    await dashboardApi.logout();
    window.location.assign("/");
  }

  async function handleSaveManualAssignment(email: string, organizationId: number): Promise<void> {
    await runAdminMutation(
      { isSavingAssignment: true },
      { isSavingAssignment: false },
      "사용자 조직이 업데이트되었습니다.",
      () =>
        dashboardApi.saveManualAssignment(email, {
          organizationId
        }).then(() => undefined)
    );
  }

  async function handleAddViewerAllowlist(email: string): Promise<void> {
    await runAdminMutation(
      { isSavingAllowlist: true },
      { isSavingAllowlist: false },
      "전사 열람 allowlist가 업데이트되었습니다.",
      () => dashboardApi.addViewerAllowlist({ email }).then(() => undefined)
    );
  }

  async function handleRemoveViewerAllowlist(email: string): Promise<void> {
    await runAdminMutation(
      { isSavingAllowlist: true },
      { isSavingAllowlist: false },
      "전사 열람 allowlist가 업데이트되었습니다.",
      () => dashboardApi.removeViewerAllowlist(email).then(() => undefined)
    );
  }

  async function handleSaveAssetRetentionPolicy(policy: AssetRetentionPolicyView): Promise<void> {
    await runAdminMutation(
      { isSavingPolicy: true },
      { isSavingPolicy: false },
      "자산 보관 정책이 업데이트되었습니다.",
      () =>
        dashboardApi.updateAssetRetentionPolicy({
          restoreEnabled: policy.restoreEnabled,
          trashRetentionDays: policy.trashRetentionDays
        }).then(() => undefined)
    );
  }

  async function handleRestoreDeletedAsset(assetId: number): Promise<void> {
    await runAdminMutation(
      { processingDeletedAssetId: assetId },
      { processingDeletedAssetId: null },
      "삭제된 자산을 복구했습니다.",
      () => dashboardApi.restoreAsset(assetId)
    );
  }

  async function handleSaveUserFeatureAccess(
    email: string,
    allowedFeatureKeys: AppFeatureKeyView[]
  ): Promise<void> {
    await runAdminMutation(
      { isSavingFeatureAccess: true },
      { isSavingFeatureAccess: false },
      "사용자 기능 권한이 업데이트되었습니다.",
      () => dashboardApi.saveUserFeatureAccess(email, { allowedFeatureKeys }).then(() => undefined)
    );
  }

  async function handleCreateCharacter(input: CharacterTagUpsertInput): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () => dashboardApi.createCharacterTag(input)
    );
  }

  async function handleUpdateCharacter(characterId: number, input: CharacterTagUpsertInput): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () => dashboardApi.updateCharacterTag(characterId, input)
    );
  }

  async function handleDeleteCharacter(characterId: number): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () => dashboardApi.deleteCharacterTag(characterId)
    );
  }

  async function handleRenameAssetTag(
    tagType: AssetTagTypeView,
    currentValue: string,
    nextValue: string
  ): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () =>
        dashboardApi.renameAssetTag({
          currentValue,
          nextValue,
          tagType
        })
    );
  }

  async function handleMergeAssetTags(
    tagType: AssetTagTypeView,
    sourceValue: string,
    targetValue: string
  ): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () =>
        dashboardApi.mergeAssetTags({
          sourceValue,
          targetValue,
          tagType
        })
    );
  }

  async function handleDeleteAssetTagValue(tagType: AssetTagTypeView, value: string): Promise<void> {
    await runAdminMutation(
      { isSavingAssetTags: true },
      { isSavingAssetTags: false },
      "태그 관리 정보가 업데이트되었습니다.",
      () => dashboardApi.deleteAssetTagValue(tagType, value)
    );
  }

  return (
    <AdminPage
      adminUsers={state.adminUsers}
      assetTagCatalog={state.assetTagCatalog}
      assetRetentionPolicy={state.assetRetentionPolicy}
      auditLogs={state.auditLogs}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      deletedAssets={state.deletedAssets}
      health={state.health}
      healthErrorMessage={state.healthErrorMessage}
      isLoading={state.isLoading}
      isSavingAllowlist={state.isSavingAllowlist}
      isSavingAssetTags={state.isSavingAssetTags}
      isSavingAssignment={state.isSavingAssignment}
      isSavingFeatureAccess={state.isSavingFeatureAccess}
      isSavingPolicy={state.isSavingPolicy}
      onAddViewerAllowlist={handleAddViewerAllowlist}
      onCreateCharacter={handleCreateCharacter}
      onDeleteAssetTagValue={handleDeleteAssetTagValue}
      onDeleteCharacter={handleDeleteCharacter}
      onLogout={handleLogout}
      onMergeAssetTags={handleMergeAssetTags}
      onRemoveViewerAllowlist={handleRemoveViewerAllowlist}
      onRenameAssetTag={handleRenameAssetTag}
      onRestoreDeletedAsset={handleRestoreDeletedAsset}
      onSaveAssetRetentionPolicy={handleSaveAssetRetentionPolicy}
      onSaveManualAssignment={handleSaveManualAssignment}
      onSaveUserFeatureAccess={handleSaveUserFeatureAccess}
      onUpdateCharacter={handleUpdateCharacter}
      organizations={state.organizations}
      processingDeletedAssetId={state.processingDeletedAssetId}
      session={state.session}
      userFeatureAuthorizations={state.userFeatureAuthorizations}
      viewerAllowlist={state.viewerAllowlist}
    />
  );
}
