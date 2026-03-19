import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
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
import { DashboardHomePage } from "./dashboard-home-page";

interface DashboardHomePageState {
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
  processingDeletedAssetId: number | null;
  organizations: OrganizationOptionView[];
  session: AuthSessionView;
  viewerAllowlist: ViewerAllowlistEntryView[];
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

async function loadAdminData(): Promise<{
  adminUsers: AuthUserView[];
  assetRetentionPolicy: AssetRetentionPolicyView;
  auditLogs: AuditLogView[];
  deletedAssets: DeletedAssetView[];
  organizations: OrganizationOptionView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}> {
  const [adminUsers, organizations, viewerAllowlist, auditLogs, assetRetentionPolicy, deletedAssets] = await Promise.all([
    dashboardApi.listUsers(),
    dashboardApi.listOrganizations(),
    dashboardApi.listViewerAllowlist(),
    dashboardApi.listAuditLogs(),
    dashboardApi.getAssetRetentionPolicy(),
    dashboardApi.listDeletedAssets()
  ]);

  return {
    adminUsers,
    assetRetentionPolicy,
    auditLogs,
    deletedAssets,
    organizations,
    viewerAllowlist
  };
}

export function DashboardHomePageContainer(): React.JSX.Element {
  const [state, setState] = useState<DashboardHomePageState>({
    adminUsers: [],
    assetRetentionPolicy: null,
    auditLogs: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    deletedAssets: [],
    health: null,
    healthErrorMessage: null,
    isLoading: true,
    isSavingPolicy: false,
    isSavingAssignment: false,
    isSavingAllowlist: false,
    processingDeletedAssetId: null,
    organizations: [],
    session: createAnonymousSession(),
    viewerAllowlist: []
  });

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      try {
        const [healthResult, session] = await Promise.all([
          dashboardApi.health().catch((error: unknown) => ({
            errorMessage: error instanceof Error ? error.message : "Unknown error.",
            health: null
          })),
          dashboardApi.getSession()
        ]);

        if (!isActive) {
          return;
        }

        let adminUsers: AuthUserView[] = [];
        let assetRetentionPolicy: AssetRetentionPolicyView | null = null;
        let auditLogs: AuditLogView[] = [];
        let deletedAssets: DeletedAssetView[] = [];
        let organizations: OrganizationOptionView[] = [];
        let viewerAllowlist: ViewerAllowlistEntryView[] = [];
        let authErrorMessage = getLoginFailureMessage(initialLocationSearch);
        let authSuccessMessage = getLoginSuccessMessage(initialLocationSearch);

        if (session.authenticated && session.user?.role === "ADMIN") {
          try {
            ({ adminUsers, assetRetentionPolicy, auditLogs, deletedAssets, organizations, viewerAllowlist } = await loadAdminData());
          } catch (error: unknown) {
            authErrorMessage = error instanceof Error ? error.message : "Unknown error.";
            authSuccessMessage = null;
          }
        }

        const nextState: DashboardHomePageState = {
          adminUsers,
          assetRetentionPolicy,
          auditLogs,
          authErrorMessage,
          authSuccessMessage,
          deletedAssets,
          health: "health" in healthResult ? healthResult.health : healthResult,
          healthErrorMessage: "errorMessage" in healthResult ? healthResult.errorMessage : null,
          isLoading: false,
          isSavingPolicy: false,
          isSavingAssignment: false,
          isSavingAllowlist: false,
          processingDeletedAssetId: null,
          organizations,
          session,
          viewerAllowlist
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

    void loadPage()

    return () => {
      isActive = false;
    };
  }, []);

  async function handleLogout(): Promise<void> {
    await dashboardApi.logout();
    window.location.assign("/");
  }

  async function handleSaveManualAssignment(
    email: string,
    organizationId: number,
    positionTitle: string
  ): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingAssignment: true
    }));

    try {
      await dashboardApi.saveManualAssignment(email, {
        organizationId,
        positionTitle
      });

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        assetRetentionPolicy: adminData.assetRetentionPolicy,
        auditLogs: adminData.auditLogs,
        deletedAssets: adminData.deletedAssets,
        isSavingAssignment: false,
        organizations: adminData.organizations,
        session,
        viewerAllowlist: adminData.viewerAllowlist
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingAssignment: false
      }));
    }
  }

  async function handleAddViewerAllowlist(email: string): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingAllowlist: true
    }));

    try {
      await dashboardApi.addViewerAllowlist({ email });

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        assetRetentionPolicy: adminData.assetRetentionPolicy,
        auditLogs: adminData.auditLogs,
        deletedAssets: adminData.deletedAssets,
        isSavingAllowlist: false,
        organizations: adminData.organizations,
        session,
        viewerAllowlist: adminData.viewerAllowlist
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingAllowlist: false
      }));
    }
  }

  async function handleRemoveViewerAllowlist(email: string): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingAllowlist: true
    }));

    try {
      await dashboardApi.removeViewerAllowlist(email);

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        assetRetentionPolicy: adminData.assetRetentionPolicy,
        auditLogs: adminData.auditLogs,
        deletedAssets: adminData.deletedAssets,
        isSavingAllowlist: false,
        organizations: adminData.organizations,
        session,
        viewerAllowlist: adminData.viewerAllowlist
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingAllowlist: false
      }));
    }
  }

  async function handleSaveAssetRetentionPolicy(policy: AssetRetentionPolicyView): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingPolicy: true
    }));

    try {
      await dashboardApi.updateAssetRetentionPolicy({
        restoreEnabled: policy.restoreEnabled,
        trashRetentionDays: policy.trashRetentionDays
      });

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        assetRetentionPolicy: adminData.assetRetentionPolicy,
        auditLogs: adminData.auditLogs,
        authSuccessMessage: "자산 보관 정책이 업데이트되었습니다.",
        deletedAssets: adminData.deletedAssets,
        isSavingPolicy: false,
        organizations: adminData.organizations,
        session,
        viewerAllowlist: adminData.viewerAllowlist
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingPolicy: false
      }));
    }
  }

  async function handleRestoreDeletedAsset(assetId: number): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      processingDeletedAssetId: assetId
    }));

    try {
      await dashboardApi.restoreAsset(assetId);

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        assetRetentionPolicy: adminData.assetRetentionPolicy,
        auditLogs: adminData.auditLogs,
        authSuccessMessage: "삭제된 자산을 복구했습니다.",
        deletedAssets: adminData.deletedAssets,
        organizations: adminData.organizations,
        processingDeletedAssetId: null,
        session,
        viewerAllowlist: adminData.viewerAllowlist
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        processingDeletedAssetId: null
      }));
    }
  }

  return (
    <DashboardHomePage
      adminUsers={state.adminUsers}
      assetRetentionPolicy={state.assetRetentionPolicy}
      auditLogs={state.auditLogs}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      deletedAssets={state.deletedAssets}
      health={state.health}
      healthErrorMessage={state.healthErrorMessage}
      isLoading={state.isLoading}
      isSavingPolicy={state.isSavingPolicy}
      isSavingAssignment={state.isSavingAssignment}
      isSavingAllowlist={state.isSavingAllowlist}
      onAddViewerAllowlist={handleAddViewerAllowlist}
      onLogout={handleLogout}
      onRemoveViewerAllowlist={handleRemoveViewerAllowlist}
      onRestoreDeletedAsset={handleRestoreDeletedAsset}
      onSaveAssetRetentionPolicy={handleSaveAssetRetentionPolicy}
      onSaveManualAssignment={handleSaveManualAssignment}
      organizations={state.organizations}
      processingDeletedAssetId={state.processingDeletedAssetId}
      session={state.session}
      viewerAllowlist={state.viewerAllowlist}
    />
  );
}
