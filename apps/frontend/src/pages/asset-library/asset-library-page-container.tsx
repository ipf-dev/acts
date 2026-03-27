import { useEffect, useRef, useState } from "react";
import type React from "react";
import { createDashboardApi } from "../../api/client";
import {
  clearLoginRedirectState,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../api/auth";
import type {
  AssetTagOptionCatalogView,
  AssetSummaryView,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { assetTagDraftToInput, getAssetApiErrorMessage, triggerFileDownload } from "./asset-library-utils";
import { AssetLibraryPage } from "./asset-library-page";
import { AssetUploadToastPanel } from "./asset-upload-toast-panel";
import type {
  AssetFileUploadDraftView,
  AssetLinkDraftView
} from "./asset-library-page-model";
import { useAssetUploadTracker } from "./use-asset-upload-tracker";

interface AssetLibraryPageState {
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  characterOptions: CharacterTagOptionView[];
  tagOptions: AssetTagOptionCatalogView;
  isExporting: boolean;
  isUploading: boolean;
  isLoading: boolean;
  session: AuthSessionView;
  uploadCompletionVersion: number;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;
const emptyTagOptions: AssetTagOptionCatalogView = {
  keywords: [],
  locations: []
};

interface AssetLibraryPageContainerProps {
  onOpenAssetPage: (assetId: number) => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
  session: AuthSessionView;
}

export function AssetLibraryPageContainer({
  onOpenAssetPage,
  onSearchQueryChange,
  searchQuery,
  session: initialSession
}: AssetLibraryPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetLibraryPageState>({
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    characterOptions: [],
    tagOptions: emptyTagOptions,
    isExporting: false,
    isUploading: false,
    isLoading: true,
    session: initialSession,
    uploadCompletionVersion: 0
  });
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
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      try {
        const [assets, characterOptions, tagOptions] = initialSession.authenticated
          ? await Promise.all([
              dashboardApi.listAssets(),
              dashboardApi.listCharacterTagOptions(),
              dashboardApi.listAssetTagOptions().catch(() => emptyTagOptions)
            ])
          : [[], [], emptyTagOptions];

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          assets,
          authErrorMessage: getLoginFailureMessage(initialLocationSearch),
          authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
          characterOptions,
          tagOptions,
          isLoading: false,
          session: initialSession
        }));
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

    await finalizeUploadBatch(
      uploadBatchId,
      drafts.length,
      results,
      "FILE",
      extractFulfilledValues(results)
    );
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

      const registeredAssets = await dashboardApi.registerAssetLinks({
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
        "LINK",
        registeredAssets
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

  async function syncAssetLibraryCatalog(): Promise<void> {
    const [assetsResult, tagOptionsResult] = await Promise.allSettled([
      dashboardApi.listAssets(),
      dashboardApi.listAssetTagOptions()
    ]);

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      assets: assetsResult.status === "fulfilled" ? assetsResult.value : currentState.assets,
      tagOptions: tagOptionsResult.status === "fulfilled" ? tagOptionsResult.value : currentState.tagOptions
    }));
  }

  async function finalizeUploadBatch(
    uploadBatchId: string,
    taskCount: number,
    results: PromiseSettledResult<unknown>[],
    kind: "FILE" | "LINK",
    successfulAssets: AssetSummaryView[]
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
      assets: mergeAssetSummaries(currentState.assets, successfulAssets),
      authErrorMessage: partialFailureMessage,
      authSuccessMessage: successMessage,
      isUploading: false,
      uploadCompletionVersion:
        successCount > 0 ? currentState.uploadCompletionVersion + 1 : currentState.uploadCompletionVersion
    }));
    markBatchStatus(uploadBatchId, failureCount > 0 ? "FAILED" : "COMPLETED");

    if (successCount > 0) {
      window.setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }

        dismissUploadBatchIfMatches(uploadBatchId);
      }, 2600);
      void syncAssetLibraryCatalog();
    }
  }

  function handleDismissUploadBatch(): void {
    dismissUploadBatch();
  }

  async function handleExportAssets(): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isExporting: true
    }));

    try {
      const file = await dashboardApi.exportAssets();
      triggerFileDownload(file);

      if (!isMountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        authSuccessMessage: "내보내기 ZIP 다운로드가 시작되었습니다.",
        isExporting: false
      }));
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }

      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "전사 열람 권한이 있는 사용자만 전체 자산을 내보낼 수 있습니다.",
          fallback: "자산 내보내기에 실패했습니다."
        }),
        isExporting: false
      }));
    }
  }

  return (
    <>
      <AssetLibraryPage
        assets={state.assets}
        authErrorMessage={state.authErrorMessage}
        authSuccessMessage={state.authSuccessMessage}
        characterOptions={state.characterOptions}
        tagOptions={state.tagOptions}
        isExporting={state.isExporting}
        isLoading={state.isLoading}
        isUploading={state.isUploading}
        onExportAssets={handleExportAssets}
        onOpenAssetPage={onOpenAssetPage}
        onRegisterAssetLinks={handleRegisterAssetLinks}
        onSearchQueryChange={onSearchQueryChange}
        onUploadAssets={handleUploadAssets}
        searchQuery={searchQuery}
        session={state.session}
        uploadCompletionVersion={state.uploadCompletionVersion}
      />
      <AssetUploadToastPanel batch={uploadBatch} onDismiss={handleDismissUploadBatch} />
    </>
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<AssetSummaryView>
): Promise<PromiseSettledResult<AssetSummaryView>[]> {
  if (items.length === 0) {
    return [];
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const results: PromiseSettledResult<AssetSummaryView>[] = Array.from({ length: items.length });

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

function extractFulfilledValues<T>(results: PromiseSettledResult<T>[]): T[] {
  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

function mergeAssetSummaries(
  currentAssets: AssetSummaryView[],
  nextAssets: AssetSummaryView[]
): AssetSummaryView[] {
  if (nextAssets.length === 0) {
    return currentAssets;
  }

  const mergedAssets = new Map<number, AssetSummaryView>();
  currentAssets.forEach((asset) => {
    mergedAssets.set(asset.id, asset);
  });
  nextAssets.forEach((asset) => {
    mergedAssets.set(asset.id, asset);
  });

  return Array.from(mergedAssets.values()).sort((left, right) => {
    const createdAtCompare = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }
    return right.id - left.id;
  });
}
