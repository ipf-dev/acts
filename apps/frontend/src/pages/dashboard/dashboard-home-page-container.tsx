import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
import type {
  AuditLogView,
  AppHealthView,
  AuthSessionView,
  AuthUserView,
  DepartmentOptionView,
  TeamOptionView,
  ViewerAllowlistEntryView
} from "../../dashboard-types";
import { DashboardHomePage } from "./dashboard-home-page";

interface DashboardHomePageState {
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
  session: AuthSessionView;
  teams: TeamOptionView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

async function loadAdminData(): Promise<{
  adminUsers: AuthUserView[];
  auditLogs: AuditLogView[];
  departments: DepartmentOptionView[];
  teams: TeamOptionView[];
  viewerAllowlist: ViewerAllowlistEntryView[];
}> {
  const [adminUsers, departments, teams, viewerAllowlist, auditLogs] = await Promise.all([
    dashboardApi.listUsers(),
    dashboardApi.listDepartments(),
    dashboardApi.listTeams(),
    dashboardApi.listViewerAllowlist(),
    dashboardApi.listAuditLogs()
  ]);

  return {
    adminUsers,
    auditLogs,
    departments,
    teams,
    viewerAllowlist
  };
}

export function DashboardHomePageContainer(): React.JSX.Element {
  const [state, setState] = useState<DashboardHomePageState>({
    adminUsers: [],
    auditLogs: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    departments: [],
    health: null,
    healthErrorMessage: null,
    isLoading: true,
    isSavingAssignment: false,
    isSavingAllowlist: false,
    session: createAnonymousSession(),
    teams: [],
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
        let auditLogs: AuditLogView[] = [];
        let departments: DepartmentOptionView[] = [];
        let teams: TeamOptionView[] = [];
        let viewerAllowlist: ViewerAllowlistEntryView[] = [];
        let authErrorMessage = getLoginFailureMessage(initialLocationSearch);
        let authSuccessMessage = getLoginSuccessMessage(initialLocationSearch);

        if (session.authenticated && session.user?.role === "ADMIN") {
          try {
            ({ adminUsers, auditLogs, departments, teams, viewerAllowlist } = await loadAdminData());
          } catch (error: unknown) {
            authErrorMessage = error instanceof Error ? error.message : "Unknown error.";
            authSuccessMessage = null;
          }
        }

        const nextState: DashboardHomePageState = {
          adminUsers,
          auditLogs,
          authErrorMessage,
          authSuccessMessage,
          departments,
          health: "health" in healthResult ? healthResult.health : healthResult,
          healthErrorMessage: "errorMessage" in healthResult ? healthResult.errorMessage : null,
          isLoading: false,
          isSavingAssignment: false,
          isSavingAllowlist: false,
          session,
          teams,
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

    void loadPage();

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
    departmentId: number,
    teamId: number,
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
        departmentId,
        teamId,
        positionTitle
      });

      const [session, adminData] = await Promise.all([
        dashboardApi.getSession(),
        loadAdminData()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers: adminData.adminUsers,
        auditLogs: adminData.auditLogs,
        departments: adminData.departments,
        isSavingAssignment: false,
        session,
        teams: adminData.teams,
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
        auditLogs: adminData.auditLogs,
        departments: adminData.departments,
        isSavingAllowlist: false,
        session,
        teams: adminData.teams,
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
        auditLogs: adminData.auditLogs,
        departments: adminData.departments,
        isSavingAllowlist: false,
        session,
        teams: adminData.teams,
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

  return (
    <DashboardHomePage
      adminUsers={state.adminUsers}
      auditLogs={state.auditLogs}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      departments={state.departments}
      health={state.health}
      healthErrorMessage={state.healthErrorMessage}
      isLoading={state.isLoading}
      isSavingAssignment={state.isSavingAssignment}
      isSavingAllowlist={state.isSavingAllowlist}
      onAddViewerAllowlist={handleAddViewerAllowlist}
      onLogout={handleLogout}
      onRemoveViewerAllowlist={handleRemoveViewerAllowlist}
      onSaveManualAssignment={handleSaveManualAssignment}
      session={state.session}
      teams={state.teams}
      viewerAllowlist={state.viewerAllowlist}
    />
  );
}
