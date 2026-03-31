import { useEffect, useRef, useState } from "react";
import type React from "react";
import { createDashboardApi } from "../../api/client";
import {
  clearLoginRedirectState,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../api/auth";
import type {
  AssetCatalogFilterOptionsView,
  AssetCatalogPageView,
  AssetCatalogQueryView,
  AssetTagOptionCatalogView,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { assetTagDraftToInput, getAssetApiErrorMessage } from "./asset-library-utils";
import { AssetLibraryPage } from "./asset-library-page";
import { AssetUploadToastPanel } from "./asset-upload-toast-panel";
import type {
  AssetFileUploadDraftView,
  AssetLibraryTypeFilterView,
  AssetLinkDraftView,
  AssetTypeMetadataFilterStateView
} from "./asset-library-page-model";
import { createEmptyAssetTypeMetadataFilters } from "./asset-library-page-model";
import { useAssetUploadTracker } from "./use-asset-upload-tracker";

interface AssetLibraryPageState {
  assetCatalog: AssetCatalogPageView;
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  catalogFilterOptions: AssetCatalogFilterOptionsView;
  characterOptions: CharacterTagOptionView[];
  tagOptions: AssetTagOptionCatalogView;
  isUploading: boolean;
  isLoading: boolean;
  session: AuthSessionView;
}

interface AssetLibraryPageContainerProps {
  onOpenAssetPage: (assetId: number) => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;
const emptyTagOptions: AssetTagOptionCatalogView = {
  keywords: [],
  locations: []
};
const emptyCatalogFilterOptions: AssetCatalogFilterOptionsView = {
  organizations: [],
  creators: []
};
const emptyCatalogPage: AssetCatalogPageView = {
  items: [],
  page: 0,
  size: 24,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false
};

export function AssetLibraryPageContainer({
  onOpenAssetPage,
  onSearchQueryChange,
  searchQuery,
  session: initialSession
}: AssetLibraryPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetLibraryPageState>({
    assetCatalog: emptyCatalogPage,
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    catalogFilterOptions: emptyCatalogFilterOptions,
    characterOptions: [],
    tagOptions: emptyTagOptions,
    isUploading: false,
    isLoading: true,
    session: initialSession
  });
  const [catalogRefreshVersion, setCatalogRefreshVersion] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(24);
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<AssetLibraryTypeFilterView>("ALL");
  const [typeMetadataFilters, setTypeMetadataFilters] = useState<AssetTypeMetadataFilterStateView>(
    createEmptyAssetTypeMetadataFilters
  );
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const {
    applyFileProgress,
    dismissUploadBatch,
    dismissUploadBatchIfMatches,
    markAllTasks,
    markBatchStatus,
    markTaskCompleted,
    markTaskFailed,
    startFileBatch,
    startLinkBatch,
    uploadBatch
  } = useAssetUploadTracker();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    clearLoginRedirectState();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 320);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    async function loadSupportingData(): Promise<void> {
      if (!initialSession.authenticated) {
        setState((currentState) => ({
          ...currentState,
          assetCatalog: emptyCatalogPage,
          catalogFilterOptions: emptyCatalogFilterOptions,
          characterOptions: [],
          tagOptions: emptyTagOptions,
          isLoading: false,
          session: initialSession
        }));
        return;
      }

      try {
        const [characterOptions, tagOptions, catalogFilterOptions] = await Promise.all([
          dashboardApi.listCharacterTagOptions(),
          dashboardApi.listAssetTagOptions().catch(() => emptyTagOptions),
          dashboardApi.listAssetCatalogFilterOptions().catch(() => emptyCatalogFilterOptions)
        ]);

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          catalogFilterOptions,
          characterOptions,
          tagOptions,
          session: initialSession
        }));
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          authErrorMessage: getAssetApiErrorMessage(error, {
            fallback: "자산 라이브러리 보조 정보를 불러오지 못했습니다."
          }),
          authSuccessMessage: null,
          isLoading: false,
          session: initialSession
        }));
      }
    }

    void loadSupportingData();

    return () => {
      isActive = false;
    };
  }, [initialSession]);

  useEffect(() => {
    let isActive = true;

    async function loadCatalog(): Promise<void> {
      if (!initialSession.authenticated) {
        setState((currentState) => ({
          ...currentState,
          assetCatalog: emptyCatalogPage,
          isLoading: false,
          session: initialSession
        }));
        return;
      }

      setState((currentState) => ({
        ...currentState,
        isLoading: true,
        session: initialSession
      }));

      try {
        const assetCatalog = await dashboardApi.listAssets(
          buildAssetCatalogQuery({
            creatorFilter,
            organizationFilter,
            page,
            pageSize,
            searchQuery: debouncedSearchQuery,
            typeFilter,
            typeMetadataFilters
          })
        );

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          assetCatalog,
          authErrorMessage: null,
          isLoading: false,
          session: initialSession
        }));
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          authErrorMessage: getAssetApiErrorMessage(error, {
            denied: "현재 권한으로는 자산 라이브러리에 접근할 수 없습니다.",
            fallback: "자산 목록을 불러오지 못했습니다."
          }),
          authSuccessMessage: null,
          isLoading: false,
          session: initialSession
        }));
      }
    }

    void loadCatalog();

    return () => {
      isActive = false;
    };
  }, [
    catalogRefreshVersion,
    creatorFilter,
    debouncedSearchQuery,
    initialSession,
    organizationFilter,
    page,
    pageSize,
    typeFilter,
    typeMetadataFilters
  ]);

  useEffect(() => {
    if (uploadBatch?.status !== "COMPLETED") {
      return;
    }

    const completedBatchId = uploadBatch.id;
    const timeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) {
        return;
      }

      dismissUploadBatchIfMatches(completedBatchId);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [dismissUploadBatchIfMatches, uploadBatch]);

  async function handleUploadAssets(drafts: AssetFileUploadDraftView[]): Promise<void> {
    if (drafts.length === 0) {
      return;
    }

    const uploadBatchId = crypto.randomUUID();
    startFileBatch(uploadBatchId, drafts);
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isUploading: true
    }));

    const results = await runWithConcurrency(drafts, 3, async (draft) => {
      try {
        const uploadedAsset = await dashboardApi.uploadAsset(
          {
            description: draft.description,
            file: draft.file,
            tags: assetTagDraftToInput(draft),
            typeMetadata: draft.typeMetadata,
            title: draft.title
          },
          {
            onProgress: (progress) => applyFileProgress(uploadBatchId, draft.id, progress)
          }
        );

        if (isMountedRef.current) {
          markTaskCompleted(uploadBatchId, draft.id);
        }
        return uploadedAsset;
      } catch (error: unknown) {
        if (isMountedRef.current) {
          markTaskFailed(
            uploadBatchId,
            draft.id,
            getAssetApiErrorMessage(error, {
              fallback: "파일 업로드에 실패했습니다."
            })
          );
        }

        throw error;
      }
    });

    await finalizeUploadBatch(uploadBatchId, drafts.length, results, "FILE");
  }

  async function handleRegisterAssetLinks(drafts: AssetLinkDraftView[]): Promise<void> {
    if (drafts.length === 0) {
      return;
    }

    const uploadBatchId = crypto.randomUUID();
    startLinkBatch(uploadBatchId, drafts);
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isUploading: true
    }));

    try {
      markAllTasks(uploadBatchId, {
        status: "FINALIZING"
      });

      await dashboardApi.registerAssetLinks({
        links: drafts.map((draft) => ({
          linkType: draft.linkType,
          tags: assetTagDraftToInput(draft),
          title: draft.title,
          url: draft.url
        }))
      });

      if (!isMountedRef.current) {
        return;
      }

      markAllTasks(uploadBatchId, {
        errorMessage: null,
        status: "COMPLETED"
      });
      await finalizeUploadBatch(
        uploadBatchId,
        drafts.length,
        createSuccessfulResults(drafts.length),
        "LINK"
      );
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }

      const errorMessage = getAssetApiErrorMessage(error, {
        badRequest: "링크 정보가 올바르지 않습니다.",
        fallback: "링크 등록에 실패했습니다."
      });

      markAllTasks(uploadBatchId, {
        errorMessage,
        status: "FAILED"
      });
      markBatchStatus(uploadBatchId, "FAILED");
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: errorMessage,
        isUploading: false
      }));
    }
  }

  async function refreshSupportingData(): Promise<void> {
    const [tagOptionsResult, catalogFilterOptionsResult] = await Promise.allSettled([
      dashboardApi.listAssetTagOptions(),
      dashboardApi.listAssetCatalogFilterOptions()
    ]);

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      catalogFilterOptions:
        catalogFilterOptionsResult.status === "fulfilled"
          ? catalogFilterOptionsResult.value
          : currentState.catalogFilterOptions,
      tagOptions: tagOptionsResult.status === "fulfilled" ? tagOptionsResult.value : currentState.tagOptions
    }));
  }

  async function finalizeUploadBatch(
    uploadBatchId: string,
    taskCount: number,
    results: PromiseSettledResult<unknown>[],
    kind: "FILE" | "LINK"
  ): Promise<void> {
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = taskCount - successCount;
    const partialFailureMessage =
      failureCount > 0
        ? kind === "FILE"
          ? `${failureCount}개 파일 업로드에 실패했습니다. 진행 패널에서 실패 항목을 확인하세요.`
          : `${failureCount}개 링크 등록에 실패했습니다. 진행 패널을 확인하세요.`
        : null;
    const successMessage =
      failureCount === 0
        ? kind === "FILE"
          ? `${successCount}개 애셋 업로드가 완료되었습니다.`
          : `${successCount}개 링크 등록이 완료되었습니다.`
        : successCount > 0
          ? kind === "FILE"
            ? `${successCount}개 애셋 업로드가 완료되었습니다.`
            : `${successCount}개 링크 등록이 완료되었습니다.`
          : null;

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      authErrorMessage: partialFailureMessage,
      authSuccessMessage: successMessage,
      isUploading: false
    }));
    markBatchStatus(uploadBatchId, failureCount > 0 ? "FAILED" : "COMPLETED");

    if (successCount > 0) {
      resetFilters();
      setCatalogRefreshVersion((currentVersion) => currentVersion + 1);
      void refreshSupportingData();

      window.setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        dismissUploadBatchIfMatches(uploadBatchId);
      }, 2600);
    }
  }

  function handleDismissUploadBatch(): void {
    dismissUploadBatch();
  }

  function handleSearchQueryChange(nextValue: string): void {
    onSearchQueryChange(nextValue);
    setPage(0);
  }

  function handleTypeFilterChange(nextValue: AssetLibraryTypeFilterView): void {
    setTypeFilter(nextValue);
    setTypeMetadataFilters(createEmptyAssetTypeMetadataFilters());
    setPage(0);
  }

  function handleTypeMetadataFiltersChange(nextFilters: AssetTypeMetadataFilterStateView): void {
    setTypeMetadataFilters(nextFilters);
    setPage(0);
  }

  function handleOrganizationFilterChange(nextValue: string): void {
    setOrganizationFilter(nextValue);
    setPage(0);
  }

  function handleCreatorFilterChange(nextValue: string): void {
    setCreatorFilter(nextValue);
    setPage(0);
  }

  function handlePageChange(nextPage: number): void {
    setPage(Math.max(0, nextPage));
  }

  function handlePageSizeChange(nextSize: number): void {
    setPageSize(nextSize);
    setPage(0);
  }

  function resetFilters(): void {
    onSearchQueryChange("");
    setCreatorFilter("ALL");
    setOrganizationFilter("ALL");
    setPage(0);
    setTypeFilter("ALL");
    setTypeMetadataFilters(createEmptyAssetTypeMetadataFilters());
  }

  return (
    <>
      <AssetLibraryPage
        authErrorMessage={state.authErrorMessage}
        authSuccessMessage={state.authSuccessMessage}
        catalogFilterOptions={state.catalogFilterOptions}
        catalogPage={state.assetCatalog}
        characterOptions={state.characterOptions}
        creatorFilter={creatorFilter}
        tagOptions={state.tagOptions}
        isLoading={state.isLoading}
        isUploading={state.isUploading}
        onCreatorFilterChange={handleCreatorFilterChange}
        onOpenAssetPage={onOpenAssetPage}
        onOrganizationFilterChange={handleOrganizationFilterChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRegisterAssetLinks={handleRegisterAssetLinks}
        onResetFilters={resetFilters}
        onSearchQueryChange={handleSearchQueryChange}
        onTypeFilterChange={handleTypeFilterChange}
        onTypeMetadataFiltersChange={handleTypeMetadataFiltersChange}
        onUploadAssets={handleUploadAssets}
        organizationFilter={organizationFilter}
        searchQuery={searchQuery}
        session={state.session}
        typeFilter={typeFilter}
        typeMetadataFilters={typeMetadataFilters}
      />
      <AssetUploadToastPanel batch={uploadBatch} onDismiss={handleDismissUploadBatch} />
    </>
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<unknown>
): Promise<PromiseSettledResult<unknown>[]> {
  if (items.length === 0) {
    return [];
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const results: PromiseSettledResult<unknown>[] = Array.from({ length: items.length });

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        try {
          const value = await worker(items[currentIndex]);
          results[currentIndex] = {
            status: "fulfilled",
            value
          };
        } catch (error: unknown) {
          results[currentIndex] = {
            reason: error,
            status: "rejected"
          };
        }
      }
    })
  );

  return results;
}

