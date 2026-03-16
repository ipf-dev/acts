import { ImageIcon, Plus, Upload, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetUploadModalProps {
  drafts: AssetUploadDraftView[];
  isOpen: boolean;
  isUploading: boolean;
  onAddTag: (draftId: string) => void;
  onClose: () => void;
  onFileDrop: (files: File[]) => Promise<void>;
  onRemoveDraft: (draftId: string) => void;
  onRemoveTag: (draftId: string, tag: string) => void;
  onSubmit: () => Promise<void>;
  onTagInputChange: (draftId: string, value: string) => void;
  onTitleChange: (draftId: string, value: string) => void;
}

export function AssetUploadModal({
  drafts,
  isOpen,
  isUploading,
  onAddTag,
  onClose,
  onFileDrop,
  onRemoveDraft,
  onRemoveTag,
  onSubmit,
  onTagInputChange,
  onTitleChange
}: AssetUploadModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_32px_120px_rgba(17,24,39,0.2)]">
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">애셋 업로드</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              파일을 드래그하거나 선택하여 업로드하세요. 자동 분류 및 태깅이 적용됩니다.
            </p>
          </div>
          <button
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-170px)] space-y-4 overflow-y-auto px-6 py-5">
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

          {drafts.map((draft) => (
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

                    <div className="flex flex-wrap items-center gap-2">
                      {draft.tags.map((tag) => (
                        <button
                          className="inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-3 py-1 text-xs font-medium text-[#6d4ae2]"
                          key={tag}
                          onClick={() => onRemoveTag(draft.id, tag)}
                          type="button"
                        >
                          {tag}
                          <X className="h-3 w-3" />
                        </button>
                      ))}

                      <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
                        <Input
                          className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          onChange={(event) => onTagInputChange(draft.id, event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              onAddTag(draft.id);
                            }
                          }}
                          placeholder="태그 추가"
                          value={draft.tagInput}
                        />
                        <button
                          className="text-xs font-medium text-primary"
                          onClick={() => onAddTag(draft.id)}
                          type="button"
                        >
                          추가
                        </button>
                      </div>
                    </div>
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
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            {drafts.length > 0 ? `${drafts.length}개 파일이 업로드 대기 중입니다.` : "업로드할 파일을 먼저 추가하세요."}
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={onClose} type="button" variant="ghost">
              닫기
            </Button>
            <Button disabled={drafts.length === 0 || isUploading} onClick={() => void onSubmit()} type="button">
              {isUploading ? "업로드 중..." : `${drafts.length}개 업로드`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const typeLabelMap: Record<string, string> = {
  AUDIO: "오디오",
  DOCUMENT: "문서",
  IMAGE: "이미지",
  OTHER: "기타",
  SCENARIO: "시나리오",
  VIDEO: "영상"
};
