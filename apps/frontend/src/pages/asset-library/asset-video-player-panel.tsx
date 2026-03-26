import { useEffect, useState } from "react";
import type React from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";
import { AssetPreviewPanel } from "./asset-preview-panel";
import { buildAssetPreviewUrl } from "./asset-library-utils";

interface AssetVideoPlayerPanelProps {
  assetId: number;
  cacheKey: string;
  errorMessage: string | null;
  isLoading: boolean;
  onRefreshPlaybackUrl: () => Promise<void>;
  playbackUrl: string | null;
  title: string;
}

export function AssetVideoPlayerPanel({
  assetId,
  cacheKey,
  errorMessage,
  isLoading,
  onRefreshPlaybackUrl,
  playbackUrl,
  title
}: AssetVideoPlayerPanelProps): React.JSX.Element {
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [hasRetriedAfterError, setHasRetriedAfterError] = useState(false);

  useEffect(() => {
    setHasPlaybackError(false);
    setHasRetriedAfterError(false);
  }, [assetId, playbackUrl]);

  async function handlePlaybackError(): Promise<void> {
    if (hasRetriedAfterError) {
      setHasPlaybackError(true);
      return;
    }

    setHasRetriedAfterError(true);
    await onRefreshPlaybackUrl();
  }

  return (
    <div className="space-y-3">
      {playbackUrl && !hasPlaybackError ? (
        <video
          className="aspect-[16/9] w-full rounded-[20px] bg-black object-contain"
          controls
          key={playbackUrl}
          playsInline
          poster={buildAssetPreviewUrl(assetId, cacheKey)}
          preload="metadata"
          onError={() => void handlePlaybackError()}
        >
          <source src={playbackUrl} />
          브라우저가 이 영상을 재생하지 못합니다.
        </video>
      ) : (
        <AssetPreviewPanel
          assetId={assetId}
          assetType="VIDEO"
          cacheKey={cacheKey}
          className="aspect-[16/9] w-full rounded-[20px]"
          sourceKind="FILE"
          title={title}
        />
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          영상 재생 URL을 준비하는 중입니다.
        </div>
      ) : null}

      {errorMessage || hasPlaybackError ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            {errorMessage ?? "영상 재생 URL이 만료되었거나 재생을 시작하지 못했습니다."}
          </p>
          <Button className="rounded-xl" onClick={() => void onRefreshPlaybackUrl()} type="button" variant="outline">
            <RefreshCw className="h-4 w-4" />
            재생 URL 새로고침
          </Button>
        </div>
      ) : null}
    </div>
  );
}