function createSuccessfulResults(count: number): PromiseSettledResult<void>[] {
  return Array.from({ length: count }, () => ({
    status: "fulfilled",
    value: undefined
  }));
}

function buildAssetCatalogQuery({
  creatorFilter,
  organizationFilter,
  page,
  pageSize,
  searchQuery,
  typeFilter,
  typeMetadataFilters
}: {
  creatorFilter: string;
  organizationFilter: string;
  page: number;
  pageSize: number;
  searchQuery: string;
  typeFilter: AssetLibraryTypeFilterView;
  typeMetadataFilters: AssetTypeMetadataFilterStateView;
}): AssetCatalogQueryView {
  const query: AssetCatalogQueryView = {
    page,
    size: pageSize
  };

  const normalizedSearchQuery = searchQuery.trim();
  if (normalizedSearchQuery.length > 0) {
    query.search = normalizedSearchQuery;
  }

  if (typeFilter !== "ALL") {
    query.assetType = typeFilter;
  }
  if (organizationFilter !== "ALL") {
    query.organizationId = Number(organizationFilter);
  }
  if (creatorFilter !== "ALL") {
    query.creatorEmail = creatorFilter;
  }

  switch (typeFilter) {
    case "IMAGE":
      if (typeMetadataFilters.imageArtStyle !== "ALL") {
        query.imageArtStyle = typeMetadataFilters.imageArtStyle;
      }
      if (typeMetadataFilters.imageHasLayerFile === "INCLUDED") {
        query.imageHasLayerFile = true;
      }
      if (typeMetadataFilters.imageHasLayerFile === "NOT_INCLUDED") {
        query.imageHasLayerFile = false;
      }
      break;
    case "AUDIO":
      if (typeMetadataFilters.audioTtsVoice.trim().length > 0) {
        query.audioTtsVoice = typeMetadataFilters.audioTtsVoice.trim();
      }
      if (typeMetadataFilters.audioRecordingType !== "ALL") {
        query.audioRecordingType = typeMetadataFilters.audioRecordingType;
      }
      break;
    case "VIDEO":
      if (typeMetadataFilters.videoStage !== "ALL") {
        query.videoStage = typeMetadataFilters.videoStage;
      }
      break;
    case "DOCUMENT":
      if (typeMetadataFilters.documentKind !== "ALL") {
        query.documentKind = typeMetadataFilters.documentKind;
      }
      break;
    default:
      break;
  }

  return query;
}
