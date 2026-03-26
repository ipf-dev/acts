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
import type { CharacterTagOptionView } from "../../api/types";
import { typeLabelMap } from "./asset-detail-model";
import type {
  AssetFileUploadDraftView,
  AssetLinkComposerView,
  AssetLinkDraftView,
  AssetTagDraftView
} from "./asset-library-page-model";
import { AssetTagEditor, type AssetTagCollectionKey, type AssetTagInputKey } from "./asset-tag-editor-section";

interface AssetUploadModalProps {
  characterOptions: CharacterTagOptionView[];
  fileDrafts: AssetFileUploadDraftView[];
  isOpen: boolean;
  isUploading: boolean;
  linkComposer: AssetLinkComposerView;
  linkDrafts: AssetLinkDraftView[];
  onActiveTabChange: (value: "FILE" | "LINK") => void;
  onAddLinkDraft: () => void;
  onAddTag: (draftId: string, collectionKey: AssetTagCollectionKey) => void;
  onCharacterToggle: (draftId: string, characterTagId: number) => void;
  onClose: () => void;
  onDescriptionChange: (draftId: string, value: string) => void;
  onFileDrop: (files: File[]) => Promise<void>;
  onLinkCharacterToggle: (characterTagId: number) => void;
  onLinkComposerChange: (key: "url" | "title" | "linkType", value: string) => void;
  onLinkTagAdd: (collectionKey: AssetTagCollectionKey) => void;
  onLinkTagInputChange: (key: AssetTagInputKey, value: string) => void;
  onLinkTagRemove: (collectionKey: AssetTagCollectionKey, tag: string) => void;
  onRemoveLinkDraft: (draftId: string) => void;
  onRemoveDraft: (draftId: string) => void;
  onRemoveTag: (draftId: string, collectionKey: AssetTagCollectionKey, tag: string) => void;
  onSubmit: () => Promise<void>;
  onTagInputChange: (draftId: string, key: AssetTagInputKey, value: string) => void;
  onTitleChange: (draftId: string, value: string) => void;
  uploadMode: "FILE" | "LINK";
}

export function AssetUploadModal({
  characterOptions,
  fileDrafts,
  isOpen,
  isUploading,
  linkComposer,
  linkDrafts,
  onActiveTabChange,
  onAddLinkDraft,
  onAddTag,
  onCharacterToggle,
  onClose,
  onDescriptionChange,
  onFileDrop,
  onLinkCharacterToggle,
  onLinkComposerChange,
  onLinkTagAdd,
  onLinkTagInputChange,
  onLinkTagRemove,
  onRemoveLinkDraft,
  onRemoveDraft,
  onRemoveTag,
  onSubmit,
  onTagInputChange,
  onTitleChange,
  uploadMode
}: AssetUploadModalProps): React.JSX.Element | null {
  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const nextFiles = Array.from(event.target.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    await onFileDrop(nextFiles);
    event.target.value = "";
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>): Promise<void> {
    event.preventDefault();
    const nextFiles = Array.from(event.dataTransfer.files ?? []);
    if (nextFiles.length === 0) {
      return;
    }

    await onFileDrop(nextFiles);
  }

  const activeDraftCount = uploadMode === "FILE" ? fileDrafts.length : linkDrafts.length;

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
          <Tabs onValueChange={(value) => onActiveTabChange(value as "FILE" | "LINK")} value={uploadMode}>
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
                          onChange={(event) => onTitleChange(draft.id, event.target.value)}
                          value={draft.title}
                        />
                        <Textarea
                          className="min-h-20 rounded-2xl bg-white"
                          onChange={(event) => onDescriptionChange(draft.id, event.target.value)}
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
                          onAddTag={(collectionKey) => onAddTag(draft.id, collectionKey)}
                          onCharacterToggle={(characterTagId) => onCharacterToggle(draft.id, characterTagId)}
                          onRemoveTag={(collectionKey, tag) => onRemoveTag(draft.id, collectionKey, tag)}
                          onTagInputChange={(key, value) => onTagInputChange(draft.id, key, value)}
                          value={draft}
                        />
                      </div>
                    </div>

                    <button
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      onClick={() => onRemoveDraft(draft.id)}
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
                      onChange={(event) => onLinkComposerChange("url", event.target.value)}
                      placeholder="https://drive.google.com/... 또는 https://www.youtube.com/..."
                      value={linkComposer.url}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">제목</p>
                    <Input
                      onChange={(event) => onLinkComposerChange("title", event.target.value)}
                      placeholder="비워두면 URL 도메인명으로 자동 등록됩니다."
                      value={linkComposer.title}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">링크 유형</p>
                    <Input
                      onChange={(event) => onLinkComposerChange("linkType", event.target.value)}
                      placeholder="Google Drive / YouTube / Notion / 기타"
                      value={linkComposer.linkType}
                    />
                  </div>

                  <AssetTagEditor
                    characterOptions={characterOptions}
                    onAddTag={onLinkTagAdd}
                    onCharacterToggle={onLinkCharacterToggle}
                    onRemoveTag={onLinkTagRemove}
                    onTagInputChange={onLinkTagInputChange}
                    value={linkComposer}
                  />

                  <div className="flex justify-end">
                    <Button className="rounded-xl px-4" onClick={onAddLinkDraft} type="button" variant="outline">
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
                        onClick={() => onRemoveLinkDraft(draft.id)}
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
                ? `${activeDraftCount}개 파일이 업로드 대기 중입니다.`
                : `${activeDraftCount}개 링크가 등록 대기 중입니다.`
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
              onClick={() => void onSubmit()}
              type="button"
            >
              {isUploading ? "처리 중..." : uploadMode === "FILE" ? `${activeDraftCount}개 업로드` : `${activeDraftCount}개 등록`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
