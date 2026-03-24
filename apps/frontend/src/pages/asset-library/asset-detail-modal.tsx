import { useEffect, useState } from "react";
import type React from "react";
import {
  Download,
  Eye,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Dialog, DialogClose, DialogContent } from "../../components/ui/dialog";
import type { AssetDetailView } from "../../api/types";
import { cn } from "../../lib/utils";
import {
  detailDateFormatter,
  formatFileSize,
  historyLabelMap,
  typeLabelMap
} from "./asset-detail-model";
import {
  AssetDataField,
  AssetStatusChip,
  AssetTagChip,
  AssetTypeIcon
} from "./asset-detail-section";
import { AssetPreviewPanel } from "./asset-preview-panel";

interface AssetDetailModalProps {
  asset: AssetDetailView | null;
  isDeleting: boolean;
  isDownloading: boolean;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (assetId: number) => Promise<void>;
  onDownload: (assetId: number) => Promise<void>;
  onOpenDetailPage: (assetId: number) => void;
}

type AssetDetailTabKey = "summary" | "history" | "metadata";

const detailTabs: Array<{ key: AssetDetailTabKey; label: string }> = [
  { key: "summary", label: "상세 정보" },
  { key: "history", label: "변경 이력" },
  { key: "metadata", label: "메타데이터" }
];

