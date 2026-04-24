import { useState } from "react";
import { Search } from "lucide-react";
import type React from "react";
import type { AssetSummaryView } from "../../api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { formatFileSize, typeLabelMap } from "../asset-library/asset-detail-model";
import { AssetPreviewPanel } from "../asset-library/asset-preview-panel";
import { AssetTypeIcon } from "../asset-library/asset-detail-section";

interface ProjectAssetPickerModalProps {
  assets: AssetSummaryView[];
  errorMessage: string | null;
  isLinking: boolean;
  isLoading: boolean;
  isOpen: boolean;
  linkedAssetIds: number[];
  onClose: () => void;
  onConfirmSelection: (assetIds: number[]) => Promise<void>;
  onSearchQueryChange: (value: string) => void;
  projectName: string | null;
  searchQuery: string;
}

export function ProjectAssetPickerModal({
  assets,
  errorMessage,
  isLinking,
  isLoading,
  isOpen,
  linkedAssetIds,
  onClose,
  onConfirmSelection,
  onSearchQueryChange,
  projectName,
  searchQuery
}: ProjectAssetPickerModalProps): React.JSX.Element | null {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (!isOpen) {
    return null;
  }

  function toggleSelection(assetId: number): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }

  function handleClose(): void {
    setSelectedIds(new Set());
    onClose();
  }

  async function handleConfirm(): Promise<void> {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    await onConfirmSelection(ids);
    setSelectedIds(new Set());
  }

  const isPreviewableType = (asset: AssetSummaryView): boolean =>
    asset.sourceKind === "FILE" && (asset.type === "IMAGE" || asset.type === "VIDEO");

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && handleClose()} open={isOpen}>
      <DialogContent className="flex max-h-[85vh] flex-col rounded-[28px] border-border bg-background p-0" size="wide">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-semibold">
            {projectName ? `${projectName}에 에셋 연결` : "프로젝트에 에셋 연결"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col space-y-4 px-6 py-5">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="에셋 제목이나 파일명으로 검색"
              className="pl-9"
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="에셋 제목이나 파일명으로 검색"
              value={searchQuery}
            />
          </div>

          {errorMessage ? (
            <div className="shrink-0 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-1">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                에셋 목록을 불러오는 중입니다.
              </div>
            ) : assets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                연결할 수 있는 에셋이 없습니다.
              </div>
            ) : (
              assets.map((asset) => {
                const isAlreadyLinked = linkedAssetIds.includes(asset.id);
                const isSelected = selectedIds.has(asset.id);
                const isClickable = !isAlreadyLinked && !isLinking;

                return (
                  <button
                    className={cn(
                      "flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all",
                      isAlreadyLinked
                        ? "cursor-default border-border/50 bg-muted/30 opacity-60"
                        : isSelected
                          ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                          : "border-border bg-card hover:border-primary/20 hover:bg-card/80"
                    )}
                    disabled={!isClickable}
                    key={asset.id}
                    onClick={() => toggleSelection(asset.id)}
                    type="button"
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                      isAlreadyLinked
                        ? "border-muted-foreground/30 bg-muted"
                        : isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-background"
                    )}>
                      {(isSelected || isAlreadyLinked) ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : null}
                    </div>

                    {isPreviewableType(asset) ? (
                      <AssetPreviewPanel
                        assetId={asset.id}
                        sourceKind={asset.sourceKind}
                        assetType={asset.type}
                        cacheKey={asset.updatedAt}
                        className="h-12 w-16 shrink-0 rounded-xl"
                        title={asset.title}
                      />
                    ) : (
                      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <AssetTypeIcon assetType={asset.type} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{asset.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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

                    {isAlreadyLinked ? (
                      <span className="shrink-0 text-xs text-muted-foreground">이미 연결됨</span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <div className="shrink-0 border-t border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{selectedIds.size}개</span> 에셋 선택됨
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setSelectedIds(new Set())}
                  size="sm"
                  variant="ghost"
                >
                  선택 해제
                </Button>
                <Button
                  disabled={isLinking}
                  onClick={() => void handleConfirm()}
                  size="sm"
                >
                  {isLinking ? "연결 중..." : `${selectedIds.size}개 연결`}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
