import { useEffect, useState } from "react";
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
import type {
  AssetFileUploadDraftView,
  AssetLinkDraftView
} from "./asset-library-page-model";

interface AssetLibraryPageState {
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  characterOptions: CharacterTagOptionView[];
  tagOptions: AssetTagOptionCatalogView;
  isExporting: boolean;
  isLoading: boolean;
  isUploading: boolean;
  session: AuthSessionView;
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
    isLoading: true,
    isUploading: false,
    session: initialSession
  });

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

  async function handleUploadAssets(drafts: AssetFileUploadDraftView[]): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isUploading: true
    }));

    try {
      await runWithConcurrency(drafts, 3, (draft) =>
        dashboardApi.uploadAsset({
          description: draft.description,
          file: draft.file,
          tags: assetTagDraftToInput(draft),
          title: draft.title
        }).then(() => undefined)
      );

      const [assets, tagOptions] = await Promise.all([
        dashboardApi.listAssets(),
        dashboardApi.listAssetTagOptions().catch(() => null)
      ]);

      setState((currentState) => ({
        ...currentState,
        assets,
        authSuccessMessage: `${drafts.length}개 애셋 업로드가 완료되었습니다.`,
        tagOptions: tagOptions ?? currentState.tagOptions,
        isUploading: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          fallback: "자산 업로드에 실패했습니다."
        }),
        isUploading: false
      }));
    }
  }

  async function handleRegisterAssetLinks(drafts: AssetLinkDraftView[]): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isUploading: true
    }));

    try {
      await dashboardApi.registerAssetLinks({
        links: drafts.map((draft) => ({
          linkType: draft.linkType,
          tags: assetTagDraftToInput(draft),
          title: draft.title,
          url: draft.url
        }))
      });

      const [assets, tagOptions] = await Promise.all([
        dashboardApi.listAssets(),
        dashboardApi.listAssetTagOptions().catch(() => null)
      ]);

      setState((currentState) => ({
        ...currentState,
        assets,
        authSuccessMessage: `${drafts.length}개 링크 등록이 완료되었습니다.`,
        tagOptions: tagOptions ?? currentState.tagOptions,
        isUploading: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          badRequest: "링크 정보가 올바르지 않습니다.",
          fallback: "링크 등록에 실패했습니다."
        }),
        isUploading: false
      }));
    }
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

      setState((currentState) => ({
        ...currentState,
        authSuccessMessage: "내보내기 ZIP 다운로드가 시작되었습니다.",
        isExporting: false
      }));
    } catch (error: unknown) {
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
    />
  );
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await worker(items[currentIndex]);
      }
    })
  );
}
