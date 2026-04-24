import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { dashboardApi } from "../../api/client";
import type {
  AssetSummaryView,
  AssetTagOptionCatalogView,
  CharacterTagOptionView,
  ProjectDetailView,
  ProjectOrganizationOptionView,
  ProjectUpdateInputView
} from "../../api/types";
import type {
  AssetFileUploadDraftView,
  AssetLinkDraftView
} from "../asset-library/asset-library-page-model";
import {
  assetTagDraftToInput,
  getAssetApiErrorMessage,
  runWithConcurrency
} from "../asset-library/asset-library-utils";
import { AssetUploadModal } from "../asset-library/asset-upload-modal";
import { AssetUploadToastPanel } from "../asset-library/asset-upload-toast-panel";
import { useAssetUploadTracker } from "../asset-library/use-asset-upload-tracker";
import { ProjectAssetPickerModal } from "./project-asset-picker-modal";
import { ProjectDetailPage } from "./project-detail-page";
import { ProjectFormModal } from "./project-form-modal";

interface ProjectDetailPageContainerProps {
  onDeleted: () => void;
  onOpenAssetPage: (assetId: number) => void;
  onProjectChanged: () => void;
  projectKey: string;
}

const ASSET_PICKER_DEBOUNCE_MS = 220;
const ASSET_PICKER_PAGE_SIZE = 24;
const COMPLETED_BATCH_DISMISS_DELAY_MS = 2600;

const emptyTagOptions: AssetTagOptionCatalogView = {
  keywords: [],
  locations: []
};

