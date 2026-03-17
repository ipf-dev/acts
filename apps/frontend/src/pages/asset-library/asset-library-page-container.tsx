import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
import type {
  AssetDetailView,
  AssetSummaryView,
  AssetUpdateInput,
  AuthSessionView
} from "../../dashboard-types";
import { AssetLibraryPage } from "./asset-library-page";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetLibraryPageState {
  assetDetail: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isAssetDetailLoading: boolean;
  isLoading: boolean;
  isSavingAssetDetail: boolean;
  isUploading: boolean;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function AssetLibraryPageContainer(): React.JSX.Element {
  const [state, setState] = useState<AssetLibraryPageState>({
    assetDetail: null,
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    isAssetDetailLoading: false,
    isLoading: true,
    isSavingAssetDetail: false,
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
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isUploading: false
      }));
    }
  }

  async function handleSaveAssetDetail(
    assetId: number,
    input: AssetUpdateInput
  ): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSavingAssetDetail: true
    }));

    try {
      const [assetDetail, assets] = await Promise.all([
        dashboardApi.updateAsset(assetId, input),
        dashboardApi.listAssets()
      ]);

      setState((currentState) => ({
        ...currentState,
        assetDetail,
        assets,
        authSuccessMessage: "애셋 정보가 업데이트되었습니다.",
        isSavingAssetDetail: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSavingAssetDetail: false
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
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
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

  return (
    <AssetLibraryPage
      assetDetail={state.assetDetail}
      assets={state.assets}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      isAssetDetailLoading={state.isAssetDetailLoading}
      isLoading={state.isLoading}
      isSavingAssetDetail={state.isSavingAssetDetail}
      isUploading={state.isUploading}
      onCloseAssetDetail={handleCloseAssetDetail}
      onOpenAssetDetail={handleOpenAssetDetail}
      onSaveAssetDetail={handleSaveAssetDetail}
      onUploadAssets={handleUploadAssets}
      session={state.session}
    />
  );
}
