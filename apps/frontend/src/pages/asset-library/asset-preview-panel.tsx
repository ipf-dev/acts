import { useEffect, useState } from "react";
import type React from "react";
import type { AssetSourceKindView, AssetSummaryView } from "../../api/types";
import { cn } from "../../lib/utils";
import { buildAssetPreviewUrl } from "./asset-library-utils";
import { AssetTypeIcon } from "./asset-detail-section";

interface AssetPreviewPanelProps {
  assetId: number;
  sourceKind: AssetSourceKindView;
  assetType: AssetSummaryView["type"];
  cacheKey: string;
  className?: string;
  imageClassName?: string;
  title: string;
}

export function AssetPreviewPanel({
  assetId,
  sourceKind,
  assetType,
  cacheKey,
  className,
  imageClassName,
  title
}: AssetPreviewPanelProps): React.JSX.Element {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isPreviewable = sourceKind === "FILE" && (assetType === "IMAGE" || assetType === "VIDEO");
  const previewImageFitClassName = assetType === "IMAGE" ? "object-contain" : "object-cover";

  useEffect(() => {
    setHasPreviewError(false);
    setRetryCount(0);
  }, [assetId, sourceKind, assetType, cacheKey]);

  useEffect(() => {
    if (!hasPreviewError || !isPreviewable || retryCount >= 3) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasPreviewError(false);
      setRetryCount((currentRetryCount) => currentRetryCount + 1);
    }, 1500 * (retryCount + 1));

    return () => window.clearTimeout(timeoutId);
  }, [hasPreviewError, isPreviewable, retryCount]);

  if (!isPreviewable || (hasPreviewError && retryCount >= 3)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-[18px] bg-muted text-primary",
          className
        )}
      >
        <AssetTypeIcon assetType={assetType} className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-[18px] bg-muted", className)}>
      <img
        alt={title}
        className={cn("h-full w-full object-center", previewImageFitClassName, imageClassName)}
        onError={() => setHasPreviewError(true)}
        src={buildAssetPreviewUrl(assetId, `${cacheKey}-${retryCount}`)}
      />
    </div>
  );
}
