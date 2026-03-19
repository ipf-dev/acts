import type {
  AssetDetailView,
  AssetRetentionPolicyInput,
  AssetRetentionPolicyView,
  AssetSummaryView,
  AssetUpdateInput,
  AssetUploadInput,
  AuditLogView,
  AppHealthView,
  AuthSessionView,
  AuthUserView,
  DeletedAssetView,
  ManualAssignmentInput,
  OrganizationOptionView,
  ViewerAllowlistEntryView,
  ViewerAllowlistInput
} from "./dashboard-types";

export interface DashboardApi {
  deleteAsset(assetId: number): Promise<void>;
  getAsset(assetId: number): Promise<AssetDetailView>;
  getAssetRetentionPolicy(): Promise<AssetRetentionPolicyView>;
  listDeletedAssets(): Promise<DeletedAssetView[]>;
  listAssets(): Promise<AssetSummaryView[]>;
  restoreAsset(assetId: number): Promise<void>;
  updateAsset(assetId: number, input: AssetUpdateInput): Promise<AssetDetailView>;
  updateAssetRetentionPolicy(input: AssetRetentionPolicyInput): Promise<AssetRetentionPolicyView>;
  uploadAsset(input: AssetUploadInput): Promise<AssetSummaryView>;
  health(): Promise<AppHealthView>;
  getSession(): Promise<AuthSessionView>;
  listOrganizations(): Promise<OrganizationOptionView[]>;
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
    async deleteAsset(assetId) {
      const response = await fetchFn(`/api/assets/${assetId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }
    },
    async getAsset(assetId) {
      return readJson<AssetDetailView>(`/api/assets/${assetId}`);
    },
    async getAssetRetentionPolicy() {
      return readJson<AssetRetentionPolicyView>("/api/assets/policy");
    },
    async listDeletedAssets() {
      return readJson<DeletedAssetView[]>("/api/assets/deleted");
    },
    async listAssets() {
      return readJson<AssetSummaryView[]>("/api/assets");
    },
    async restoreAsset(assetId) {
      const response = await fetchFn(`/api/assets/${assetId}/restore`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }
    },
    async updateAsset(assetId, input) {
      return readJson<AssetDetailView>(`/api/assets/${assetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async updateAssetRetentionPolicy(input) {
      return readJson<AssetRetentionPolicyView>("/api/assets/policy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async uploadAsset(input) {
      const formData = new FormData();
      formData.append("file", input.file);
      if (input.title) {
        formData.append("title", input.title);
      }
      if (input.description) {
        formData.append("description", input.description);
      }
      if (input.sourceDetail) {
        formData.append("sourceDetail", input.sourceDetail);
      }
      input.tags.forEach((tag) => formData.append("tags", tag));

      const response = await fetchFn("/api/assets/uploads", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}.`);
      }

      return (await response.json()) as AssetSummaryView;
    },
    async health() {
      return readJson<AppHealthView>("/api/health");
    },
    async getSession() {
      return readJson<AuthSessionView>("/api/auth/me");
    },
    async listOrganizations() {
      return readJson<OrganizationOptionView[]>("/api/auth/admin/organizations");
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
