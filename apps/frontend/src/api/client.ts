import type {
  AdminAssetTagCatalogView,
  AssetFileAccessModeView,
  AssetFileAccessUrlView,
  AssetTagOptionCatalogView,
  AssetTagMergeInput,
  AssetTagRenameInput,
  AssetDetailView,
  AssetRetentionPolicyInput,
  AssetRetentionPolicyView,
  AssetLinkRegistrationInput,
  AssetSummaryView,
  AssetUpdateInput,
  AssetUploadInput,
  AuditLogView,
  AppHealthView,
  AppFeatureKeyView,
  AuthSessionView,
  AuthUserView,
  CharacterTagOptionView,
  CharacterTagUpsertInput,
  DeletedAssetView,
  ManualAssignmentInput,
  OrganizationOptionView,
  UserFeatureAccessInput,
  UserFeatureAuthorizationView,
  ViewerAllowlistEntryView,
  ViewerAllowlistInput
} from "./types";

export interface DashboardApi {
  createCharacterTag(input: CharacterTagUpsertInput): Promise<void>;
  deleteAssetTagValue(tagType: string, value: string): Promise<void>;
  deleteCharacterTag(characterId: number): Promise<void>;
  deleteAsset(assetId: number): Promise<void>;
  downloadAsset(assetId: number): Promise<DownloadedFile>;
  exportAssets(): Promise<DownloadedFile>;
  getAsset(assetId: number): Promise<AssetDetailView>;
  getAssetFileAccessUrl(assetId: number, mode: AssetFileAccessModeView): Promise<AssetFileAccessUrlView>;
  getAdminAssetTagCatalog(): Promise<AdminAssetTagCatalogView>;
  getAssetRetentionPolicy(): Promise<AssetRetentionPolicyView>;
  listAssetTagOptions(): Promise<AssetTagOptionCatalogView>;
  listDeletedAssets(): Promise<DeletedAssetView[]>;
  listAssets(): Promise<AssetSummaryView[]>;
  listCharacterTagOptions(): Promise<CharacterTagOptionView[]>;
  registerAssetLinks(input: AssetLinkRegistrationInput): Promise<AssetSummaryView[]>;
  mergeAssetTags(input: AssetTagMergeInput): Promise<void>;
  renameAssetTag(input: AssetTagRenameInput): Promise<void>;
  restoreAsset(assetId: number): Promise<void>;
  updateAsset(assetId: number, input: AssetUpdateInput): Promise<AssetDetailView>;
  updateAssetRetentionPolicy(input: AssetRetentionPolicyInput): Promise<AssetRetentionPolicyView>;
  updateCharacterTag(characterId: number, input: CharacterTagUpsertInput): Promise<void>;
  uploadAsset(input: AssetUploadInput, options?: AssetUploadOptions): Promise<AssetSummaryView>;
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

export type AssetUploadProgressPhase = "PREPARING" | "UPLOADING" | "FINALIZING";

export interface AssetUploadProgress {
  phase: AssetUploadProgressPhase;
  totalBytes: number | null;
  uploadedBytes: number;
}

export interface AssetUploadOptions {
  onProgress?: (progress: AssetUploadProgress) => void;
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
    async createCharacterTag(input) {
      const response = await fetchFn("/api/auth/admin/asset-tags/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async deleteAssetTagValue(tagType, value) {
      const response = await fetchFn(
        `/api/auth/admin/asset-tags?tagType=${encodeURIComponent(tagType)}&value=${encodeURIComponent(value)}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async deleteCharacterTag(characterId) {
      const response = await fetchFn(`/api/auth/admin/asset-tags/characters/${characterId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
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
    async getAssetFileAccessUrl(assetId, mode) {
      return readJson<AssetFileAccessUrlView>(
        `/api/assets/${assetId}/file-access-url?mode=${encodeURIComponent(mode)}`
      );
    },
    async getAdminAssetTagCatalog() {
      return readJson<AdminAssetTagCatalogView>("/api/auth/admin/asset-tags");
    },
    async getAssetRetentionPolicy() {
      return readJson<AssetRetentionPolicyView>("/api/assets/policy");
    },
    async listAssetTagOptions() {
      return readJson<AssetTagOptionCatalogView>("/api/assets/tags/options");
    },
    async listDeletedAssets() {
      return readJson<DeletedAssetView[]>("/api/assets/deleted");
    },
    async listAssets() {
      return readJson<AssetSummaryView[]>("/api/assets");
    },
    async listCharacterTagOptions() {
      return readJson<CharacterTagOptionView[]>("/api/assets/tags/characters");
    },
    async mergeAssetTags(input) {
      const response = await fetchFn("/api/auth/admin/asset-tags/merge", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async registerAssetLinks(input) {
      return readJson<AssetSummaryView[]>("/api/assets/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async renameAssetTag(input) {
      const response = await fetchFn("/api/auth/admin/asset-tags/rename", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
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
    async uploadAsset(input, options) {
      options?.onProgress?.({
        phase: "PREPARING",
        totalBytes: input.file.size,
        uploadedBytes: 0
      });

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

      options?.onProgress?.({
        phase: "UPLOADING",
        totalBytes: input.file.size,
        uploadedBytes: 0
      });

      await uploadFileToPresignedUrl(
        intentResponse.presignedUrl,
        input.file,
        input.file.type || "application/octet-stream",
        options?.onProgress
      );

      options?.onProgress?.({
        phase: "FINALIZING",
        totalBytes: input.file.size,
        uploadedBytes: input.file.size
      });

      return readJson<AssetSummaryView>(`/api/assets/${intentResponse.assetId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: intentResponse.objectKey,
          fileSizeBytes: input.file.size,
          widthPx: input.widthPx ?? null,
          heightPx: input.heightPx ?? null
        })
      });
    },
    async updateCharacterTag(characterId, input) {
      const response = await fetchFn(`/api/auth/admin/asset-tags/characters/${characterId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new ApiError(response.status);
      }
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

function uploadFileToPresignedUrl(
  url: string,
  file: File,
  contentType: string,
  onProgress?: (progress: AssetUploadProgress) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastEmittedPercent = -1;
    let lastEmitTimestamp = 0;
    const totalBytes = file.size > 0 ? file.size : null;

    function emitUploadingProgress(uploadedBytes: number, force = false): void {
      const normalizedUploadedBytes =
        totalBytes !== null ? Math.max(0, Math.min(uploadedBytes, totalBytes)) : Math.max(0, uploadedBytes);
      const nextPercent =
        totalBytes && totalBytes > 0 ? Math.min(100, Math.round((normalizedUploadedBytes / totalBytes) * 100)) : 0;

      const now = Date.now();
      if (!force && nextPercent === lastEmittedPercent && now - lastEmitTimestamp < 120) {
        return;
      }

      lastEmittedPercent = nextPercent;
      lastEmitTimestamp = now;
      onProgress?.({
        phase: "UPLOADING",
        totalBytes,
        uploadedBytes: normalizedUploadedBytes
      });
    }

    xhr.upload.addEventListener("loadstart", () => {
      emitUploadingProgress(0, true);
    });

    xhr.upload.addEventListener("progress", (event) => {
      emitUploadingProgress(event.loaded, event.loaded === 0);
    });

    xhr.upload.addEventListener("loadend", () => {
      emitUploadingProgress(100, true);
    });

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        emitUploadingProgress(100, true);
        resolve();
        return;
      }

      reject(new ApiError(xhr.status || 500));
    };

    xhr.onerror = () => reject(new ApiError(xhr.status || 500, "업로드 중 네트워크 오류가 발생했습니다."));
    xhr.onabort = () => reject(new ApiError(499, "업로드가 중단되었습니다."));
    emitUploadingProgress(0, true);
    xhr.send(file);
  });
}
