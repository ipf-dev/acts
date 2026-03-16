import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
import type { AppHealthView, AuthSessionView, AuthUserView } from "../../dashboard-types";
import { DashboardHomePage } from "./dashboard-home-page";

interface DashboardHomePageState {
  adminUsers: AuthUserView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  health: AppHealthView | null;
  healthErrorMessage: string | null;
  isLoading: boolean;
  isSavingAssignment: boolean;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function DashboardHomePageContainer(): React.JSX.Element {
  const [state, setState] = useState<DashboardHomePageState>({
    adminUsers: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    health: null,
    healthErrorMessage: null,
    isLoading: true,
    isSavingAssignment: false,
    session: createAnonymousSession()
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
        let authErrorMessage = getLoginFailureMessage(initialLocationSearch);
        let authSuccessMessage = getLoginSuccessMessage(initialLocationSearch);

        if (session.authenticated && session.user?.role === "ADMIN") {
          try {
            adminUsers = await dashboardApi.listUsers();
          } catch (error: unknown) {
            authErrorMessage = error instanceof Error ? error.message : "Unknown error.";
            authSuccessMessage = null;
          }
        }

        const nextState: DashboardHomePageState = {
          adminUsers,
          authErrorMessage,
          authSuccessMessage,
          health: "health" in healthResult ? healthResult.health : healthResult,
          healthErrorMessage: "errorMessage" in healthResult ? healthResult.errorMessage : null,
          isLoading: false,
          isSavingAssignment: false,
          session
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
    teamName: string,
    departmentName: string
  ): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingAssignment: true
    }));

    try {
      await dashboardApi.saveManualAssignment(email, {
        departmentName,
        teamName
      });

      const [session, adminUsers] = await Promise.all([
        dashboardApi.getSession(),
        dashboardApi.listUsers()
      ]);

      setState((currentState) => ({
        ...currentState,
        adminUsers,
        isSavingAssignment: false,
        session
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingAssignment: false
      }));
    }
  }

  return (
    <DashboardHomePage
      adminUsers={state.adminUsers}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      health={state.health}
      healthErrorMessage={state.healthErrorMessage}
      isLoading={state.isLoading}
      isSavingAssignment={state.isSavingAssignment}
      onLogout={handleLogout}
      onSaveManualAssignment={handleSaveManualAssignment}
      session={state.session}
    />
  );
}
