import type {
  AssetDetailView,
  AssetRetentionPolicyInput,
  AssetRetentionPolicyView,
  AssetSummaryView,
  AssetUpdateInput,
  AssetUploadInput,
  AuditLogView,
  AppHealthView,
  AppFeatureKeyView,
  AuthSessionView,
  AuthUserView,
  DeletedAssetView,
  ManualAssignmentInput,
  OrganizationOptionView,
  UserFeatureAccessInput,
  UserFeatureAuthorizationView,
  ViewerAllowlistEntryView,
  ViewerAllowlistInput
} from "./types";

export interface DashboardApi {
  deleteAsset(assetId: number): Promise<void>;
  downloadAsset(assetId: number): Promise<DownloadedFile>;
  exportAssets(): Promise<DownloadedFile>;
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
  listUserFeatureAccess(): Promise<UserFeatureAuthorizationView[]>;
  listUsers(): Promise<AuthUserView[]>;
  listViewerAllowlist(): Promise<ViewerAllowlistEntryView[]>;
  addViewerAllowlist(input: ViewerAllowlistInput): Promise<ViewerAllowlistEntryView[]>;
  removeViewerAllowlist(email: string): Promise<ViewerAllowlistEntryView[]>;
  listAuditLogs(): Promise<AuditLogView[]>;
  logout(): Promise<void>;
  saveManualAssignment(email: string, input: ManualAssignmentInput): Promise<AuthUserView>;
  saveUserFeatureAccess(
    email: string,
    input: UserFeatureAccessInput
  ): Promise<UserFeatureAuthorizationView>;
}

export interface DownloadedFile {
  blob: Blob;
  contentType: string;
  fileName: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message?: string) {
    super(message ?? `Request failed with status ${status}.`);
    this.name = "ApiError";
    this.status = status;
  }
}

export function createDashboardApi(fetchFn: typeof fetch = fetch): DashboardApi {
  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetchFn(input, init);
    if (!response.ok) {
      throw new ApiError(response.status);
    }

    return (await response.json()) as T;
  }

  async function readFile(input: RequestInfo, init?: RequestInit): Promise<DownloadedFile> {
    const response = await fetchFn(input, init);
    if (!response.ok) {
      throw new ApiError(response.status);
    }

    const blob = await response.blob();
    return {
      blob,
      contentType: response.headers.get("Content-Type") ?? blob.type,
      fileName: parseContentDispositionFileName(response.headers.get("Content-Disposition")) ?? "download"
    };
  }

  return {
    async deleteAsset(assetId) {
      const response = await fetchFn(`/api/assets/${assetId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async downloadAsset(assetId) {
      return readFile(`/api/assets/${assetId}/download`);
    },
    async exportAssets() {
      return readFile("/api/assets/export");
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
        throw new ApiError(response.status);
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
      // Step 1: get presigned URL from backend
      const intentResponse = await readJson<{ assetId: number; presignedUrl: string; objectKey: string }>(
        "/api/assets/upload-intent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: input.file.name,
            contentType: input.file.type || "application/octet-stream",
            fileSizeBytes: input.file.size,
            title: input.title,
            description: input.description,
            tags: input.tags,
          }),
        }
      );

      // Step 2: upload directly to S3
      const s3Response = await fetch(intentResponse.presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": input.file.type || "application/octet-stream" },
        body: input.file,
      });
      if (!s3Response.ok) {
        throw new ApiError(s3Response.status);
      }

      // Step 3: notify backend of completion
      return readJson<AssetSummaryView>(`/api/assets/${intentResponse.assetId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: intentResponse.objectKey,
          fileSizeBytes: input.file.size,
          widthPx: input.widthPx ?? null,
          heightPx: input.heightPx ?? null,
        }),
      });
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
    async listUserFeatureAccess() {
      return readJson<UserFeatureAuthorizationView[]>("/api/auth/admin/user-feature-access");
    },
    async listUsers() {
      return readJson<AuthUserView[]>("/api/auth/admin/users");
    },
    async listViewerAllowlist() {
      return readJson<ViewerAllowlistEntryView[]>("/api/auth/admin/viewer-allowlist");
    },
    async addViewerAllowlist(input) {
      return readJson<ViewerAllowlistEntryView[]>(
        `/api/auth/admin/viewer-allowlist?email=${encodeURIComponent(input.email)}`,
        {
          method: "POST"
        }
      );
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
        throw new ApiError(response.status, `Logout failed with status ${response.status}.`);
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
    },
    async saveUserFeatureAccess(email, input) {
      return readJson<UserFeatureAuthorizationView>(
        `/api/auth/admin/users/${encodeURIComponent(email)}/feature-access`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            allowedFeatureKeys: input.allowedFeatureKeys as AppFeatureKeyView[]
          })
        }
      );
    }
  };
}

function parseContentDispositionFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = contentDisposition.match(/filename=\"([^\"]+)\"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  return null;
}
