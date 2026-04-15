import { useState } from "react";
import {
  ChevronDown,
  Clapperboard,
  LayoutGrid,
  Link2,
  List,
  PencilLine,
  Plus,
  Trash2,
  Upload,
  X
} from "lucide-react";
import type React from "react";
import type { AssetSummaryView, HubEpisodeSlotView, HubEpisodeView } from "../../api/types";
import { Button } from "../../components/ui/button";
import { cn, hasDistinctEpisodeTitle } from "../../lib/utils";
import { formatFileSize, typeLabelMap } from "../asset-library/asset-detail-model";

type SlotViewMode = "card" | "list";

interface HubEpisodePageProps {
  busyAssetId: number | null;
  busySlotId: number | null;
  busySlotMode: "DELETE" | "LINK" | "REMOVE" | "UPLOAD" | null;
  episode: HubEpisodeView | null;
  errorMessage: string | null;
  isCreatingSlot: boolean;
  isDeletingEpisode: boolean;
  isLoading: boolean;
  isUploadingAssets: boolean;
  onDeleteEpisode: () => Promise<void>;
  onDeleteSlot: (slotId: number) => Promise<void>;
  onOpenSlotCreator: () => void;
  onOpenEpisodeEditor: () => void;
  onRemoveLinkedAsset: (slotId: number, assetId: number) => Promise<void>;
  onOpenAssetPage: (assetId: number) => void;
  onOpenAssetPicker: (slotId: number) => void;
  onOpenUploadModal: (slotId: number) => void;
}

