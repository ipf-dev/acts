import type {
  AuditLogView,
  AppHealthView,
  AuthSessionView,
  DepartmentOptionView,
  AuthUserView,
  ManualAssignmentInput,
  TeamOptionView,
  ViewerAllowlistEntryView,
  ViewerAllowlistInput
} from "./dashboard-types";

export interface DashboardApi {
  health(): Promise<AppHealthView>;
  getSession(): Promise<AuthSessionView>;
  listDepartments(): Promise<DepartmentOptionView[]>;
  listTeams(): Promise<TeamOptionView[]>;
  listUsers(): Promise<AuthUserView[]>;
  listViewerAllowlist(): Promise<ViewerAllowlistEntryView[]>;
  addViewerAllowlist(input: ViewerAllowlistInput): Promise<ViewerAllowlistEntryView[]>;
  removeViewerAllowlist(email: string): Promise<ViewerAllowlistEntryView[]>;
  listAuditLogs(): Promise<AuditLogView[]>;
  logout(): Promise<void>;
  saveManualAssignment(email: string, input: ManualAssignmentInput): Promise<AuthUserView>;
}

export function createDashboardApi(fetchFn: typeof fetch = fetch): DashboardApi {
  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetchFn(input, init);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  return {
    async health() {
      return readJson<AppHealthView>("/api/health");
    },
    async getSession() {
      return readJson<AuthSessionView>("/api/auth/me");
    },
    async listDepartments() {
      return readJson<DepartmentOptionView[]>("/api/auth/admin/departments");
    },
    async listTeams() {
      return readJson<TeamOptionView[]>("/api/auth/admin/teams");
    },
    async listUsers() {
      return readJson<AuthUserView[]>("/api/auth/admin/users");
    },
    async listViewerAllowlist() {
      return readJson<ViewerAllowlistEntryView[]>("/api/auth/admin/viewer-allowlist");
    },
    async addViewerAllowlist(input) {
      return readJson<ViewerAllowlistEntryView[]>("/api/auth/admin/viewer-allowlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async removeViewerAllowlist(email) {
      return readJson<ViewerAllowlistEntryView[]>(
        `/api/auth/admin/viewer-allowlist/${encodeURIComponent(email)}`,
        {
          method: "DELETE"
        }
      );
    },
    async listAuditLogs() {
      return readJson<AuditLogView[]>("/api/auth/admin/audit-logs");
    },
    async logout() {
      const response = await fetchFn("/api/auth/logout", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}.`);
      }
    },
    async saveManualAssignment(email, input) {
      return readJson<AuthUserView>(`/api/auth/admin/users/${encodeURIComponent(email)}/assignment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    }
  };
}
