import { Search } from "lucide-react";
import type React from "react";
import type { AssetSummaryView } from "../../api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { formatFileSize, typeLabelMap } from "../asset-library/asset-detail-model";

interface HubEpisodeAssetPickerModalProps {
  assets: AssetSummaryView[];
  errorMessage: string | null;
  isLoading: boolean;
  isOpen: boolean;
  linkedAssetIds: number[];
  onClose: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectAsset: (assetId: number) => Promise<void>;
  searchQuery: string;
  slotName: string | null;
}

export function HubEpisodeAssetPickerModal({
  assets,
  errorMessage,
  isLoading,
  isOpen,
  linkedAssetIds,
  onClose,
  onSearchQueryChange,
  onSelectAsset,
  searchQuery,
  slotName
}: HubEpisodeAssetPickerModalProps): React.JSX.Element | null {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog onOpenChange={(nextOpen) => !nextOpen && onClose()} open={isOpen}>
      <DialogContent className="rounded-[28px] border-border bg-background p-0" size="wide">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle className="text-lg font-semibold">
            {slotName ? `${slotName} 슬롯에 기존 에셋 연결` : "기존 에셋 연결"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="relative">
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
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="max-h-[420px] space-y-2 overflow-y-auto pb-1">
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

                return (
                  <div
                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-4"
                    key={asset.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{asset.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{typeLabelMap[asset.type]}</span>
                        <span>&bull;</span>
                        <span>{asset.originalFileName}</span>
                        {asset.fileSizeBytes > 0 ? (
                          <>
                            <span>&bull;</span>
                            <span>{formatFileSize(asset.fileSizeBytes)}</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      disabled={isAlreadyLinked}
                      onClick={() => void onSelectAsset(asset.id)}
                      size="sm"
                      variant="outline"
                    >
                      {isAlreadyLinked ? "이미 연결됨" : "연결"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
