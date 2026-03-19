import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
import type { AssetDetailView, AssetSummaryView, AuthSessionView } from "../../dashboard-types";
import { getAssetApiErrorMessage, triggerFileDownload } from "./asset-library-utils";
import { AssetLibraryPage } from "./asset-library-page";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetLibraryPageState {
  assetDetail: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isAssetDetailLoading: boolean;
  isDeleting: boolean;
  isDownloading: boolean;
  isExporting: boolean;
  isLoading: boolean;
  isUploading: boolean;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

interface AssetLibraryPageContainerProps {
  onOpenAssetPage: (assetId: number) => void;
  onSearchQueryChange: (value: string) => void;
  searchQuery: string;
}

export function AssetLibraryPageContainer({
  onOpenAssetPage,
  onSearchQueryChange,
  searchQuery
}: AssetLibraryPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetLibraryPageState>({
    assetDetail: null,
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    isAssetDetailLoading: false,
    isDeleting: false,
    isDownloading: false,
    isExporting: false,
    isLoading: true,
    isUploading: false,
    session: createAnonymousSession()
  });

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      try {
        const session = await dashboardApi.getSession();
        const assets = session.authenticated ? await dashboardApi.listAssets() : [];

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          assets,
          authErrorMessage: getLoginFailureMessage(initialLocationSearch),
          authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
          isLoading: false,
          session
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

  async function handleUploadAssets(drafts: AssetUploadDraftView[]): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isUploading: true
    }));

    try {
      for (const draft of drafts) {
        await dashboardApi.uploadAsset({
          description: draft.description,
          file: draft.file,
          tags: draft.tags,
          title: draft.title
        });
      }

      const [assets, session] = await Promise.all([dashboardApi.listAssets(), dashboardApi.getSession()]);

      setState((currentState) => ({
        ...currentState,
        assets,
        authSuccessMessage: `${drafts.length}개 애셋 업로드가 완료되었습니다.`,
        isUploading: false,
        session
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

  async function handleOpenAssetDetail(assetId: number): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      assetDetail: null,
      authErrorMessage: null,
      isAssetDetailLoading: true
    }));

    try {
      const assetDetail = await dashboardApi.getAsset(assetId);

      setState((currentState) => ({
        ...currentState,
        assetDetail,
        isAssetDetailLoading: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "현재 권한으로는 이 자산을 열 수 없습니다.",
          fallback: "자산 상세 정보를 불러오지 못했습니다.",
          notFound: "대상 자산을 찾을 수 없습니다."
        }),
        isAssetDetailLoading: false
      }));
    }
  }

  function handleCloseAssetDetail(): void {
    setState((currentState) => ({
      ...currentState,
      assetDetail: null,
      isAssetDetailLoading: false
    }));
  }

  async function handleDeleteAsset(assetId: number): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isDeleting: true
    }));

    try {
      await dashboardApi.deleteAsset(assetId);

      setState((currentState) => ({
        ...currentState,
        assetDetail: null,
        assets: currentState.assets.filter((asset) => asset.id !== assetId),
        authSuccessMessage: "애셋이 삭제되었습니다.",
        isAssetDetailLoading: false,
        isDeleting: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "삭제 권한이 없습니다.",
          fallback: "자산 삭제에 실패했습니다.",
          notFound: "삭제할 자산을 찾을 수 없습니다."
        }),
        isDeleting: false
      }));
    }
  }

  async function handleDownloadAsset(assetId: number): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isDownloading: true
    }));

    try {
      const file = await dashboardApi.downloadAsset(assetId);
      triggerFileDownload(file);

      setState((currentState) => ({
        ...currentState,
        isDownloading: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "현재 권한으로는 이 자산을 다운로드할 수 없습니다.",
          fallback: "자산 다운로드에 실패했습니다.",
          notFound: "다운로드할 자산을 찾을 수 없습니다."
        }),
        isDownloading: false
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
      assetDetail={state.assetDetail}
      assets={state.assets}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      isAssetDetailLoading={state.isAssetDetailLoading}
      isDeleting={state.isDeleting}
      isDownloading={state.isDownloading}
      isExporting={state.isExporting}
      isLoading={state.isLoading}
      isUploading={state.isUploading}
      onCloseAssetDetail={handleCloseAssetDetail}
      onDeleteAsset={handleDeleteAsset}
      onDownloadAsset={handleDownloadAsset}
      onExportAssets={handleExportAssets}
      onOpenAssetDetail={handleOpenAssetDetail}
      onOpenAssetPage={onOpenAssetPage}
      onSearchQueryChange={onSearchQueryChange}
      onUploadAssets={handleUploadAssets}
      searchQuery={searchQuery}
      session={state.session}
    />
  );
}
