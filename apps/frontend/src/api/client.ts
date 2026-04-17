import type {
  AdminAssetTagCatalogView,
  AssetCatalogFilterOptionsView,
  AssetCatalogPageView,
  AssetCatalogQueryView,
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
  HubNavigationView,
  HubEpisodeSlotAssetLinkInput,
  HubEpisodeSlotCreateInputView,
  HubEpisodeSlotView,
  HubEpisodeUpsertInputView,
  HubEpisodeView,
  HubLevelCreateInputView,
  HubLevelNavigationView,
  HubSeriesCreateInputView,
  HubSeriesNavigationView,
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
  getHubNavigation(): Promise<HubNavigationView>;
  getHubEpisode(episodeKey: string): Promise<HubEpisodeView>;
  getAdminAssetTagCatalog(): Promise<AdminAssetTagCatalogView>;
  listAssetCatalogFilterOptions(): Promise<AssetCatalogFilterOptionsView>;
  getAssetRetentionPolicy(): Promise<AssetRetentionPolicyView>;
  listAssetTagOptions(): Promise<AssetTagOptionCatalogView>;
  listDeletedAssets(): Promise<DeletedAssetView[]>;
  listAssets(query?: AssetCatalogQueryView): Promise<AssetCatalogPageView>;
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
  createHubLevel(seriesKey: string, input: HubLevelCreateInputView): Promise<HubLevelNavigationView>;
  createHubEpisode(levelKey: string, input: HubEpisodeUpsertInputView): Promise<HubEpisodeView>;
  createHubEpisodeSlot(episodeKey: string, input: HubEpisodeSlotCreateInputView): Promise<HubEpisodeSlotView>;
  createHubSeries(input: HubSeriesCreateInputView): Promise<HubSeriesNavigationView>;
  deleteHubEpisode(episodeKey: string): Promise<void>;
  deleteHubEpisodeSlot(episodeKey: string, slotId: number): Promise<void>;
  assignHubEpisodeSlotAsset(
    episodeKey: string,
    slotId: number,
    input: HubEpisodeSlotAssetLinkInput
  ): Promise<HubEpisodeSlotView>;
  removeHubEpisodeSlotAsset(
    episodeKey: string,
    slotId: number,
    assetId: number
  ): Promise<HubEpisodeSlotView>;
  updateHubEpisode(episodeKey: string, input: HubEpisodeUpsertInputView): Promise<HubEpisodeView>;
  removeViewerAllowlist(email: string): Promise<ViewerAllowlistEntryView[]>;
  listAuditLogs(): Promise<AuditLogView[]>;
  logout(): Promise<void>;
  promoteUserToAdmin(email: string): Promise<AuthUserView>;
  updateUserDisplayName(email: string, displayName: string): Promise<AuthUserView>;
  deactivateUser(email: string): Promise<AuthUserView>;
  reactivateUser(email: string): Promise<AuthUserView>;
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
  function handleSessionExpired(response: Response): void {
    if (response.redirected || response.status === 401) {
      window.location.assign("/");
      throw new ApiError(401, "세션이 만료되었습니다. 다시 로그인해주세요.");
    }
  }

  async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetchFn(input, init);
    handleSessionExpired(response);
    if (!response.ok) {
      throw new ApiError(response.status);
    }

    return (await response.json()) as T;
  }

  async function readFile(input: RequestInfo, init?: RequestInit): Promise<DownloadedFile> {
    const response = await fetchFn(input, init);
    handleSessionExpired(response);
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
      handleSessionExpired(response);

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
      handleSessionExpired(response);

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async deleteCharacterTag(characterId) {
      const response = await fetchFn(`/api/auth/admin/asset-tags/characters/${characterId}`, {
        method: "DELETE"
      });
      handleSessionExpired(response);

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async deleteAsset(assetId) {
      const response = await fetchFn(`/api/assets/${assetId}`, {
        method: "DELETE"
      });
      handleSessionExpired(response);

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
    async getHubNavigation() {
      return readJson<HubNavigationView>("/api/hub/navigation");
    },
    async getHubEpisode(episodeKey) {
      return readJson<HubEpisodeView>(`/api/hub/episodes/${encodeURIComponent(episodeKey)}`);
    },
    async getAdminAssetTagCatalog() {
      return readJson<AdminAssetTagCatalogView>("/api/auth/admin/asset-tags");
    },
    async listAssetCatalogFilterOptions() {
      return readJson<AssetCatalogFilterOptionsView>("/api/assets/filter-options");
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
    async listAssets(query = {}) {
      const searchParams = createAssetCatalogSearchParams(query);
      const requestPath = searchParams.toString() ? `/api/assets?${searchParams.toString()}` : "/api/assets";
      return readJson<AssetCatalogPageView>(requestPath);
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
      handleSessionExpired(response);

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
      handleSessionExpired(response);

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async restoreAsset(assetId) {
      const response = await fetchFn(`/api/assets/${assetId}/restore`, {
        method: "POST"
      });
      handleSessionExpired(response);

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
      const MULTIPART_THRESHOLD = 10 * 1024 * 1024;

      if (input.file.size > MULTIPART_THRESHOLD) {
        return uploadAssetMultipart(readJson, input, options);
      }

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
            typeMetadata: input.typeMetadata,
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
      handleSessionExpired(response);

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
    async createHubLevel(seriesKey, input) {
      return readJson<HubLevelNavigationView>(`/api/hub/series/${encodeURIComponent(seriesKey)}/levels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async createHubEpisode(levelKey, input) {
      return readJson<HubEpisodeView>(`/api/hub/levels/${encodeURIComponent(levelKey)}/episodes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async createHubEpisodeSlot(episodeKey, input) {
      return readJson<HubEpisodeSlotView>(`/api/hub/episodes/${encodeURIComponent(episodeKey)}/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async createHubSeries(input) {
      return readJson<HubSeriesNavigationView>("/api/hub/series", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(input)
      });
    },
    async deleteHubEpisode(episodeKey) {
      const response = await fetchFn(`/api/hub/episodes/${encodeURIComponent(episodeKey)}`, {
        method: "DELETE"
      });
      handleSessionExpired(response);

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async deleteHubEpisodeSlot(episodeKey, slotId) {
      const response = await fetchFn(
        `/api/hub/episodes/${encodeURIComponent(episodeKey)}/slots/${slotId}`,
        {
          method: "DELETE"
        }
      );
      handleSessionExpired(response);

      if (!response.ok) {
        throw new ApiError(response.status);
      }
    },
    async assignHubEpisodeSlotAsset(episodeKey, slotId, input) {
      return readJson<HubEpisodeSlotView>(
        `/api/hub/episodes/${encodeURIComponent(episodeKey)}/slots/${slotId}/assets`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input)
        }
      );
    },
    async removeHubEpisodeSlotAsset(episodeKey, slotId, assetId) {
      return readJson<HubEpisodeSlotView>(
        `/api/hub/episodes/${encodeURIComponent(episodeKey)}/slots/${slotId}/assets/${assetId}`,
        {
          method: "DELETE"
        }
      );
    },
    async updateHubEpisode(episodeKey, input) {
      return readJson<HubEpisodeView>(`/api/hub/episodes/${encodeURIComponent(episodeKey)}`, {
        method: "PUT",
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
        throw new ApiError(response.status, `Logout failed with status ${response.status}.`);
      }
    },
    async promoteUserToAdmin(email) {
      return readJson<AuthUserView>(`/api/auth/admin/users/${encodeURIComponent(email)}/promote`, {
        method: "POST"
      });
    },
    async updateUserDisplayName(email, displayName) {
      return readJson<AuthUserView>(
        `/api/auth/admin/users/${encodeURIComponent(email)}/display-name`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName })
        }
      );
    },
    async deactivateUser(email) {
      return readJson<AuthUserView>(`/api/auth/admin/users/${encodeURIComponent(email)}`, {
        method: "DELETE"
      });
    },
    async reactivateUser(email) {
      return readJson<AuthUserView>(
        `/api/auth/admin/users/${encodeURIComponent(email)}/reactivate`,
        { method: "POST" }
      );
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

export const dashboardApi = createDashboardApi();

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

function createAssetCatalogSearchParams(query: AssetCatalogQueryView): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (query.page !== undefined) {
    searchParams.set("page", String(query.page));
  }
  if (query.size !== undefined) {
    searchParams.set("size", String(query.size));
  }
  if (query.search) {
    searchParams.set("search", query.search);
  }
  if (query.assetType) {
    searchParams.set("assetType", query.assetType);
  }
  if (query.organizationId !== undefined) {
    searchParams.set("organizationId", String(query.organizationId));
  }
  if (query.creatorEmail) {
    searchParams.set("creatorEmail", query.creatorEmail);
  }
  if (query.imageArtStyle) {
    searchParams.set("imageArtStyle", query.imageArtStyle);
  }
  if (query.imageHasLayerFile !== undefined) {
    searchParams.set("imageHasLayerFile", String(query.imageHasLayerFile));
  }
  if (query.audioTtsVoice) {
    searchParams.set("audioTtsVoice", query.audioTtsVoice);
  }
  if (query.audioRecordingType) {
    searchParams.set("audioRecordingType", query.audioRecordingType);
  }
  if (query.videoStage) {
    searchParams.set("videoStage", query.videoStage);
  }
  if (query.documentKind) {
    searchParams.set("documentKind", query.documentKind);
  }

  return searchParams;
}

interface MultipartIntentResponse {
  assetId: number;
  uploadId: string;
  objectKey: string;
  partSize: number;
  parts: { partNumber: number; presignedUrl: string }[];
}

interface CompletedPart {
  partNumber: number;
  eTag: string;
}

const MULTIPART_CONCURRENCY = 4;

async function uploadAssetMultipart(
  readJson: <T>(input: RequestInfo, init?: RequestInit) => Promise<T>,
  input: AssetUploadInput,
  options?: AssetUploadOptions
): Promise<AssetSummaryView> {
  options?.onProgress?.({
    phase: "PREPARING",
    totalBytes: input.file.size,
    uploadedBytes: 0
  });

  const intentResponse = await readJson<MultipartIntentResponse>(
    "/api/assets/upload-multipart-intent",
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
        typeMetadata: input.typeMetadata,
      }),
    }
  );

  options?.onProgress?.({
    phase: "UPLOADING",
    totalBytes: input.file.size,
    uploadedBytes: 0
  });

  const completedParts = await uploadPartsWithConcurrency(
    input.file,
    intentResponse.parts,
    intentResponse.partSize,
    MULTIPART_CONCURRENCY,
    options?.onProgress
      ? (uploadedBytes: number) => {
          options.onProgress!({
            phase: "UPLOADING",
            totalBytes: input.file.size,
            uploadedBytes: Math.min(uploadedBytes, input.file.size)
          });
        }
      : undefined
  );

  options?.onProgress?.({
    phase: "FINALIZING",
    totalBytes: input.file.size,
    uploadedBytes: input.file.size
  });

  return readJson<AssetSummaryView>(
    `/api/assets/${intentResponse.assetId}/complete-multipart`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: intentResponse.uploadId,
        objectKey: intentResponse.objectKey,
        fileSizeBytes: input.file.size,
        widthPx: input.widthPx ?? null,
        heightPx: input.heightPx ?? null,
        parts: completedParts,
      }),
    }
  );
}

async function uploadPartsWithConcurrency(
  file: File,
  parts: { partNumber: number; presignedUrl: string }[],
  partSize: number,
  concurrency: number,
  onBytesUploaded?: (totalUploadedBytes: number) => void
): Promise<CompletedPart[]> {
  const completedParts: CompletedPart[] = [];
  const partUploadedBytes = new Map<number, number>();
  let lastEmitTimestamp = 0;

  function emitProgress(): void {
    if (!onBytesUploaded) return;
    const now = Date.now();
    if (now - lastEmitTimestamp < 120) return;
    lastEmitTimestamp = now;

    let total = 0;
    for (const bytes of partUploadedBytes.values()) {
      total += bytes;
    }
    onBytesUploaded(total);
  }

  let index = 0;

  async function worker(): Promise<void> {
    while (index < parts.length) {
      const currentIndex = index++;
      const part = parts[currentIndex];
      const start = currentIndex * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      partUploadedBytes.set(part.partNumber, 0);

      const eTag = await uploadPartToPresignedUrl(
        part.presignedUrl,
        blob,
        (loaded: number) => {
          partUploadedBytes.set(part.partNumber, loaded);
          emitProgress();
        }
      );

      partUploadedBytes.set(part.partNumber, end - start);
      emitProgress();

      completedParts.push({ partNumber: part.partNumber, eTag });
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, parts.length) },
    () => worker()
  );
  await Promise.all(workers);

  if (onBytesUploaded) {
    onBytesUploaded(file.size);
  }

  return completedParts.sort((a, b) => a.partNumber - b.partNumber);
}

function uploadPartToPresignedUrl(
  url: string,
  blob: Blob,
  onProgress?: (loaded: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      onProgress?.(event.loaded);
    });

    xhr.open("PUT", url);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const eTag = xhr.getResponseHeader("ETag");
        if (!eTag) {
          reject(new ApiError(500, "S3 응답에서 ETag 헤더를 찾을 수 없습니다."));
          return;
        }
        resolve(eTag.replace(/"/g, ""));
        return;
      }

      reject(new ApiError(xhr.status || 500));
    };

    xhr.onerror = () =>
      reject(new ApiError(xhr.status || 500, "파트 업로드 중 네트워크 오류가 발생했습니다."));
    xhr.onabort = () => reject(new ApiError(499, "파트 업로드가 중단되었습니다."));

    xhr.send(blob);
  });
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
    let latestUploadedBytes = 0;

    function emitUploadingProgress(uploadedBytes: number, force = false): void {
      const normalizedUploadedBytes =
        totalBytes !== null ? Math.max(0, Math.min(uploadedBytes, totalBytes)) : Math.max(0, uploadedBytes);
      latestUploadedBytes = normalizedUploadedBytes;
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

    xhr.upload.addEventListener("load", () => {
      emitUploadingProgress(totalBytes ?? latestUploadedBytes, true);
    });

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        emitUploadingProgress(totalBytes ?? latestUploadedBytes, true);
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