export function AssetDetailModal({
  asset,
  isDeleting,
  isDownloading,
  isLoading,
  isOpen,
  onClose,
  onDelete,
  onDownload,
  onOpenDetailPage
}: AssetDetailModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<AssetDetailTabKey>("summary");

  useEffect(() => {
    if (isOpen) {
      setActiveTab("summary");
    }
  }, [asset?.id, isOpen]);

  return (
    <Dialog onOpenChange={(open) => (!open ? onClose() : undefined)} open={isOpen}>
      <DialogContent
        className="max-w-none overflow-hidden overflow-y-auto rounded-[24px] border border-border bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.20)]"
        showCloseButton={false}
        style={{
          width: "min(560px, calc(100vw - 48px))",
          maxWidth: "560px",
          maxHeight: "calc(100vh - 48px)"
        }}
      >
        <div className="p-6">
          <header className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted text-primary">
                {asset ? <AssetTypeIcon assetType={asset.type} /> : <Sparkles className="h-5 w-5" />}
              </div>

              <div className="min-w-0">
                <h2 className="line-clamp-2 text-[16px] font-semibold leading-tight text-foreground">
                  {asset?.title ?? "애셋 상세"}
                </h2>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {asset ? `${typeLabelMap[asset.type]} · 버전 ${asset.versionNumber}` : "불러오는 중"}
                </p>
              </div>
            </div>

            <DialogClose
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </DialogClose>
          </header>

          <div className="mt-4 inline-flex items-center gap-1 rounded-[18px] bg-muted p-1">
            {detailTabs.map((tab) => (
              <button
                className={cn(
                  "shrink-0 rounded-[14px] px-3 py-2 text-[13px] font-medium leading-none transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {isLoading || !asset ? (
              <AssetInfoState message="상세 정보를 불러오는 중입니다." />
            ) : activeTab === "summary" ? (
              <AssetSummaryPanel
                asset={asset}
                isDeleting={isDeleting}
                isDownloading={isDownloading}
                onDelete={onDelete}
                onDownload={onDownload}
                onOpenDetailPage={onOpenDetailPage}
              />
            ) : activeTab === "history" ? (
              <AssetHistoryPanel asset={asset} />
            ) : (
              <AssetMetadataPanel asset={asset} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssetSummaryPanel({
  asset,
  isDeleting,
  isDownloading,
  onDelete,
  onDownload,
  onOpenDetailPage
}: {
  asset: AssetDetailView;
  isDeleting: boolean;
  isDownloading: boolean;
  onDelete: (assetId: number) => Promise<void>;
  onDownload: (assetId: number) => Promise<void>;
  onOpenDetailPage: (assetId: number) => void;
}): React.JSX.Element {
  async function handleDelete(): Promise<void> {
    const confirmed = window.confirm(`"${asset.title}" 애셋을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    await onDelete(asset.id);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[18px] border border-[#dfe4f0] bg-[#fcfcfe] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6)]">
        <AssetPreviewPanel
          assetId={asset.id}
          assetType={asset.type}
          cacheKey={asset.updatedAt}
          className="mb-4 aspect-[16/9] w-full rounded-[16px]"
          title={asset.title}
        />

        <div>
          <p className="text-[12px] text-muted-foreground">설명</p>
          <p className="mt-1 text-[14px] leading-6 text-foreground">{asset.description ?? asset.originalFileName}</p>
        </div>

        <div className="my-4 h-px bg-border" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <AssetDataField label="제작자" value={asset.ownerName} />
          <AssetDataField label="부서" value={asset.organizationName ?? "조직 미지정"} />
          <AssetDataField label="생성일" value={detailDateFormatter.format(new Date(asset.createdAt))} />
          <AssetDataField label="최종 수정일" value={detailDateFormatter.format(new Date(asset.updatedAt))} />
          <AssetDataField label="상태" value={<AssetStatusChip status={asset.status} />} />
          <AssetDataField label="파일 크기" value={formatFileSize(asset.fileSizeBytes)} />
        </div>

        <div className="my-4 h-px bg-border" />

        <div>
          <p className="text-[12px] text-muted-foreground">태그</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {asset.tags.length > 0 ? (
              asset.tags.map((tag) => <AssetTagChip key={tag} tag={tag} />)
            ) : (
              <span className="text-[12px] text-muted-foreground">등록된 태그가 없습니다.</span>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2">
        <Button
          className="h-9 rounded-lg px-3 text-[13px] font-medium"
          onClick={() => onOpenDetailPage(asset.id)}
          type="button"
          variant="outline"
        >
          <Eye className="h-4 w-4" />
          상세 보기
        </Button>
        <Button
          className="h-9 rounded-lg px-3 text-[13px] font-medium"
          disabled={!asset.canDownload || isDownloading}
          onClick={() => void onDownload(asset.id)}
          type="button"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "다운로드 중" : "다운로드"}
        </Button>
        {asset.canDelete ? (
          <Button
            className="h-9 rounded-lg px-3 text-[13px] font-medium"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
            <span className="text-destructive">{isDeleting ? "삭제 중" : "삭제"}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function AssetHistoryPanel({ asset }: { asset: AssetDetailView }): React.JSX.Element {
  if (asset.events.length === 0) {
    return <AssetInfoState message="아직 기록된 이력이 없습니다." />;
  }

  return (
    <div className="space-y-3">
      {asset.events.map((event) => (
        <article
          className="rounded-[18px] border border-[#e3e7f1] bg-[#f7f8fc] px-4 py-4"
          key={`${event.createdAt}-${event.eventType}`}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground">
              {historyLabelMap[event.eventType]}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {detailDateFormatter.format(new Date(event.createdAt))}
            </span>
          </div>
          <p className="mt-3 text-[14px] font-medium leading-6 text-foreground">
            {event.detail ?? "등록 이력이 기록되었습니다."}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">by {event.actorName ?? event.actorEmail}</p>
        </article>
      ))}
    </div>
  );
}

function AssetMetadataPanel({ asset }: { asset: AssetDetailView }): React.JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MetadataCard label="카테고리" value={typeLabelMap[asset.type]} />
      <MetadataCard label="콘텐츠 ID" value={String(asset.id)} />
    </div>
  );
}

function AssetInfoState({ message }: { message: string }): React.JSX.Element {
  return (
    <section className="rounded-[18px] border border-[#e3e7f1] bg-[#f7f8fc] px-4 py-8 text-[13px] text-muted-foreground">
      {message}
    </section>
  );
}

function MetadataCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <article className="rounded-[18px] border border-[#e3e7f1] bg-[#f7f8fc] px-4 py-4">
      <AssetDataField label={label} value={value} />
    </article>
  );
}
