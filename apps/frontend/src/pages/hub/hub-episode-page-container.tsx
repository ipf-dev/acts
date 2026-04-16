import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { dashboardApi } from "../../api/client";
import { HubEpisodeFormModal } from "./hub-episode-form-modal";
import { HubSlotFormModal } from "./hub-slot-form-modal";
import { formatEpisodeDisplayLabel } from "../../lib/utils";
import type {
  AssetTagOptionCatalogView,
  AssetSummaryView,
  CharacterTagOptionView,
  HubEpisodeSlotView,
  HubEpisodeView
} from "../../api/types";
import { AssetUploadModal } from "../asset-library/asset-upload-modal";
import { AssetUploadToastPanel } from "../asset-library/asset-upload-toast-panel";
import { assetTagDraftToInput, getAssetApiErrorMessage, runWithConcurrency } from "../asset-library/asset-library-utils";
import type { AssetFileUploadDraftView, AssetLinkDraftView } from "../asset-library/asset-library-page-model";
import { useAssetUploadTracker } from "../asset-library/use-asset-upload-tracker";
import { HubEpisodeAssetPickerModal } from "./hub-episode-asset-picker-modal";
import { HubEpisodePage } from "./hub-episode-page";

interface HubEpisodePageContainerProps {
  episodeKey: string;
  onDeleted: () => void;
  onHubStructureChanged: () => void;
  onOpenAssetPage: (assetId: number) => void;
}

interface HubEpisodePageState {
  activePickerSlotId: number | null;
  activeUploadSlotId: number | null;
  assetPickerAssets: AssetSummaryView[];
  assetPickerErrorMessage: string | null;
  assetPickerSearchQuery: string;
  busyAssetId: number | null;
  busySlotId: number | null;
  busySlotMode: "DELETE" | "LINK" | "REMOVE" | "UPLOAD" | null;
  characterOptions: CharacterTagOptionView[];
  errorMessage: string | null;
  episode: HubEpisodeView | null;
  isAssetPickerLoading: boolean;
  isDeletingEpisode: boolean;
  isLoading: boolean;
  isUploadModalOpen: boolean;
  isUploadingAssets: boolean;
  tagOptions: AssetTagOptionCatalogView;
}
const COMPLETED_BATCH_DISMISS_DELAY_MS = 2600;
const ASSET_PICKER_DEBOUNCE_MS = 220;
const ASSET_PICKER_PAGE_SIZE = 24;

const emptyTagOptions: AssetTagOptionCatalogView = {
  keywords: [],
  locations: []
};

