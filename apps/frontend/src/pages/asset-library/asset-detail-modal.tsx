import { useEffect, useState } from "react";
import {
  Clock3,
  Download,
  FileAudio2,
  FileImage,
  FileText,
  Film,
  Save,
  Sparkles,
  X
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import type { AssetDetailView, AssetUpdateInput } from "../../dashboard-types";

interface AssetDetailModalProps {
  asset: AssetDetailView | null;
  isLoading: boolean;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (assetId: number, input: AssetUpdateInput) => Promise<void>;
}

const detailDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

export function AssetDetailModal({
  asset,
  isLoading,
  isOpen,
  isSaving,
  onClose,
  onSave
}: AssetDetailModalProps): React.JSX.Element | null {
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (!asset) {
      return;
    }

    setTitleDraft(asset.title);
    setDescriptionDraft(asset.description ?? "");
    setTagsDraft(asset.tags);
    setTagInput("");
  }, [asset]);

  async function handleSave(): Promise<void> {
    if (!asset) {
      return;
    }

    await onSave(asset.id, {
      title: titleDraft,
      description: descriptionDraft,
      tags: tagsDraft
    });
  }

  return (
    <Dialog onOpenChange={(open) => (!open ? onClose() : undefined)} open={isOpen}>
      <DialogContent className="max-w-[390px] overflow-hidden p-0">
        <DialogHeader className="gap-0 px-5 py-5 text-left">
          <div className="flex min-w-0 items-start gap-3 pr-10">
            <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-[#f1ebff] text-[#6d4ae2]">
              {asset ? <AssetTypeIcon assetType={asset.type} /> : <Sparkles className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <DialogTitle className="line-clamp-2">{asset?.title ?? "애셋 상세"}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {asset ? `${typeLabelMap[asset.type]} · 버전 ${asset.versionNumber}` : "불러오는 중"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5">
          <Tabs defaultValue="summary">
            <TabsList className="h-auto w-full justify-start rounded-full bg-muted/80 p-1">
              <TabsTrigger className="rounded-full" value="summary">
                상세 정보
              </TabsTrigger>
              <TabsTrigger className="rounded-full" value="history">
                변경 이력
              </TabsTrigger>
              <TabsTrigger className="rounded-full" value="metadata">
                메타데이터
              </TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-4 py-5" value="summary">
              {isLoading || !asset ? (
                <p className="text-sm text-muted-foreground">상세 정보를 불러오는 중입니다.</p>
              ) : (
                <>
                  <section className="space-y-2 border-b border-border pb-4">
                    <p className="text-xs font-medium text-muted-foreground">설명</p>
                    <p className="text-sm leading-6 text-foreground">
                      {asset.description ?? asset.originalFileName}
                    </p>
                  </section>

                  <section className="grid grid-cols-2 gap-4 border-b border-border pb-4 text-sm">
                    <DetailField label="제작자" value={asset.ownerName} />
                    <DetailField label="부서" value={asset.organizationName ?? "조직 미지정"} />
                    <DetailField label="생성일" value={detailDateFormatter.format(new Date(asset.createdAt))} />
                    <DetailField label="최종 수정일" value={detailDateFormatter.format(new Date(asset.updatedAt))} />
                    <DetailField label="상태" value={statusLabelMap[asset.status]} />
                    <DetailField label="파일 형식" value={asset.fileExtension ?? asset.mimeType} />
                  </section>

                  <section className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">태그</p>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </TabsContent>

            <TabsContent className="py-5" value="history">
              {isLoading || !asset ? (
                <p className="text-sm text-muted-foreground">변경 이력을 불러오는 중입니다.</p>
              ) : asset.events.length > 0 ? (
                <div className="space-y-3">
                  {asset.events.map((event) => (
                    <div className="rounded-2xl border border-border bg-muted/20 p-4" key={`${event.createdAt}-${event.eventType}`}>
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="secondary">{historyLabelMap[event.eventType]}</Badge>
                        <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>{detailDateFormatter.format(new Date(event.createdAt))}</span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-medium">
                        {event.actorName ?? event.actorEmail}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {event.detail ?? "등록 이력이 기록되었습니다."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">아직 기록된 이력이 없습니다.</p>
              )}
            </TabsContent>

            <TabsContent className="space-y-4 py-5" value="metadata">
              {isLoading || !asset ? (
                <p className="text-sm text-muted-foreground">메타데이터를 불러오는 중입니다.</p>
              ) : (
                <>
                  <section className="grid grid-cols-2 gap-4 text-sm">
                    <DetailField label="원본 파일명" value={asset.currentFile.originalFileName} />
                    <DetailField label="MIME" value={asset.currentFile.mimeType} />
                    <DetailField label="크기" value={formatFileSize(asset.currentFile.fileSizeBytes)} />
                    <DetailField label="버전" value={`v${asset.currentFile.versionNumber}`} />
                    <DetailField label="체크섬" value={asset.currentFile.checksumSha256.slice(0, 12)} />
                    <DetailField label="생성 루트" value={asset.sourceDetail ?? "외부 등록"} />
                    <DetailField
                      label="해상도"
                      value={
                        asset.widthPx && asset.heightPx
                          ? `${asset.widthPx}x${asset.heightPx}`
                          : "추출 정보 없음"
                      }
                    />
                    <DetailField label="저장 타입" value={asset.sourceType} />
                  </section>

                  <section className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">제목</p>
                      <Input
                        onChange={(event) => setTitleDraft(event.target.value)}
                        value={titleDraft}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">설명</p>
                      <Textarea
                        className="min-h-24 rounded-2xl bg-white"
                        onChange={(event) => setDescriptionDraft(event.target.value)}
                        placeholder="애셋 설명을 입력하세요"
                        value={descriptionDraft}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">태그</p>
                      <div className="flex flex-wrap gap-2">
                        {tagsDraft.map((tag) => (
                          <button
                            className="inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-3 py-1 text-xs font-medium text-[#6d4ae2]"
                            key={tag}
                            onClick={() => setTagsDraft((currentTags) => currentTags.filter((value) => value !== tag))}
                            type="button"
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-sm">
                        <Input
                          className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              const normalizedTag = normalizeTag(tagInput);
                              if (!normalizedTag) {
                                return;
                              }
                              setTagsDraft((currentTags) =>
                                currentTags.includes(normalizedTag)
                                  ? currentTags
                                  : [...currentTags, normalizedTag]
                              );
                              setTagInput("");
                            }
                          }}
                          placeholder="태그 추가"
                          value={tagInput}
                        />
                        <button
                          className="text-xs font-medium text-primary"
                          onClick={() => {
                            const normalizedTag = normalizeTag(tagInput);
                            if (!normalizedTag) {
                              return;
                            }
                            setTagsDraft((currentTags) =>
                              currentTags.includes(normalizedTag)
                                ? currentTags
                                : [...currentTags, normalizedTag]
                            );
                            setTagInput("");
                          }}
                          type="button"
                        >
                          추가
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            className="flex-1"
            disabled={!asset || isLoading || isSaving}
            onClick={() => void handleSave()}
            type="button"
            variant="outline"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "저장 중" : "변경 저장"}
          </Button>
          {asset && !isLoading ? (
            <Button asChild className="flex-1" type="button">
              <a href={`/api/assets/${asset.id}/download`}>
                <Download className="h-4 w-4" />
                다운로드
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function AssetTypeIcon({ assetType }: { assetType: AssetDetailView["type"] }): React.JSX.Element {
  switch (assetType) {
    case "AUDIO":
      return <FileAudio2 className="h-5 w-5" />;
    case "IMAGE":
      return <FileImage className="h-5 w-5" />;
    case "SCENARIO":
    case "DOCUMENT":
      return <FileText className="h-5 w-5" />;
    case "VIDEO":
      return <Film className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}

function formatFileSize(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

const historyLabelMap: Record<string, string> = {
  CREATED: "생성",
  METADATA_UPDATED: "수정"
};

const statusLabelMap: Record<AssetDetailView["status"], string> = {
  READY: "리뷰"
};

const typeLabelMap: Record<AssetDetailView["type"], string> = {
  AUDIO: "오디오",
  DOCUMENT: "문서",
  IMAGE: "이미지",
  OTHER: "기타",
  SCENARIO: "시나리오",
  VIDEO: "영상"
};

function normalizeTag(value: string): string | null {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}
