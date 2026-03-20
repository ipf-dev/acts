import { useEffect, useState } from "react";
import type React from "react";
import { Film } from "lucide-react";
import type { AssetSummaryView } from "../../dashboard-types";
import { cn } from "../../lib/utils";
import { buildAssetPreviewUrl } from "./asset-library-utils";
import { AssetTypeIcon } from "./asset-detail-section";

interface AssetPreviewPanelProps {
  assetId: number;
  assetType: AssetSummaryView["type"];
  cacheKey: string;
  className?: string;
  imageClassName?: string;
  title: string;
}

export function AssetPreviewPanel({
  assetId,
  assetType,
  cacheKey,
  className,
  imageClassName,
  title
}: AssetPreviewPanelProps): React.JSX.Element {
  const [hasPreviewError, setHasPreviewError] = useState(false);
  const isPreviewable = assetType === "IMAGE" || assetType === "VIDEO";

  useEffect(() => {
    setHasPreviewError(false);
  }, [assetId, assetType, cacheKey]);

  if (!isPreviewable || hasPreviewError) {
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
        className={cn("h-full w-full object-cover", imageClassName)}
        onError={() => setHasPreviewError(true)}
        src={buildAssetPreviewUrl(assetId, cacheKey)}
      />
      {assetType === "VIDEO" ? (
        <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm">
          <Film className="h-3.5 w-3.5" />
          썸네일
        </div>
      ) : null}
    </div>
  );
}