export function HubEpisodePageContainer({
  episodeKey,
  onDeleted,
  onHubStructureChanged,
  onOpenAssetPage
}: HubEpisodePageContainerProps): React.JSX.Element {
  const isMountedRef = useRef(true);
  const [editEpisodeDescription, setEditEpisodeDescription] = useState("");
  const [editEpisodeErrorMessage, setEditEpisodeErrorMessage] = useState<string | null>(null);
  const [editEpisodeName, setEditEpisodeName] = useState("");
  const [createSlotErrorMessage, setCreateSlotErrorMessage] = useState<string | null>(null);
  const [createSlotName, setCreateSlotName] = useState("");
  const [isEditingEpisode, setIsEditingEpisode] = useState(false);
  const [isEpisodeEditorOpen, setIsEpisodeEditorOpen] = useState(false);
  const [isCreatingSlot, setIsCreatingSlot] = useState(false);
  const [isSlotCreatorOpen, setIsSlotCreatorOpen] = useState(false);
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
  const [state, setState] = useState<HubEpisodePageState>({
    activePickerSlotId: null,
    activeUploadSlotId: null,
    assetPickerAssets: [],
    assetPickerErrorMessage: null,
    assetPickerSearchQuery: "",
    busyAssetId: null,
    busySlotId: null,
    busySlotMode: null,
    characterOptions: [],
    errorMessage: null,
    episode: null,
    isAssetPickerLoading: false,
    isDeletingEpisode: false,
    isLoading: true,
    isUploadModalOpen: false,
    isUploadingAssets: false,
    tagOptions: emptyTagOptions
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshEpisode = useCallback(async (): Promise<void> => {
    setState((currentState) => ({
      ...currentState,
      errorMessage: null,
      isLoading: true
    }));

    try {
      const episode = await dashboardApi.getHubEpisode(episodeKey);

      setState((currentState) => ({
        ...currentState,
        episode,
        errorMessage: null,
        isLoading: false
      }));
    } catch {
      setState((currentState) => ({
        ...currentState,
        episode: null,
        errorMessage: "에피소드 정보를 불러오지 못했습니다.",
        isLoading: false
      }));
    }
  }, [episodeKey]);

  useEffect(() => {
    void refreshEpisode();
  }, [refreshEpisode]);

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
    }, COMPLETED_BATCH_DISMISS_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [dismissUploadBatchIfMatches, uploadBatch]);

  useEffect(() => {
    if (state.activePickerSlotId === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAssetPickerAssets(state.assetPickerSearchQuery);
    }, ASSET_PICKER_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [state.activePickerSlotId, state.assetPickerSearchQuery]);

  async function loadAssetPickerAssets(searchQuery: string): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      assetPickerErrorMessage: null,
      isAssetPickerLoading: true
    }));

    try {
      const result = await dashboardApi.listAssets({
        search: searchQuery || undefined,
        size: ASSET_PICKER_PAGE_SIZE
      });

      setState((currentState) => {
        const activeSlot = currentState.episode?.slots.find(
          (slot) => slot.slotId === currentState.activePickerSlotId
        );
        const linkedIds = new Set(activeSlot?.linkedAssets.map((a) => a.id) ?? []);

        return {
          ...currentState,
          assetPickerAssets: result.items.filter((asset) => !linkedIds.has(asset.id)),
          assetPickerErrorMessage: null,
          isAssetPickerLoading: false
        };
      });
    } catch {
      setState((currentState) => ({
        ...currentState,
        assetPickerAssets: [],
        assetPickerErrorMessage: "기존 에셋 목록을 불러오지 못했습니다.",
        isAssetPickerLoading: false
      }));
    }
  }

  async function ensureUploadSupportingData(): Promise<boolean> {
    if (state.characterOptions.length > 0) {
      return true;
    }

    try {
      const [characterOptions, tagOptions] = await Promise.all([
        dashboardApi.listCharacterTagOptions(),
        dashboardApi.listAssetTagOptions()
      ]);

      if (!isMountedRef.current) {
        return false;
      }

      setState((currentState) => ({
        ...currentState,
        characterOptions,
        tagOptions
      }));
      return true;
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return false;
      }

      setState((currentState) => ({
        ...currentState,
        errorMessage: getAssetApiErrorMessage(error, {
          fallback: "업로드 모달 정보를 불러오지 못했습니다."
        })
      }));
      return false;
    }
  }

  function applySlotUpdate(updatedSlot: HubEpisodeSlotView): void {
    setState((currentState) => ({
      ...currentState,
      busyAssetId: null,
      busySlotId: null,
      busySlotMode: null,
      episode:
        currentState.episode === null
          ? null
          : {
              ...currentState.episode,
              slots: currentState.episode.slots.map((slot) =>
                slot.slotId === updatedSlot.slotId ? updatedSlot : slot
              )
            }
    }));
  }

  function handleOpenSlotCreator(): void {
    setCreateSlotName("");
    setCreateSlotErrorMessage(null);
    setIsSlotCreatorOpen(true);
  }

  function handleCloseSlotCreator(): void {
    if (isCreatingSlot) {
      return;
    }

    setCreateSlotName("");
    setCreateSlotErrorMessage(null);
    setIsSlotCreatorOpen(false);
  }

  async function handleConfirmAssetSelection(assetIds: number[]): Promise<void> {
    if (state.activePickerSlotId === null || assetIds.length === 0) {
      return;
    }

    const slotId = state.activePickerSlotId;

    setState((currentState) => ({
      ...currentState,
      busySlotId: slotId,
      busySlotMode: "LINK"
    }));

    try {
      let latestSlot: HubEpisodeSlotView | null = null;
      for (const assetId of assetIds) {
        latestSlot = await dashboardApi.assignHubEpisodeSlotAsset(episodeKey, slotId, { assetId });
      }

      setState((currentState) => ({
        ...currentState,
        activePickerSlotId: null,
        assetPickerSearchQuery: "",
        assetPickerAssets: []
      }));
      if (latestSlot) {
        applySlotUpdate(latestSlot);
      }
    } catch {
      setState((currentState) => ({
        ...currentState,
        busySlotId: null,
        busySlotMode: null,
        assetPickerErrorMessage: "에셋 연결에 실패했습니다."
      }));
    }
  }

  async function handleOpenUploadModal(slotId: number): Promise<void> {
    const isReady = await ensureUploadSupportingData();
    if (!isReady) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeUploadSlotId: slotId,
      errorMessage: null,
      isUploadModalOpen: true
    }));
  }

  async function handleRemoveLinkedAsset(slotId: number, assetId: number): Promise<void> {
    setState((currentState) => ({
      ...currentState,
      busyAssetId: assetId,
      busySlotId: slotId,
      busySlotMode: "REMOVE"
    }));

    try {
      const updatedSlot = await dashboardApi.removeHubEpisodeSlotAsset(episodeKey, slotId, assetId);
      applySlotUpdate(updatedSlot);
    } catch {
      setState((currentState) => ({
        ...currentState,
        busyAssetId: null,
        busySlotId: null,
        busySlotMode: null,
        errorMessage: "슬롯 에셋 연결 해제에 실패했습니다."
      }));
    }
  }

  async function handleCreateSlot(): Promise<void> {
    if (state.episode === null) {
      return;
    }

    setIsCreatingSlot(true);
    setCreateSlotErrorMessage(null);

    try {
      const createdSlot = await dashboardApi.createHubEpisodeSlot(state.episode.episodeKey, {
        name: createSlotName
      });
      setState((currentState) => ({
        ...currentState,
        episode:
          currentState.episode === null
            ? null
            : {
                ...currentState.episode,
                slots: [...currentState.episode.slots, createdSlot]
              }
      }));
      setCreateSlotName("");
      setCreateSlotErrorMessage(null);
      setIsSlotCreatorOpen(false);
    } catch {
      setCreateSlotErrorMessage("슬롯 생성에 실패했습니다.");
    } finally {
      setIsCreatingSlot(false);
    }
  }

  async function handleDeleteSlot(slotId: number): Promise<void> {
    if (state.episode === null) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      busySlotId: slotId,
      busySlotMode: "DELETE",
      errorMessage: null
    }));

    try {
      await dashboardApi.deleteHubEpisodeSlot(state.episode.episodeKey, slotId);
      setState((currentState) => ({
        ...currentState,
        busySlotId: null,
        busySlotMode: null,
        episode:
          currentState.episode === null
            ? null
            : {
                ...currentState.episode,
                slots: currentState.episode.slots.filter((slot) => slot.slotId !== slotId)
              }
      }));
    } catch {
      setState((currentState) => ({
        ...currentState,
        busySlotId: null,
        busySlotMode: null,
        errorMessage: "슬롯 삭제에 실패했습니다."
      }));
    }
  }

  async function handleUploadAssets(drafts: AssetFileUploadDraftView[]): Promise<void> {
    const slotId = state.activeUploadSlotId;
    if (drafts.length === 0 || slotId === null) {
      return;
    }

    const uploadBatchId = crypto.randomUUID();
    startFileBatch(uploadBatchId, drafts);
    beginUploadFlow();

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
        await dashboardApi.assignHubEpisodeSlotAsset(episodeKey, slotId, {
          assetId: uploadedAsset.id
        });

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
              fallback: "슬롯 업로드에 실패했습니다."
            })
          );
        }

        throw error;
      }
    });

    await finalizeUploadBatch(uploadBatchId, drafts.length, results, "FILE");
  }

  async function handleRegisterAssetLinks(drafts: AssetLinkDraftView[]): Promise<void> {
    const slotId = state.activeUploadSlotId;
    if (drafts.length === 0 || slotId === null) {
      return;
    }

    const uploadBatchId = crypto.randomUUID();
    startLinkBatch(uploadBatchId, drafts);
    beginUploadFlow();

    try {
      markAllTasks(uploadBatchId, {
        status: "FINALIZING"
      });

      const linkedAssets = await dashboardApi.registerAssetLinks({
        links: drafts.map((draft) => ({
          linkType: draft.linkType,
          tags: assetTagDraftToInput(draft),
          title: draft.title,
          url: draft.url
        }))
      });

      const assignmentResults = await Promise.allSettled(
        linkedAssets.map((asset) =>
          dashboardApi.assignHubEpisodeSlotAsset(episodeKey, slotId, {
            assetId: asset.id
          })
        )
      );

      if (isMountedRef.current) {
        assignmentResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            markTaskCompleted(uploadBatchId, drafts[index].id);
            return;
          }

          markTaskFailed(
            uploadBatchId,
            drafts[index].id,
            getAssetApiErrorMessage(result.reason, {
              fallback: "슬롯 링크 연결에 실패했습니다."
            })
          );
        });
      }

      await finalizeUploadBatch(uploadBatchId, drafts.length, assignmentResults, "LINK");
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
        errorMessage,
        isUploadingAssets: false
      }));
    }
  }

  async function finalizeUploadBatch(
    uploadBatchId: string,
    taskCount: number,
    results: PromiseSettledResult<unknown>[],
    kind: "FILE" | "LINK"
  ): Promise<void> {
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = taskCount - successCount;
    const errorMessage =
      failureCount > 0
        ? kind === "FILE"
          ? `${failureCount}개 슬롯 업로드에 실패했습니다. 진행 패널에서 실패 항목을 확인하세요.`
          : `${failureCount}개 링크 연결에 실패했습니다. 진행 패널을 확인하세요.`
        : null;

    if (!isMountedRef.current) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      activeUploadSlotId: null,
      errorMessage,
      isUploadingAssets: false
    }));
    markBatchStatus(uploadBatchId, failureCount > 0 ? "FAILED" : "COMPLETED");

    if (successCount > 0) {
      await refreshEpisode();
    }
  }

  function beginUploadFlow(): void {
    setState((currentState) => ({
      ...currentState,
      errorMessage: null,
      isUploadingAssets: true
    }));
  }

  async function handleDeleteEpisode(): Promise<void> {
    if (state.episode === null) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      errorMessage: null,
      isDeletingEpisode: true
    }));

    try {
      await dashboardApi.deleteHubEpisode(state.episode.episodeKey);
      onHubStructureChanged();
      onDeleted();
    } catch {
      setState((currentState) => ({
        ...currentState,
        errorMessage: "에피소드 삭제에 실패했습니다.",
        isDeletingEpisode: false
      }));
    }
  }

  function handleOpenEpisodeEditor(): void {
    if (state.episode === null) {
      return;
    }

    setEditEpisodeName(state.episode.episodeTitle);
    setEditEpisodeDescription(state.episode.episodeDescription ?? "");
    setEditEpisodeErrorMessage(null);
    setIsEpisodeEditorOpen(true);
  }

  function handleCloseEpisodeEditor(): void {
    if (isEditingEpisode) {
      return;
    }

    setIsEpisodeEditorOpen(false);
    setEditEpisodeErrorMessage(null);
  }

  async function handleUpdateEpisode(): Promise<void> {
    if (state.episode === null) {
      return;
    }

    setIsEditingEpisode(true);
    setEditEpisodeErrorMessage(null);

    try {
      const updatedEpisode = await dashboardApi.updateHubEpisode(state.episode.episodeKey, {
        name: editEpisodeName,
        description: editEpisodeDescription
      });
      setState((currentState) => ({
        ...currentState,
        episode: updatedEpisode
      }));
      setIsEpisodeEditorOpen(false);
      onHubStructureChanged();
    } catch {
      setEditEpisodeErrorMessage("에피소드 정보 저장에 실패했습니다.");
    } finally {
      setIsEditingEpisode(false);
    }
  }

  function handleOpenAssetPicker(slotId: number): void {
    setState((currentState) => ({
      ...currentState,
      activePickerSlotId: slotId,
      assetPickerAssets: [],
      assetPickerErrorMessage: null,
      assetPickerSearchQuery: ""
    }));
    void loadAssetPickerAssets("");
  }

  const activePickerSlot =
    state.activePickerSlotId === null
      ? null
      : state.episode?.slots.find((slot) => slot.slotId === state.activePickerSlotId) ?? null;

  return (
    <>
      <HubEpisodePage
        busyAssetId={state.busyAssetId}
        busySlotId={state.busySlotId}
        busySlotMode={state.busySlotMode}
        episode={state.episode}
        errorMessage={state.errorMessage}
        isCreatingSlot={isCreatingSlot}
        isDeletingEpisode={state.isDeletingEpisode}
        isLoading={state.isLoading}
        isUploadingAssets={state.isUploadingAssets}
        onDeleteEpisode={handleDeleteEpisode}
        onDeleteSlot={handleDeleteSlot}
        onOpenSlotCreator={handleOpenSlotCreator}
        onOpenEpisodeEditor={handleOpenEpisodeEditor}
        onRemoveLinkedAsset={handleRemoveLinkedAsset}
        onOpenAssetPage={onOpenAssetPage}
        onOpenAssetPicker={handleOpenAssetPicker}
        onOpenUploadModal={(slotId) => void handleOpenUploadModal(slotId)}
      />

      <HubEpisodeAssetPickerModal
        assets={state.assetPickerAssets}
        errorMessage={state.assetPickerErrorMessage}
        isLinking={state.busySlotMode === "LINK"}
        isLoading={state.isAssetPickerLoading}
        isOpen={state.activePickerSlotId !== null}
        linkedAssetIds={activePickerSlot?.linkedAssets.map((asset) => asset.id) ?? []}
        onClose={() =>
          setState((currentState) => ({
            ...currentState,
            activePickerSlotId: null,
            assetPickerAssets: [],
            assetPickerErrorMessage: null,
            assetPickerSearchQuery: ""
          }))
        }
        onConfirmSelection={handleConfirmAssetSelection}
        onSearchQueryChange={(value) =>
          setState((currentState) => ({
            ...currentState,
            assetPickerSearchQuery: value
          }))
        }
        searchQuery={state.assetPickerSearchQuery}
        slotName={activePickerSlot?.slotName ?? null}
      />

      <HubEpisodeFormModal
        description={editEpisodeDescription}
        errorMessage={editEpisodeErrorMessage}
        episodeNumber=""
        isOpen={isEpisodeEditorOpen}
        isSaving={isEditingEpisode}
        mode="EDIT"
        name={editEpisodeName}
        onClose={handleCloseEpisodeEditor}
        onDescriptionChange={setEditEpisodeDescription}
        onEpisodeNumberChange={() => undefined}
        onNameChange={setEditEpisodeName}
        onSubmit={() => void handleUpdateEpisode()}
        scopeLabel={state.episode?.levelLabel ?? null}
      />

      <HubSlotFormModal
        errorMessage={createSlotErrorMessage}
        isOpen={isSlotCreatorOpen}
        isSaving={isCreatingSlot}
        name={createSlotName}
        onClose={handleCloseSlotCreator}
        onNameChange={setCreateSlotName}
        onSubmit={() => void handleCreateSlot()}
      />

      <AssetUploadModal
        characterOptions={state.characterOptions}
        isOpen={state.isUploadModalOpen}
        isUploading={state.isUploadingAssets}
        onClose={() =>
          setState((currentState) => ({
            ...currentState,
            isUploadModalOpen: false
          }))
        }
        onRegisterAssetLinks={handleRegisterAssetLinks}
        onUploadAssets={handleUploadAssets}
        tagOptions={state.tagOptions}
      />

      <AssetUploadToastPanel batch={uploadBatch} onDismiss={dismissUploadBatch} />
    </>
  );
}

