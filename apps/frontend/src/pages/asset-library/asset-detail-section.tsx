import type React from "react";
import {
  FileAudio2,
  FileImage,
  FileText,
  Film,
  Link2,
  Sparkles,
  Tag
} from "lucide-react";
import type { AssetSummaryView } from "../../api/types";
import { cn } from "../../lib/utils";

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
    case "DOCUMENT":
      return <FileText className={iconClassName} />;
    case "URL":
      return <Link2 className={iconClassName} />;
    case "VIDEO":
      return <Film className={iconClassName} />;
    default:
      return <Sparkles className={iconClassName} />;
  }
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
