import type React from "react";
import {
  FileAudio2,
  FileImage,
  FileText,
  Film,
  Sparkles,
  Tag
} from "lucide-react";
import type { AssetDetailView, AssetSummaryView } from "../../api/types";
import { cn } from "../../lib/utils";
import { statusLabelMap } from "./asset-detail-model";

export function AssetTypeIcon({
  assetType,
  className
}: {
  assetType: AssetSummaryView["type"];
  className?: string;
}): React.JSX.Element {
  const iconClassName = cn("h-5 w-5", className);

  switch (assetType) {
    case "AUDIO":
      return <FileAudio2 className={iconClassName} />;
    case "IMAGE":
      return <FileImage className={iconClassName} />;
    case "SCENARIO":
    case "DOCUMENT":
      return <FileText className={iconClassName} />;
    case "VIDEO":
      return <Film className={iconClassName} />;
    default:
      return <Sparkles className={iconClassName} />;
  }
}

export function AssetStatusChip({
  status,
  className
}: {
  status: AssetDetailView["status"];
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700",
        className
      )}
    >
      {statusLabelMap[status]}
    </span>
  );
}

export function AssetTagChip({
  tag,
  className
}: {
  tag: string;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground",
        className
      )}
    >
      <Tag className="h-3 w-3 text-muted-foreground" />
      {tag}
    </span>
  );
}

export function AssetDataField({
  label,
  value,
  className,
  labelClassName,
  valueClassName
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}): React.JSX.Element {
  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("text-[12px] text-muted-foreground", labelClassName)}>{label}</p>
      <div className={cn("text-[14px] font-medium leading-6 text-foreground", valueClassName)}>{value}</div>
    </div>
  );
}