export function HubEpisodePage({
  busyAssetId,
  busySlotId,
  busySlotMode,
  episode,
  errorMessage,
  isCreatingSlot,
  isDeletingEpisode,
  isLoading,
  isUploadingAssets,
  onDeleteEpisode,
  onDeleteSlot,
  onOpenSlotCreator,
  onOpenEpisodeEditor,
  onRemoveLinkedAsset,
  onOpenAssetPage,
  onOpenAssetPicker,
  onOpenUploadModal
}: HubEpisodePageProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<SlotViewMode>("card");

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-border bg-card px-8 py-14 text-center text-sm text-muted-foreground shadow-sm">
        에피소드 슬롯을 불러오는 중입니다.
      </div>
    );
  }

  if (episode === null) {
    return (
      <div className="rounded-[32px] border border-border bg-card px-8 py-14 text-center text-sm text-muted-foreground shadow-sm">
        에피소드를 찾을 수 없습니다.
      </div>
    );
  }

  const resolvedEpisode = episode;
  const hasEpisodeTitle = hasDistinctEpisodeTitle(resolvedEpisode.episodeCode, resolvedEpisode.episodeTitle);
  const headerTitle = hasEpisodeTitle ? resolvedEpisode.episodeTitle : resolvedEpisode.episodeCode;

  async function handleDeleteEpisode(): Promise<void> {
    const confirmed = window.confirm(`"${resolvedEpisode.episodeCode}" 에피소드를 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    await onDeleteEpisode();
  }

  async function handleDeleteSlot(slotId: number, slotName: string): Promise<void> {
    const confirmed = window.confirm(`"${slotName}" 슬롯을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    await onDeleteSlot(slotId);
  }

  async function handleRemoveLinkedAsset(
    slotId: number,
    assetId: number,
    assetTitle: string
  ): Promise<void> {
    const confirmed = window.confirm(`"${assetTitle}" 에셋 연결을 해제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    await onRemoveLinkedAsset(slotId, assetId);
  }

  const slotActionProps = {
    busyAssetId,
    busySlotId,
    busySlotMode,
    isCreatingSlot,
    isUploadingAssets,
    onDeleteSlot: handleDeleteSlot,
    onOpenAssetPage,
    onOpenAssetPicker,
    onOpenSlotCreator,
    onOpenUploadModal,
    onRemoveLinkedAsset: handleRemoveLinkedAsset
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>{resolvedEpisode.seriesLabel}</span>
            <span>&gt;</span>
            <span>{resolvedEpisode.levelLabel}</span>
            <span>&gt;</span>
            <span>{resolvedEpisode.episodeCode}</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{headerTitle}</h1>
            {resolvedEpisode.episodeDescription?.trim() ? (
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
                {resolvedEpisode.episodeDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
            <button
              aria-label="카드 뷰"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                viewMode === "card"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("card")}
              type="button"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              aria-label="리스트 뷰"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            className="h-10 rounded-full border-border bg-background px-4 shadow-sm"
            disabled={isDeletingEpisode}
            onClick={onOpenEpisodeEditor}
            size="sm"
            type="button"
            variant="outline"
          >
            <PencilLine className="h-4 w-4" />
            정보 수정
          </Button>
          <Button
            className="h-10 rounded-full border-destructive/20 bg-destructive/5 px-4 text-destructive shadow-sm hover:bg-destructive/10"
            disabled={isDeletingEpisode}
            onClick={() => void handleDeleteEpisode()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingEpisode ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {viewMode === "card" ? (
        <SlotCardView slots={resolvedEpisode.slots} {...slotActionProps} />
      ) : (
        <SlotListView slots={resolvedEpisode.slots} {...slotActionProps} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared types for slot views
// ---------------------------------------------------------------------------

interface SlotViewProps {
  busyAssetId: number | null;
  busySlotId: number | null;
  busySlotMode: "DELETE" | "LINK" | "REMOVE" | "UPLOAD" | null;
  isCreatingSlot: boolean;
  isUploadingAssets: boolean;
  onDeleteSlot: (slotId: number, slotName: string) => Promise<void>;
  onOpenAssetPage: (assetId: number) => void;
  onOpenAssetPicker: (slotId: number) => void;
  onOpenSlotCreator: () => void;
  onOpenUploadModal: (slotId: number) => void;
  onRemoveLinkedAsset: (slotId: number, assetId: number, assetTitle: string) => Promise<void>;
  slots: HubEpisodeSlotView[];
}

// ---------------------------------------------------------------------------
// Card View
// ---------------------------------------------------------------------------

function SlotCardView({
  busyAssetId,
  busySlotId,
  busySlotMode,
  isCreatingSlot,
  isUploadingAssets,
  onDeleteSlot,
  onOpenAssetPage,
  onOpenAssetPicker,
  onOpenSlotCreator,
  onOpenUploadModal,
  onRemoveLinkedAsset,
  slots
}: SlotViewProps): React.JSX.Element {
  return (
    <section className="grid gap-3 xl:grid-cols-3">
      {slots.map((slot) => {
        const isBusy = busySlotId === slot.slotId;
        const linkedAssets = slot.linkedAssets;
        const hasLinkedAssets = linkedAssets.length > 0;

        return (
          <article
            className={cn(
              "flex min-h-[220px] flex-col rounded-2xl px-4 py-4 shadow-sm",
              hasLinkedAssets
                ? "border border-border bg-card"
                : "border border-dashed border-border bg-card/80"
            )}
            key={slot.slotId}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-muted-foreground">
                  {slot.slotOrder}
                </span>
                <h2 className="truncate text-sm font-semibold text-foreground">{slot.slotName}</h2>
                {hasLinkedAssets ? (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    {linkedAssets.length}
                  </span>
                ) : null}
              </div>
              <button
                aria-label={`${slot.slotName} 슬롯 삭제`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                disabled={isBusy && busySlotMode === "DELETE"}
                onClick={() => void onDeleteSlot(slot.slotId, slot.slotName)}
                title="슬롯 삭제"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-3 flex flex-1 flex-col overflow-hidden">
              {hasLinkedAssets ? (
                <div className="flex-1 overflow-hidden rounded-xl border border-border/70 bg-background/70 p-1.5">
                  <div className="max-h-[200px] space-y-1.5 overflow-y-auto pr-1">
                    {linkedAssets.map((linkedAsset) => (
                      <LinkedAssetCard
                        asset={linkedAsset}
                        isRemoving={isBusy && busySlotMode === "REMOVE" && busyAssetId === linkedAsset.id}
                        key={linkedAsset.id}
                        onOpenAssetPage={onOpenAssetPage}
                        onRemove={() => onRemoveLinkedAsset(slot.slotId, linkedAsset.id, linkedAsset.title)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">등록된 파일 없음</p>
                </div>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <SlotUploadButton
                  isBusy={isUploadingAssets}
                  onClick={() => onOpenUploadModal(slot.slotId)}
                />
                <Button
                  className="w-full rounded-lg text-xs"
                  onClick={() => onOpenAssetPicker(slot.slotId)}
                  size="sm"
                  variant="outline"
                >
                  기존 에셋 연결
                </Button>
              </div>
            </div>
          </article>
        );
      })}
      <button
        className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
        disabled={isCreatingSlot}
        onClick={onOpenSlotCreator}
        type="button"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-primary shadow-sm">
          <Plus className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          {isCreatingSlot ? "슬롯 생성 준비 중..." : "슬롯 추가"}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          에피소드에 슬롯을 추가합니다.
        </p>
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// List View
// ---------------------------------------------------------------------------

function SlotListView({
  busyAssetId,
  busySlotId,
  busySlotMode,
  isCreatingSlot,
  isUploadingAssets,
  onDeleteSlot,
  onOpenAssetPage,
  onOpenAssetPicker,
  onOpenSlotCreator,
  onOpenUploadModal,
  onRemoveLinkedAsset,
  slots
}: SlotViewProps): React.JSX.Element {
  const [expandedSlotIds, setExpandedSlotIds] = useState<Set<number>>(
    () => new Set(slots.map((slot) => slot.slotId))
  );

  function toggleSlot(slotId: number): void {
    setExpandedSlotIds((current) => {
      const next = new Set(current);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  }

  return (
    <section className="space-y-2">
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        {slots.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            아직 등록된 슬롯이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {slots.map((slot) => {
              const isBusy = busySlotId === slot.slotId;
              const linkedAssets = slot.linkedAssets;
              const hasLinkedAssets = linkedAssets.length > 0;
              const isExpanded = expandedSlotIds.has(slot.slotId);

              return (
                <div key={slot.slotId}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      aria-expanded={isExpanded}
                      aria-label={`${slot.slotName} 펼치기`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      onClick={() => toggleSlot(slot.slotId)}
                      type="button"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          !isExpanded && "-rotate-90"
                        )}
                      />
                    </button>

                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-muted-foreground">
                      {slot.slotOrder}
                    </span>

                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => toggleSlot(slot.slotId)}
                      type="button"
                    >
                      <span className="truncate text-sm font-semibold text-foreground">
                        {slot.slotName}
                      </span>
                    </button>

                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        hasLinkedAssets
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {linkedAssets.length}개 에셋
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        aria-label="업로드"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                        disabled={isUploadingAssets}
                        onClick={() => onOpenUploadModal(slot.slotId)}
                        title="업로드"
                        type="button"
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label="기존 에셋 연결"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        onClick={() => onOpenAssetPicker(slot.slotId)}
                        title="기존 에셋 연결"
                        type="button"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        aria-label={`${slot.slotName} 슬롯 삭제`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                        disabled={isBusy && busySlotMode === "DELETE"}
                        onClick={() => void onDeleteSlot(slot.slotId, slot.slotName)}
                        title="슬롯 삭제"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="border-t border-border/50 bg-muted/30 px-4 py-2">
                      {hasLinkedAssets ? (
                        <div className="space-y-px">
                          {linkedAssets.map((linkedAsset) => (
                            <LinkedAssetRow
                              asset={linkedAsset}
                              isRemoving={isBusy && busySlotMode === "REMOVE" && busyAssetId === linkedAsset.id}
                              key={linkedAsset.id}
                              onOpenAssetPage={onOpenAssetPage}
                              onRemove={() =>
                                onRemoveLinkedAsset(slot.slotId, linkedAsset.id, linkedAsset.title)
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="py-3 text-center text-xs text-muted-foreground">
                          등록된 파일 없음
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
        disabled={isCreatingSlot}
        onClick={onOpenSlotCreator}
        type="button"
      >
        <Plus className="h-4 w-4" />
        {isCreatingSlot ? "슬롯 생성 준비 중..." : "슬롯 추가"}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// List View — asset row
// ---------------------------------------------------------------------------

interface LinkedAssetRowProps {
  asset: AssetSummaryView;
  isRemoving: boolean;
  onOpenAssetPage: (assetId: number) => void;
  onRemove: () => Promise<void>;
}

function LinkedAssetRow({
  asset,
  isRemoving,
  onOpenAssetPage,
  onRemove
}: LinkedAssetRowProps): React.JSX.Element {
  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background/80">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm">
        {asset.sourceKind === "LINK" ? (
          <Link2 className="h-3 w-3" />
        ) : (
          <Clapperboard className="h-3 w-3" />
        )}
      </div>

      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpenAssetPage(asset.id)}
        type="button"
      >
        <span className="truncate text-[13px] font-medium text-foreground transition-colors group-hover:text-primary">
          {asset.title}
        </span>
      </button>

      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
        {typeLabelMap[asset.type]}
      </span>

      <span className="hidden max-w-[180px] shrink-0 truncate text-[11px] text-muted-foreground md:inline">
        {asset.originalFileName}
      </span>

      {asset.fileSizeBytes > 0 ? (
        <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground lg:inline">
          {formatFileSize(asset.fileSizeBytes)}
        </span>
      ) : null}

      <button
        aria-label="연결 해제"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        disabled={isRemoving}
        onClick={() => void onRemove()}
        title="연결 해제"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card View — linked asset card
// ---------------------------------------------------------------------------

interface LinkedAssetCardProps {
  asset: AssetSummaryView;
  isRemoving: boolean;
  onOpenAssetPage: (assetId: number) => void;
  onRemove: () => Promise<void>;
}

function LinkedAssetCard({
  asset,
  isRemoving,
  onOpenAssetPage,
  onRemove
}: LinkedAssetCardProps): React.JSX.Element {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpenAssetPage(asset.id);
    }
  }

  return (
    <div className="rounded-xl border border-primary/10 bg-primary/[0.04] transition-colors hover:border-primary/20 hover:bg-primary/[0.06]">
      <div
        className="group flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => onOpenAssetPage(asset.id)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/95 text-primary shadow-sm">
          {asset.sourceKind === "LINK" ? (
            <Link2 className="h-3.5 w-3.5" />
          ) : (
            <Clapperboard className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground transition-colors group-hover:text-primary">
            {asset.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{typeLabelMap[asset.type]}</span>
            <span>&bull;</span>
            <span className="truncate">{asset.originalFileName}</span>
            {asset.fileSizeBytes > 0 ? (
              <>
                <span>&bull;</span>
                <span>{formatFileSize(asset.fileSizeBytes)}</span>
              </>
            ) : null}
          </div>
        </div>
        <button
          aria-label="연결 해제"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          disabled={isRemoving}
          onClick={(event) => {
            event.stopPropagation();
            void onRemove();
          }}
          title="연결 해제"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared — upload button
// ---------------------------------------------------------------------------

interface SlotUploadButtonProps {
  isBusy: boolean;
  onClick: () => void;
}

function SlotUploadButton({
  isBusy,
  onClick
}: SlotUploadButtonProps): React.JSX.Element {
  return (
    <Button
      className="w-full rounded-lg text-xs"
      disabled={isBusy}
      onClick={onClick}
      size="sm"
      type="button"
    >
      {isBusy ? "업로드 진행 중..." : "업로드"}
    </Button>
  );
}
