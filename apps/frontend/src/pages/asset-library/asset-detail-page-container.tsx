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
  AuthSessionView,
  OrganizationOptionView
} from "../../dashboard-types";
import { getAssetApiErrorMessage, triggerFileDownload } from "./asset-library-utils";
import { AssetDetailPage } from "./asset-detail-page";

interface AssetDetailPageState {
  asset: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isDeleting: boolean;
  isDownloading: boolean;
  isLoading: boolean;
  isSaving: boolean;
  organizations: OrganizationOptionView[];
  session: AuthSessionView;
}

interface AssetDetailPageContainerProps {
  assetId: number;
  onBack: () => void;
  onDeleted: () => void;
  onOpenRelatedAsset: (assetId: number) => void;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function AssetDetailPageContainer({
  assetId,
  onBack,
  onDeleted,
  onOpenRelatedAsset
}: AssetDetailPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetDetailPageState>({
    asset: null,
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    isDeleting: false,
    isDownloading: false,
    isLoading: true,
    isSaving: false,
    organizations: [],
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
        const [asset, assets, organizations] = session.authenticated
          ? await Promise.all([
              dashboardApi.getAsset(assetId),
              dashboardApi.listAssets(),
              dashboardApi.listOrganizations()
            ])
          : [null, [], []];

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
          organizations,
          session
        }));
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          asset: null,
          authErrorMessage: getAssetApiErrorMessage(error, {
            denied: "현재 권한으로는 이 자산에 접근할 수 없습니다.",
            fallback: "자산 상세 정보를 불러오지 못했습니다.",
            notFound: "대상 자산을 찾을 수 없습니다."
          }),
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
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "이 자산을 수정할 권한이 없습니다.",
          fallback: "자산 정보 저장에 실패했습니다.",
          notFound: "저장할 자산을 찾을 수 없습니다."
        }),
        isSaving: false
      }));
    }
  }

  async function handleDelete(): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isDeleting: true
    }));

    try {
      await dashboardApi.deleteAsset(assetId)
      onDeleted()
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "삭제 권한이 없습니다.",
          fallback: "자산 삭제에 실패했습니다.",
          notFound: "삭제할 자산을 찾을 수 없습니다."
        }),
        isDeleting: false
      }))
    }
  }

  async function handleDownload(): Promise<void> {
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
      isDeleting={state.isDeleting}
      isDownloading={state.isDownloading}
      isLoading={state.isLoading}
      isSaving={state.isSaving}
      onBack={onBack}
      onDelete={handleDelete}
      onDownload={handleDownload}
      onOpenRelatedAsset={onOpenRelatedAsset}
      onSave={handleSave}
      organizations={state.organizations}
      relatedAssets={relatedAssets}
      session={state.session}
    />
  );
}