export function ProjectDetailPageContainer({
  onDeleted,
  onOpenAssetPage,
  onProjectChanged,
  projectKey
}: ProjectDetailPageContainerProps): React.JSX.Element {
  const isMountedRef = useRef(true);
  const [project, setProject] = useState<ProjectDetailView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAssetId, setBusyAssetId] = useState<number | null>(null);
  const [isTogglingCompletion, setIsTogglingCompletion] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [assetPickerAssets, setAssetPickerAssets] = useState<AssetSummaryView[]>([]);
  const [assetPickerSearchQuery, setAssetPickerSearchQuery] = useState("");
  const [isAssetPickerLoading, setIsAssetPickerLoading] = useState(false);
  const [assetPickerErrorMessage, setAssetPickerErrorMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploadingAssets, setIsUploadingAssets] = useState(false);
  const [characterOptions, setCharacterOptions] = useState<CharacterTagOptionView[]>([]);
  const [tagOptions, setTagOptions] = useState<AssetTagOptionCatalogView>(emptyTagOptions);
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

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editIsOngoing, setEditIsOngoing] = useState(false);
  const [editOrganizationId, setEditOrganizationId] = useState<number | null>(null);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [organizationOptions, setOrganizationOptions] = useState<ProjectOrganizationOptionView[]>([]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshProject = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await dashboardApi.getProject(projectKey);
      if (!isMountedRef.current) return;
      setProject(response);
    } catch {
      if (!isMountedRef.current) return;
      setProject(null);
      setErrorMessage("프로젝트 정보를 불러오지 못했습니다.");
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [projectKey]);

  useEffect(() => {
    void refreshProject();
  }, [refreshProject]);

  useEffect(() => {
    if (uploadBatch?.status !== "COMPLETED") {
      return;
    }
    const completedBatchId = uploadBatch.id;
    const timeoutId = window.setTimeout(() => {
      if (!isMountedRef.current) return;
      dismissUploadBatchIfMatches(completedBatchId);
    }, COMPLETED_BATCH_DISMISS_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [dismissUploadBatchIfMatches, uploadBatch]);

  const loadAssetPickerAssets = useCallback(
    async (searchQuery: string): Promise<void> => {
      setIsAssetPickerLoading(true);
      setAssetPickerErrorMessage(null);

      try {
        const result = await dashboardApi.listAssets({
          search: searchQuery || undefined,
          size: ASSET_PICKER_PAGE_SIZE
        });
        if (!isMountedRef.current) return;

        const linkedIds = new Set(project?.linkedAssets.map((asset) => asset.id) ?? []);
        setAssetPickerAssets(result.items.filter((asset) => !linkedIds.has(asset.id)));
      } catch {
        if (!isMountedRef.current) return;
        setAssetPickerAssets([]);
        setAssetPickerErrorMessage("기존 에셋 목록을 불러오지 못했습니다.");
      } finally {
        if (isMountedRef.current) {
          setIsAssetPickerLoading(false);
        }
      }
    },
    [project]
  );

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadAssetPickerAssets(assetPickerSearchQuery);
    }, ASSET_PICKER_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [assetPickerSearchQuery, isPickerOpen, loadAssetPickerAssets]);

  async function ensureOrganizationOptions(): Promise<void> {
    if (organizationOptions.length > 0) {
      return;
    }
    try {
      const options = await dashboardApi.listProjectOrganizations();
      if (!isMountedRef.current) return;
      setOrganizationOptions(options);
      if (options.length === 0) {
        setEditErrorMessage("등록된 담당 팀이 없습니다. 관리자에게 조직 설정을 요청하세요.");
      }
    } catch {
      if (!isMountedRef.current) return;
      setEditErrorMessage("담당 팀 정보를 불러오지 못했습니다.");
    }
  }

  function handleOpenAssetPicker(): void {
    setAssetPickerAssets([]);
    setAssetPickerSearchQuery("");
    setAssetPickerErrorMessage(null);
    setIsPickerOpen(true);
    void loadAssetPickerAssets("");
  }

  function handleCloseAssetPicker(): void {
    setIsPickerOpen(false);
    setAssetPickerAssets([]);
    setAssetPickerSearchQuery("");
  }

  async function ensureUploadSupportingData(): Promise<boolean> {
    if (characterOptions.length > 0) {
      return true;
    }
    try {
      const [nextCharacterOptions, nextTagOptions] = await Promise.all([
        dashboardApi.listCharacterTagOptions(),
        dashboardApi.listAssetTagOptions()
      ]);
      if (!isMountedRef.current) return false;
      setCharacterOptions(nextCharacterOptions);
      setTagOptions(nextTagOptions);
      return true;
    } catch (error: unknown) {
      if (!isMountedRef.current) return false;
      setErrorMessage(
        getAssetApiErrorMessage(error, {
          fallback: "업로드 모달 정보를 불러오지 못했습니다."
        })
      );
      return false;
    }
  }

  async function handleOpenUploadModal(): Promise<void> {
    const ready = await ensureUploadSupportingData();
    if (!ready) return;
    setErrorMessage(null);
    setIsUploadModalOpen(true);
  }

  function handleCloseUploadModal(): void {
    setIsUploadModalOpen(false);
  }

  async function finalizeUploadBatch(
    uploadBatchId: string,
    taskCount: number,
    results: PromiseSettledResult<unknown>[],
    kind: "FILE" | "LINK"
  ): Promise<void> {
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failureCount = taskCount - successCount;
    const nextErrorMessage =
      failureCount > 0
        ? kind === "FILE"
          ? `${failureCount}개 에셋 업로드에 실패했습니다. 진행 패널에서 실패 항목을 확인하세요.`
          : `${failureCount}개 링크 연결에 실패했습니다. 진행 패널을 확인하세요.`
        : null;

    if (!isMountedRef.current) return;

    setErrorMessage(nextErrorMessage);
    setIsUploadingAssets(false);
    setIsUploadModalOpen(false);
    markBatchStatus(uploadBatchId, failureCount > 0 ? "FAILED" : "COMPLETED");

    if (successCount > 0) {
      await refreshProject();
      onProjectChanged();
    }
  }

  async function handleUploadAssets(drafts: AssetFileUploadDraftView[]): Promise<void> {
    if (drafts.length === 0) return;

    const uploadBatchId = crypto.randomUUID();
    startFileBatch(uploadBatchId, drafts);
    setErrorMessage(null);
    setIsUploadingAssets(true);

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
        await dashboardApi.linkProjectAsset(projectKey, { assetId: uploadedAsset.id });
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
              fallback: "에셋 업로드에 실패했습니다."
            })
          );
        }
        throw error;
      }
    });

    await finalizeUploadBatch(uploadBatchId, drafts.length, results, "FILE");
  }

  async function handleRegisterAssetLinks(drafts: AssetLinkDraftView[]): Promise<void> {
    if (drafts.length === 0) return;

    const uploadBatchId = crypto.randomUUID();
    startLinkBatch(uploadBatchId, drafts);
    setErrorMessage(null);
    setIsUploadingAssets(true);

    try {
      markAllTasks(uploadBatchId, { status: "FINALIZING" });

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
          dashboardApi.linkProjectAsset(projectKey, { assetId: asset.id })
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
              fallback: "프로젝트 링크 연결에 실패했습니다."
            })
          );
        });
      }

      await finalizeUploadBatch(uploadBatchId, drafts.length, assignmentResults, "LINK");
    } catch (error: unknown) {
      if (!isMountedRef.current) return;
      const message = getAssetApiErrorMessage(error, {
        badRequest: "링크 정보가 올바르지 않습니다.",
        fallback: "링크 등록에 실패했습니다."
      });
      markAllTasks(uploadBatchId, { errorMessage: message, status: "FAILED" });
      markBatchStatus(uploadBatchId, "FAILED");
      setErrorMessage(message);
      setIsUploadingAssets(false);
    }
  }

  async function handleConfirmAssetSelection(assetIds: number[]): Promise<void> {
    if (assetIds.length === 0) {
      return;
    }

    setIsLinking(true);
    try {
      let latestDetail: ProjectDetailView | null = null;
      for (const assetId of assetIds) {
        latestDetail = await dashboardApi.linkProjectAsset(projectKey, { assetId });
      }
      if (!isMountedRef.current) return;
      if (latestDetail) {
        setProject(latestDetail);
      }
      setIsPickerOpen(false);
      setAssetPickerAssets([]);
      setAssetPickerSearchQuery("");
      onProjectChanged();
    } catch {
      if (!isMountedRef.current) return;
      setAssetPickerErrorMessage("에셋 연결에 실패했습니다.");
    } finally {
      if (isMountedRef.current) {
        setIsLinking(false);
      }
    }
  }

  async function handleRemoveLinkedAsset(assetId: number): Promise<void> {
    setBusyAssetId(assetId);
    try {
      const updatedDetail = await dashboardApi.unlinkProjectAsset(projectKey, assetId);
      if (!isMountedRef.current) return;
      setProject(updatedDetail);
      onProjectChanged();
    } catch {
      if (!isMountedRef.current) return;
      setErrorMessage("에셋 연결 해제에 실패했습니다.");
    } finally {
      if (isMountedRef.current) {
        setBusyAssetId(null);
      }
    }
  }

  async function handleDeleteProject(): Promise<void> {
    setIsDeletingProject(true);
    setErrorMessage(null);
    try {
      await dashboardApi.deleteProject(projectKey);
      if (!isMountedRef.current) return;
      onProjectChanged();
      onDeleted();
    } catch {
      if (!isMountedRef.current) return;
      setErrorMessage("프로젝트 삭제에 실패했습니다.");
      setIsDeletingProject(false);
    }
  }

  async function handleToggleCompletion(): Promise<void> {
    if (project === null) {
      return;
    }

    setIsTogglingCompletion(true);
    setErrorMessage(null);
    try {
      const input: ProjectUpdateInputView = {
        name: project.name,
        description: project.description,
        organizationId: project.organizationId,
        deadline: project.deadline,
        completed: project.status !== "COMPLETED"
      };
      const updatedDetail = await dashboardApi.updateProject(projectKey, input);
      if (!isMountedRef.current) return;
      setProject(updatedDetail);
      onProjectChanged();
    } catch {
      if (!isMountedRef.current) return;
      setErrorMessage("프로젝트 상태 변경에 실패했습니다.");
    } finally {
      if (isMountedRef.current) {
        setIsTogglingCompletion(false);
      }
    }
  }

  function handleOpenEditor(): void {
    if (project === null) {
      return;
    }
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditDeadline(project.deadline ?? "");
    setEditIsOngoing(project.deadline === null);
    setEditOrganizationId(project.organizationId);
    setEditErrorMessage(null);
    setIsEditOpen(true);
    void ensureOrganizationOptions();
  }

  function handleCloseEditor(): void {
    if (isSavingEdit) return;
    setIsEditOpen(false);
    setEditErrorMessage(null);
  }

  async function handleSubmitEdit(): Promise<void> {
    if (project === null) {
      return;
    }
    if (editOrganizationId === null) {
      setEditErrorMessage("담당 팀을 선택해주세요.");
      return;
    }

    setIsSavingEdit(true);
    setEditErrorMessage(null);
    try {
      const input: ProjectUpdateInputView = {
        name: editName,
        description: editDescription.trim() ? editDescription : null,
        organizationId: editOrganizationId,
        deadline: editIsOngoing ? null : editDeadline ? editDeadline : null,
        completed: project.status === "COMPLETED"
      };
      const updatedDetail = await dashboardApi.updateProject(projectKey, input);
      if (!isMountedRef.current) return;
      setProject(updatedDetail);
      setIsEditOpen(false);
      onProjectChanged();
    } catch {
      if (!isMountedRef.current) return;
      setEditErrorMessage("프로젝트 정보 저장에 실패했습니다.");
    } finally {
      if (isMountedRef.current) {
        setIsSavingEdit(false);
      }
    }
  }

  return (
    <>
      <ProjectDetailPage
        busyAssetId={busyAssetId}
        errorMessage={errorMessage}
        isDeletingProject={isDeletingProject}
        isLoading={isLoading}
        isTogglingCompletion={isTogglingCompletion}
        isUploadingAssets={isUploadingAssets}
        onDeleteProject={handleDeleteProject}
        onOpenAssetPage={onOpenAssetPage}
        onOpenAssetPicker={handleOpenAssetPicker}
        onOpenProjectEditor={handleOpenEditor}
        onOpenUploadModal={() => void handleOpenUploadModal()}
        onRemoveLinkedAsset={(assetId) => handleRemoveLinkedAsset(assetId)}
        onToggleCompletion={handleToggleCompletion}
        project={project}
      />

      <ProjectAssetPickerModal
        assets={assetPickerAssets}
        errorMessage={assetPickerErrorMessage}
        isLinking={isLinking}
        isLoading={isAssetPickerLoading}
        isOpen={isPickerOpen}
        linkedAssetIds={project?.linkedAssets.map((asset) => asset.id) ?? []}
        onClose={handleCloseAssetPicker}
        onConfirmSelection={handleConfirmAssetSelection}
        onSearchQueryChange={setAssetPickerSearchQuery}
        projectName={project?.name ?? null}
        searchQuery={assetPickerSearchQuery}
      />

      <AssetUploadModal
        characterOptions={characterOptions}
        isOpen={isUploadModalOpen}
        isUploading={isUploadingAssets}
        onClose={handleCloseUploadModal}
        onRegisterAssetLinks={handleRegisterAssetLinks}
        onUploadAssets={handleUploadAssets}
        tagOptions={tagOptions}
      />

      <AssetUploadToastPanel batch={uploadBatch} onDismiss={dismissUploadBatch} />

      <ProjectFormModal
        deadline={editDeadline}
        description={editDescription}
        errorMessage={editErrorMessage}
        isOngoing={editIsOngoing}
        isOpen={isEditOpen}
        isSaving={isSavingEdit}
        mode="EDIT"
        name={editName}
        onClose={handleCloseEditor}
        onDeadlineChange={setEditDeadline}
        onDescriptionChange={setEditDescription}
        onNameChange={setEditName}
        onOngoingChange={setEditIsOngoing}
        onOrganizationChange={setEditOrganizationId}
        onSubmit={() => void handleSubmitEdit()}
        organizationId={editOrganizationId}
        organizationOptions={organizationOptions}
      />
    </>
  );
}
