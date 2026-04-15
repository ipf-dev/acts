import { useEffect, useRef, useState } from "react";
import type React from "react";
import { dashboardApi } from "../../api/client";
import {
  clearLoginRedirectState,
  getLoginFailureMessage
} from "../../api/auth";
import type {
  AssetDetailView,
  AssetFileAccessUrlView,
  AssetSummaryView,
  AssetUpdateInput,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { AssetDetailPage } from "./asset-detail-page";
import { flattenAssetTags, getAssetApiErrorMessage, triggerFileAccessUrlDownload } from "./asset-library-utils";

interface AssetDetailPageState {
  asset: AssetDetailView | null;
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
  relatedAssets: AssetSummaryView[];
  session: AuthSessionView;
}

interface LoadedAssetPageData {
  asset: AssetDetailView;
  characterOptions: CharacterTagOptionView[];
  relatedAssets: AssetSummaryView[];
}

interface AssetDetailPageContainerProps {
  assetId: number;
  onBack: () => void;
  onDeleted: () => void;
  onOpenRelatedAsset: (assetId: number) => void;
  session: AuthSessionView;
}

export function AssetDetailPageContainer({
  assetId,
  onBack,
  onDeleted,
  onOpenRelatedAsset,
  session: initialSession
}: AssetDetailPageContainerProps): React.JSX.Element {
  const [initialLocationSearch] = useState(() => window.location.search);
  const [state, setState] = useState<AssetDetailPageState>({
    asset: null,
    authErrorMessage: getLoginFailureMessage(initialLocationSearch),
    authSuccessMessage: null,
    characterOptions: [],
    isDeleting: false,
    isDownloading: false,
    isLoading: true,
    isLoadingPlayback: false,
    isSaving: false,
    playbackErrorMessage: null,
    playbackUrl: null,
    relatedAssets: [],
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
        playbackUrl: null,
        relatedAssets: []
      }));

      try {
        if (!initialSession.authenticated) {
          if (!isActive) {
            return;
          }

          setState((currentState) => ({
            ...currentState,
            asset: null,
            characterOptions: [],
            isLoading: false,
            relatedAssets: [],
            session: initialSession
          }));
          return;
        }

        const [asset, characterOptions] = await Promise.all([
          dashboardApi.getAsset(assetId),
          dashboardApi.listCharacterTagOptions()
        ]);
        const loadedPageData = await buildLoadedAssetPageData(asset, characterOptions);

        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          asset: loadedPageData.asset,
          authErrorMessage: getLoginFailureMessage(initialLocationSearch),
          authSuccessMessage: null,
          characterOptions: loadedPageData.characterOptions,
          isLoading: false,
          isLoadingPlayback: shouldLoadPlaybackUrl(loadedPageData.asset),
          playbackErrorMessage: null,
          playbackUrl: null,
          relatedAssets: loadedPageData.relatedAssets,
          session: initialSession
        }));

        if (shouldLoadPlaybackUrl(loadedPageData.asset)) {
          void loadPlaybackUrl(loadedPageData.asset.id);
        }
      } catch (error: unknown) {
        if (!isActive) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          asset: null,
          authErrorMessage: getAssetApiErrorMessage(error, {
            denied: "현재 권한으로는 이 에셋에 접근할 수 없습니다.",
            fallback: "에셋 상세 정보를 불러오지 못했습니다.",
            notFound: "대상 에셋을 찾을 수 없습니다."
          }),
          authSuccessMessage: null,
          isLoading: false,
          relatedAssets: []
        }));
      }
    }

    void loadPage();

    return () => {
      isActive = false;
    };
  }, [assetId, initialSession]);

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
      const [asset, characterOptions] = await Promise.all([
        dashboardApi.updateAsset(assetId, input),
        dashboardApi.listCharacterTagOptions()
      ]);
      const loadedPageData = await buildLoadedAssetPageData(asset, characterOptions);

      setState((currentState) => ({
        ...currentState,
        asset: loadedPageData.asset,
        authSuccessMessage: "에셋 정보가 업데이트되었습니다.",
        characterOptions: loadedPageData.characterOptions,
        isSaving: false,
        relatedAssets: loadedPageData.relatedAssets
      }));
    } catch (error: unknown) {
      setState((currentState) => ({
        ...currentState,
        authErrorMessage: getAssetApiErrorMessage(error, {
          denied: "이 에셋을 수정할 권한이 없습니다.",
          fallback: "에셋 정보 저장에 실패했습니다.",
          notFound: "저장할 에셋을 찾을 수 없습니다."
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
          fallback: "에셋 삭제에 실패했습니다.",
          notFound: "삭제할 에셋을 찾을 수 없습니다."
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
          denied: "현재 권한으로는 이 에셋을 다운로드할 수 없습니다.",
          fallback: "에셋 다운로드에 실패했습니다.",
          notFound: "다운로드할 에셋을 찾을 수 없습니다."
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
      relatedAssets={state.relatedAssets}
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

async function loadRelatedAssets(asset: AssetDetailView): Promise<AssetSummaryView[]> {
  const relatedCatalog = await dashboardApi.listAssets({
    page: 0,
    size: 48,
    organizationId: asset.organizationId ?? undefined
  });

  return buildRelatedAssets(asset, relatedCatalog.items);
}

async function buildLoadedAssetPageData(
  asset: AssetDetailView,
  characterOptions: CharacterTagOptionView[]
): Promise<LoadedAssetPageData> {
  return {
    asset,
    characterOptions,
    relatedAssets: await loadRelatedAssets(asset)
  };
}

function buildRelatedAssets(asset: AssetDetailView, candidates: AssetSummaryView[]): AssetSummaryView[] {
  const currentTags = flattenAssetTags(asset.tags);

  return candidates
    .filter((candidate) => candidate.id !== asset.id)
    .map((candidate) => ({
      asset: candidate,
      score:
        flattenAssetTags(candidate.tags).filter((tag) => currentTags.includes(tag)).length +
        (candidate.organizationName === asset.organizationName ? 1 : 0)
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ asset: relatedAsset }) => relatedAsset);
}

function shouldLoadPlaybackUrl(asset: AssetDetailView | null): boolean {
  return asset?.sourceKind === "FILE" && asset.type === "VIDEO";
}
