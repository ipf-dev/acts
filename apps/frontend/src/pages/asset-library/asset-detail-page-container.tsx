import { useEffect, useMemo, useState } from "react";
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
import { AssetDetailPage } from "./asset-detail-page";

interface AssetDetailPageState {
  asset: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  session: AuthSessionView;
}

interface AssetDetailPageContainerProps {
  assetId: number;
  onBack: () => void;
  onOpenRelatedAsset: (assetId: number) => void;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function AssetDetailPageContainer({
  assetId,
  onBack,
  onOpenRelatedAsset
}: AssetDetailPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetDetailPageState>({
    asset: null,
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    isLoading: true,
    isSaving: false,
    session: createAnonymousSession()
  });

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: null,
        authSuccessMessage: null,
        isLoading: true
      }));

      try {
        const session = await dashboardApi.getSession();
        const [asset, assets] = session.authenticated
          ? await Promise.all([dashboardApi.getAsset(assetId), dashboardApi.listAssets()])
          : [null, []];

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          asset,
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
          asset: null,
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
  }, [assetId]);

  async function handleSave(input: AssetUpdateInput): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSaving: true
    }));

    try {
      const [asset, assets] = await Promise.all([
        dashboardApi.updateAsset(assetId, input),
        dashboardApi.listAssets()
      ]);

      setState((currentState) => ({
        ...currentState,
        asset,
        assets,
        authSuccessMessage: "애셋 정보가 업데이트되었습니다.",
        isSaving: false
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: error instanceof Error ? error.message : "Unknown error.",
        isSaving: false
      }));
    }
  }

  const relatedAssets = useMemo(() => {
    const currentAsset = state.asset;

    if (!currentAsset) {
      return [];
    }

    return state.assets
      .filter((asset) => asset.id !== currentAsset.id)
      .map((asset) => ({
        asset,
        score:
          asset.tags.filter((tag) => currentAsset.tags.includes(tag)).length +
          (asset.organizationName === currentAsset.organizationName ? 1 : 0)
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ asset }) => asset);
  }, [state.asset, state.assets]);

  return (
    <AssetDetailPage
      asset={state.asset}
      authErrorMessage={state.authErrorMessage}
      authSuccessMessage={state.authSuccessMessage}
      isLoading={state.isLoading}
      isSaving={state.isSaving}
      onBack={onBack}
      onOpenRelatedAsset={onOpenRelatedAsset}
      onSave={handleSave}
      relatedAssets={relatedAssets}
      session={state.session}
    />
  );
}
