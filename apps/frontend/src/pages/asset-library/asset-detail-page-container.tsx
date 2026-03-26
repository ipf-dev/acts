import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { createDashboardApi } from "../../api/client";
import {
  clearLoginRedirectState,
  getLoginFailureMessage,
  getLoginSuccessMessage
} from "../../api/auth";
import type {
  AssetDetailView,
  AssetFileAccessUrlView,
  AssetSummaryView,
  AssetUpdateInput,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { flattenAssetTags, getAssetApiErrorMessage, triggerFileAccessUrlDownload } from "./asset-library-utils";
import { AssetDetailPage } from "./asset-detail-page";

interface AssetDetailPageState {
  asset: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  characterOptions: CharacterTagOptionView[];
  isDeleting: boolean;
  isDownloading: boolean;
  isLoading: boolean;
  isLoadingPlayback: boolean;
  isSaving: boolean;
  playbackErrorMessage: string | null;
  playbackUrl: string | null;
  session: AuthSessionView;
}

interface AssetDetailPageContainerProps {
  assetId: number;
  onBack: () => void;
  onDeleted: () => void;
  onOpenRelatedAsset: (assetId: number) => void;
  session: AuthSessionView;
}

const dashboardApi = createDashboardApi();
const initialLocationSearch = window.location.search;

export function AssetDetailPageContainer({
  assetId,
  onBack,
  onDeleted,
  onOpenRelatedAsset,
  session: initialSession
}: AssetDetailPageContainerProps): React.JSX.Element {
  const [state, setState] = useState<AssetDetailPageState>({
    asset: null,
    assets: [],
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: getLoginSuccessMessage(initialLocationSearch),
    characterOptions: [],
    isDeleting: false,
    isDownloading: false,
    isLoading: true,
    isLoadingPlayback: false,
    isSaving: false,
    playbackErrorMessage: null,
    playbackUrl: null,
    session: initialSession
  });
  const playbackRequestSequenceRef = useRef(0);

  useEffect(() => {
    let isActive = true;
    clearLoginRedirectState();

    async function loadPage(): Promise<void> {
      setState((currentState) => ({
          ...currentState,
          authErrorMessage: null,
          authSuccessMessage: null,
          isLoading: true,
          isLoadingPlayback: false,
          playbackErrorMessage: null,
          playbackUrl: null
        }));

      try {
        const [asset, assets, characterOptions] = initialSession.authenticated
          ? await Promise.all([
              dashboardApi.getAsset(assetId),
              dashboardApi.listAssets(),
              dashboardApi.listCharacterTagOptions()
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
          characterOptions,
          isLoading: false,
          isLoadingPlayback: shouldLoadPlaybackUrl(asset),
          playbackErrorMessage: null,
          playbackUrl: null,
          session: initialSession
        }));

        if (asset && shouldLoadPlaybackUrl(asset)) {
          void loadPlaybackUrl(asset.id);
        }
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

  async function loadPlaybackUrl(targetAssetId: number): Promise<void> {
    const requestSequence = playbackRequestSequenceRef.current + 1;
    playbackRequestSequenceRef.current = requestSequence;

    setState((currentState) =>
      currentState.asset?.id === targetAssetId
        ? {
            ...currentState,
            isLoadingPlayback: true,
            playbackErrorMessage: null
          }
        : currentState
    );

    try {
      const playbackAccess = await dashboardApi.getAssetFileAccessUrl(targetAssetId, "PLAYBACK");
      applyPlaybackUrlResult(targetAssetId, requestSequence, playbackAccess);
    } catch (error: unknown) {
      if (!isLatestPlaybackRequest(requestSequence)) {
        return;
      }

      setState((currentState) =>
        currentState.asset?.id === targetAssetId
          ? {
              ...currentState,
              isLoadingPlayback: false,
              playbackErrorMessage: getAssetApiErrorMessage(error, {
                denied: "현재 권한으로는 이 영상을 재생할 수 없습니다.",
                fallback: "영상 재생 URL을 불러오지 못했습니다.",
                notFound: "재생할 영상을 찾을 수 없습니다."
              }),
              playbackUrl: null
            }
          : currentState
      );
    }
  }

  async function handleSave(input: AssetUpdateInput): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isSaving: true
    }));

    try {
      const [asset, assets, characterOptions] = await Promise.all([
        dashboardApi.updateAsset(assetId, input),
        dashboardApi.listAssets(),
        dashboardApi.listCharacterTagOptions()
      ]);

      setState((currentState) => ({
        ...currentState,
        asset,
        assets,
        authSuccessMessage: "애셋 정보가 업데이트되었습니다.",
        characterOptions,
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
      await dashboardApi.deleteAsset(assetId);
      onDeleted();
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

  async function handleDownload(): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      authErrorMessage: null,
      authSuccessMessage: null,
      isDownloading: true
    }));

    try {
      const fileAccess = await dashboardApi.getAssetFileAccessUrl(assetId, "DOWNLOAD");
      triggerFileAccessUrlDownload(fileAccess.url);

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

  async function handleRefreshPlaybackUrl(): Promise<void> {
    if (!state.asset || !shouldLoadPlaybackUrl(state.asset)) {
      return;
    }

    await loadPlaybackUrl(state.asset.id);
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
          flattenAssetTags(asset.tags).filter((tag) => flattenAssetTags(currentAsset.tags).includes(tag)).length +
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
      characterOptions={state.characterOptions}
      isDeleting={state.isDeleting}
      isDownloading={state.isDownloading}
      isLoading={state.isLoading}
      isLoadingPlayback={state.isLoadingPlayback}
      isSaving={state.isSaving}
      onBack={onBack}
      onDelete={handleDelete}
      onDownload={handleDownload}
      onOpenRelatedAsset={onOpenRelatedAsset}
      onRefreshPlaybackUrl={handleRefreshPlaybackUrl}
      onSave={handleSave}
      playbackErrorMessage={state.playbackErrorMessage}
      playbackUrl={state.playbackUrl}
      relatedAssets={relatedAssets}
      session={state.session}
    />
  );

  function applyPlaybackUrlResult(
    targetAssetId: number,
    requestSequence: number,
    playbackAccess: AssetFileAccessUrlView
  ): void {
    if (!isLatestPlaybackRequest(requestSequence)) {
      return;
    }

    setState((currentState) =>
      currentState.asset?.id === targetAssetId
        ? {
            ...currentState,
            isLoadingPlayback: false,
            playbackErrorMessage: null,
            playbackUrl: playbackAccess.url
          }
        : currentState
    );
  }

  function isLatestPlaybackRequest(requestSequence: number): boolean {
    return requestSequence === playbackRequestSequenceRef.current;
  }
}

function shouldLoadPlaybackUrl(asset: AssetDetailView | null): boolean {
  return asset?.sourceKind === "FILE" && asset.type === "VIDEO";
}
