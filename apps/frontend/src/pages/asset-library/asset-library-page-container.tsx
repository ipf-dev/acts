import { useEffect, useState } from "react";
import { createDashboardApi } from "../../dashboard-api";
import {
  clearLoginRedirectState,
  createAnonymousSession,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../dashboard-auth";
import type { AssetSummaryView, AuthSessionView } from "../../dashboard-types";
import { AssetLibraryPage } from "./asset-library-page";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetLibraryPageState {
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isLoading: boolean;
  isUploading: boolean;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function AssetLibraryPageContainer(): React.JSX.Element {
  const [state, setState] = useState<AssetLibraryPageState>({
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
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

  return (
    <AssetLibraryPage
      assets={state.assets}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      isLoading={state.isLoading}
      isUploading={state.isUploading}
      onUploadAssets={handleUploadAssets}
      session={state.session}
    />
  );
}
