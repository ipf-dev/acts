import { useEffect, useRef, useState } from "react";
import type React from "react";
import { ImageIcon, Link2, Plus, Upload, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import type { AssetTagOptionCatalogView, CharacterTagOptionView } from "../../api/types";
import { commitPendingTagInputs, normalizeTagValue, toggleCharacterTagId } from "./asset-library-utils";
import { formatFileSize, typeLabelMap } from "./asset-detail-model";
import type {
  AssetFileUploadDraftView,
  AssetLinkComposerView,
  AssetLinkDraftView,
  AssetTagDraftView
} from "./asset-library-page-model";
import { AssetTagEditor, type AssetTagCollectionKey, type AssetTagInputKey } from "./asset-tag-editor-section";
import { AssetTypeMetadataEditorSection } from "./asset-type-metadata-section";
import { createEmptyAssetTypeMetadataInput } from "./asset-type-metadata-model";

interface AssetUploadModalProps {
  characterOptions: CharacterTagOptionView[];
  isOpen: boolean;
  isUploading: boolean;
  onClose: () => void;
  onRegisterAssetLinks: (drafts: AssetLinkDraftView[]) => Promise<void>;
  tagOptions: AssetTagOptionCatalogView;
  onUploadAssets: (drafts: AssetFileUploadDraftView[]) => Promise<void>;
}

export function AssetUploadModal({
  characterOptions,
  isOpen,
  isUploading,
  onClose,
  onRegisterAssetLinks,
  tagOptions,
  onUploadAssets
}: AssetUploadModalProps): React.JSX.Element | null {
  const [fileDrafts, setFileDrafts] = useState<AssetFileUploadDraftView[]>([]);
  const [linkComposer, setLinkComposer] = useState<AssetLinkComposerView>(createEmptyLinkComposer());
  const [linkDrafts, setLinkDrafts] = useState<AssetLinkDraftView[]>([]);
  const [uploadMode, setUploadMode] = useState<"FILE" | "LINK">("FILE");
  const fileDraftsRef = useRef<AssetFileUploadDraftView[]>([]);

  useEffect(() => {
    fileDraftsRef.current = fileDrafts;
  }, [fileDrafts]);

  useEffect(() => {
    return () => {
      fileDraftsRef.current.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
    };
  }, []);

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    await handleFileDrop(nextFiles);
    event.target.value = "";
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>): Promise<void> {
    event.preventDefault();
    const nextFiles = Array.from(event.dataTransfer.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    await handleFileDrop(nextFiles);
  }

  async function handleFileDrop(files: File[]): Promise<void> {
    const nextDrafts = await Promise.all(files.map((file) => createDraftFromFile(file)));

    setFileDrafts((currentDrafts) => {
      const existingNames = new Set(currentDrafts.map((draft) => `${draft.file.name}:${draft.file.size}`));
      const uniqueDrafts = nextDrafts.filter((draft) => {
        const isDuplicate = existingNames.has(`${draft.file.name}:${draft.file.size}`);
        if (isDuplicate && draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
        return !isDuplicate;
      });
      return [...currentDrafts, ...uniqueDrafts];
    });
  }

  function handleRemoveDraft(draftId: string): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => {
        if (draft.id === draftId && draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
        return draft.id !== draftId;
      })
    );
  }

  function handleTitleChange(draftId: string, value: string): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, title: value } : draft))
    );
  }

  function handleDescriptionChange(draftId: string, value: string): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, description: value } : draft))
    );
  }

  function handleTypeMetadataChange(
    draftId: string,
    value: AssetFileUploadDraftView["typeMetadata"]
  ): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, typeMetadata: value } : draft))
    );
  }

  function handleDraftTagInputChange(
    draftId: string,
    key: AssetTagInputKey,
    value: string
  ): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, [key]: value } : draft))
    );
  }

  function handleToggleDraftCharacter(draftId: string, characterTagId: number): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId
          ? { ...draft, characterTagIds: toggleCharacterTagId(draft.characterTagIds, characterTagId) }
          : draft
      )
    );
  }

  function handleAddDraftTag(
    draftId: string,
    collectionKey: AssetTagCollectionKey,
    explicitValue?: string
  ): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId ? addDraftTagValue(draft, collectionKey, explicitValue) : draft
      )
    );
  }

  function handleRemoveDraftTag(
    draftId: string,
    collectionKey: AssetTagCollectionKey,
    value: string
  ): void {
    setFileDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId
          ? { ...draft, [collectionKey]: draft[collectionKey].filter((currentValue) => currentValue !== value) }
          : draft
      )
    );
  }

  function handleLinkComposerChange(
    key: "url" | "title" | "linkType",
    value: string
  ): void {
    setLinkComposer((currentComposer) => ({
      ...currentComposer,
      [key]: value
    }));
  }

  function handleLinkTagInputChange(
    key: AssetTagInputKey,
    value: string
  ): void {
    setLinkComposer((currentComposer) => ({
      ...currentComposer,
      [key]: value
    }));
  }

  function handleToggleLinkCharacter(characterTagId: number): void {
    setLinkComposer((currentComposer) => ({
      ...currentComposer,
      characterTagIds: toggleCharacterTagId(currentComposer.characterTagIds, characterTagId)
    }));
  }

  function handleAddLinkComposerTag(collectionKey: AssetTagCollectionKey, explicitValue?: string): void {
    setLinkComposer((currentComposer) => addDraftTagValue(currentComposer, collectionKey, explicitValue));
  }

  function handleRemoveLinkComposerTag(collectionKey: AssetTagCollectionKey, tag: string): void {
    setLinkComposer((currentComposer) => ({
      ...currentComposer,
      [collectionKey]: currentComposer[collectionKey].filter((currentValue) => currentValue !== tag)
    }));
  }

  function handleAddLinkDraft(): void {
    const resolvedComposer = commitPendingTagInputs(linkComposer);
    const normalizedUrl = normalizeUrlInput(resolvedComposer.url);
    if (!normalizedUrl) {
      return;
    }

    const host = extractLinkHost(normalizedUrl);
    const resolvedTitle = normalizeDisplayValue(resolvedComposer.title).trim() || host;
    const resolvedLinkType = normalizeDisplayValue(resolvedComposer.linkType).trim() || inferLinkType(normalizedUrl);

    setLinkDrafts((currentDrafts) => {
      if (currentDrafts.some((draft) => draft.url === normalizedUrl)) {
        return currentDrafts;
      }

      return [
        ...currentDrafts,
        {
          id: crypto.randomUUID(),
          characterTagIds: resolvedComposer.characterTagIds,
          keywordInput: "",
          keywords: resolvedComposer.keywords,
          linkType: resolvedLinkType,
          locationInput: "",
          locations: resolvedComposer.locations,
          title: resolvedTitle,
          url: normalizedUrl
        }
      ];
    });
    setLinkComposer(createEmptyLinkComposer());
  }

  function handleRemoveLinkDraft(draftId: string): void {
    setLinkDrafts((currentDrafts) => currentDrafts.filter((draft) => draft.id !== draftId));
  }

  function handleSubmit(): void {
    if (uploadMode === "FILE") {
      const resolvedDrafts = fileDrafts.map((draft) => commitPendingTagInputs(draft));
      setFileDrafts([]);
      onClose();
      void onUploadAssets(resolvedDrafts);
      resolvedDrafts.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
      return;
    }

    const resolvedLinkDrafts = [...linkDrafts];
    setLinkDrafts([]);
    setLinkComposer(createEmptyLinkComposer());
    onClose();
    void onRegisterAssetLinks(resolvedLinkDrafts);
  }

  const activeDraftCount = uploadMode === "FILE" ? fileDrafts.length : linkDrafts.length;
  const submitButtonLabel = isUploading
    ? "백그라운드 업로드 진행 중"
    : uploadMode === "FILE"
      ? `${activeDraftCount}개 업로드`
      : `${activeDraftCount}개 등록`;

  return (
    <Dialog onOpenChange={(open) => (!open ? onClose() : undefined)} open={isOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle className="text-xl tracking-tight">애셋 업로드</DialogTitle>
          <DialogDescription className="mt-1">
            파일 업로드는 기존 경로를 유지하고, 링크 등록은 S3 없이 라이브러리에 바로 반영됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5">
          <Tabs onValueChange={(value) => setUploadMode(value as "FILE" | "LINK")} value={uploadMode}>
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-muted/70 p-1">
              <TabsTrigger className="rounded-xl py-2.5" value="FILE">
                파일 업로드
              </TabsTrigger>
              <TabsTrigger className="rounded-xl py-2.5" value="LINK">
                링크 등록
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {uploadMode === "FILE" ? (
            <>
              <label
                className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-muted/20 px-8 py-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => void handleDrop(event)}
              >
                <input className="hidden" multiple onChange={(event) => void handleFileSelection(event)} type="file" />
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="mt-5 text-lg font-semibold">파일을 여기에 드래그하세요</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  이미지, 영상, 오디오, 문서, 시나리오 파일 지원
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium shadow-sm">
                  <Plus className="h-4 w-4" />
                  파일 선택
                </div>
              </label>

              {fileDrafts.map((draft) => (
                <div
                  className="rounded-[24px] border border-border bg-white p-4 shadow-[0_12px_40px_rgba(17,24,39,0.06)]"
                  key={draft.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-muted">
                        {draft.previewUrl ? (
                          <img
                            alt={draft.title}
                            className="h-full w-full object-cover"
                            src={draft.previewUrl}
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        <Input
                          onChange={(event) => handleTitleChange(draft.id, event.target.value)}
                          value={draft.title}
                        />
                        <Textarea
                          className="min-h-20 rounded-2xl bg-white"
                          onChange={(event) => handleDescriptionChange(draft.id, event.target.value)}
                          placeholder="애셋 설명을 입력하세요"
                          value={draft.description}
                        />

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{typeLabelMap[draft.type]}</Badge>
                          <span>파일 크기: {draft.sizeLabel}</span>
                          <span>파일 형식: {draft.formatLabel}</span>
                          {draft.suggestedWidth && draft.suggestedHeight ? (
                            <span>
                              예상 해상도: {draft.suggestedWidth}x{draft.suggestedHeight}
                            </span>
                          ) : null}
                        </div>

                        <AssetTagEditor
                          characterOptions={characterOptions}
                          onAddTag={(collectionKey, explicitValue) =>
                            handleAddDraftTag(draft.id, collectionKey, explicitValue)
                          }
                          onCharacterToggle={(characterTagId) => handleToggleDraftCharacter(draft.id, characterTagId)}
                          onRemoveTag={(collectionKey, tag) => handleRemoveDraftTag(draft.id, collectionKey, tag)}
                          onTagInputChange={(key, value) => handleDraftTagInputChange(draft.id, key, value)}
                          tagOptions={tagOptions}
                          value={draft}
                        />

                        <AssetTypeMetadataEditorSection
                          assetType={draft.type}
                          onChange={(value) => handleTypeMetadataChange(draft.id, value)}
                          value={draft.typeMetadata}
                        />
                      </div>
                    </div>

                    <button
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => handleRemoveDraft(draft.id)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="rounded-[24px] border border-border bg-white p-5 shadow-[0_12px_40px_rgba(17,24,39,0.06)]">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">URL</p>
                    <Input
                      onChange={(event) => handleLinkComposerChange("url", event.target.value)}
                      placeholder="https://drive.google.com/... 또는 https://www.youtube.com/..."
                      value={linkComposer.url}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">제목</p>
                    <Input
                      onChange={(event) => handleLinkComposerChange("title", event.target.value)}
                      placeholder="비워두면 URL 도메인명으로 자동 등록됩니다."
                      value={linkComposer.title}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">링크 유형</p>
                    <Input
                      onChange={(event) => handleLinkComposerChange("linkType", event.target.value)}
                      placeholder="Google Drive / YouTube / Notion / 기타"
                      value={linkComposer.linkType}
                    />
                  </div>

                  <AssetTagEditor
                    characterOptions={characterOptions}
                    onAddTag={handleAddLinkComposerTag}
                    onCharacterToggle={handleToggleLinkCharacter}
                    onRemoveTag={handleRemoveLinkComposerTag}
                    onTagInputChange={handleLinkTagInputChange}
                    tagOptions={tagOptions}
                    value={linkComposer}
                  />

                  <div className="flex justify-end">
                    <Button className="rounded-xl px-4" onClick={handleAddLinkDraft} type="button" variant="outline">
                      <Plus className="h-4 w-4" />
                      목록에 추가
                    </Button>
                  </div>
                </div>
              </div>

              {linkDrafts.length > 0 ? (
                <div className="space-y-3 rounded-[24px] border border-border bg-white p-4 shadow-[0_12px_40px_rgba(17,24,39,0.06)]">
                  <p className="text-sm font-medium text-foreground">추가된 링크 ({linkDrafts.length}개)</p>
                  {linkDrafts.map((draft) => (
                    <div
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/20 px-4 py-3"
                      key={draft.id}
                    >
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                            <Link2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{draft.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{draft.url}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{draft.linkType}</Badge>
                          {summarizeDraftTags(draft, characterOptions).map((tag) => (
                            <span className="rounded-full bg-background px-2 py-0.5 text-foreground/80" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => handleRemoveLinkDraft(draft.id)}
                        type="button"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {activeDraftCount > 0
              ? uploadMode === "FILE"
                ? `${activeDraftCount}개 파일이 업로드 대기 중입니다. 업로드를 누르면 모달이 닫히고 백그라운드에서 진행됩니다.`
                : `${activeDraftCount}개 링크가 등록 대기 중입니다. 등록을 누르면 모달이 닫히고 백그라운드에서 처리됩니다.`
              : uploadMode === "FILE"
                ? "업로드할 파일을 먼저 추가하세요."
                : "등록할 링크를 먼저 목록에 추가하세요."}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} type="button" variant="ghost">
              닫기
            </Button>
            <Button
              disabled={activeDraftCount === 0 || isUploading}
              onClick={handleSubmit}
              type="button"
            >
              {submitButtonLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function createDraftFromFile(file: File): Promise<AssetFileUploadDraftView> {
  const type = inferAssetType(file);
  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
  const dimensions = previewUrl ? await readImageSize(previewUrl) : null;
  const normalizedFileName = normalizeDisplayValue(file.name);

  return {
    characterTagIds: [],
    id: crypto.randomUUID(),
    file,
    formatLabel: file.type || file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
    keywordInput: "",
    keywords: createSuggestedKeywords(normalizedFileName, type),
    locationInput: "",
    locations: [],
    previewUrl,
    sizeLabel: formatFileSize(file.size),
    suggestedHeight: dimensions?.height ?? null,
    suggestedWidth: dimensions?.width ?? null,
    description: "",
    title: normalizeDisplayValue(normalizedFileName.replace(/\.[^/.]+$/, "")),
    type,
    typeMetadata: createInitialTypeMetadataInput(file, type)
  };
}

function createEmptyLinkComposer(): AssetLinkComposerView {
  return {
    characterTagIds: [],
    keywordInput: "",
    keywords: [],
    linkType: "",
    locationInput: "",
    locations: [],
    title: "",
    url: ""
  };
}

function createSuggestedKeywords(fileName: string, type: AssetFileUploadDraftView["type"]): string[] {
  const tokens = normalizeDisplayValue(fileName)
    .replace(/\.[^/.]+$/, "")
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 4);

  return Array.from(new Set([typeLabelMap[type], ...tokens]));
}

function inferAssetType(file: File): AssetFileUploadDraftView["type"] {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type.startsWith("image/")) {
    return "IMAGE";
  }
  if (file.type.startsWith("video/")) {
    return "VIDEO";
  }
  if (file.type.startsWith("audio/")) {
    return "AUDIO";
  }
  if (extension && ["txt", "md", "rtf"].includes(extension)) {
    return "DOCUMENT";
  }
  if (extension && ["pdf", "doc", "docx", "ppt", "pptx", "zip", "ai"].includes(extension)) {
    return "DOCUMENT";
  }
  return "OTHER";
}

function createInitialTypeMetadataInput(
  file: File,
  type: AssetFileUploadDraftView["type"]
): AssetFileUploadDraftView["typeMetadata"] {
  const baseMetadata = createEmptyAssetTypeMetadataInput(type);
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (type === "DOCUMENT" && extension && ["txt", "md", "rtf"].includes(extension)) {
    return {
      ...baseMetadata,
      documentKind: "SCENARIO"
    };
  }

  return baseMetadata;
}

function addDraftTagValue<T extends AssetLinkComposerView | AssetFileUploadDraftView>(
  draft: T,
  collectionKey: AssetTagCollectionKey,
  explicitValue?: string
): T {
  const inputKey = collectionKey === "locations" ? "locationInput" : "keywordInput";
  const normalizedTag = normalizeTagValue(explicitValue ?? draft[inputKey]);
  if (!normalizedTag) {
    return draft;
  }

  return {
    ...draft,
    [inputKey]: "",
    [collectionKey]: draft[collectionKey].includes(normalizedTag)
      ? draft[collectionKey]
      : [...draft[collectionKey], normalizedTag]
  };
}

function normalizeUrlInput(value: string): string | null {
  const normalizedValue = normalizeDisplayValue(value).trim();
  if (normalizedValue.length === 0) {
    return null;
  }

  return normalizedValue.includes("://") ? normalizedValue : `https://${normalizedValue}`;
}

function normalizeDisplayValue(value: string): string {
  return value.normalize("NFC");
}

function readImageSize(previewUrl: string): Promise<{ height: number; width: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth
      });
    };
    image.onerror = () => {
      resolve({
        height: 0,
        width: 0
      });
    };
    image.src = previewUrl;
  });
}

function extractLinkHost(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function inferLinkType(url: string): string {
  const host = extractLinkHost(url).toLowerCase();

  if (host.includes("drive.google.com") || host.includes("docs.google.com")) {
    return "Google Drive";
  }
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    return "YouTube";
  }
  if (host.includes("notion.so") || host.includes("notion.site")) {
    return "Notion";
  }

  return extractLinkHost(url);
}

function summarizeDraftTags(
  draft: AssetTagDraftView,
  characterOptions: CharacterTagOptionView[]
): string[] {
  const characterNames = characterOptions
    .filter((option) => draft.characterTagIds.includes(option.id))
    .map((option) => option.name);

  return [...characterNames, ...draft.locations, ...draft.keywords];
}
