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

const URL_CHAR_CLASS = "A-Za-z0-9\\-._~:/?#\\[\\]@!$&'()*+,;=%";
const PLAIN_URL_SOURCE = `(?:https?:\\/\\/|www\\.)[${URL_CHAR_CLASS}]+`;
const MARKDOWN_LINK_SOURCE = `\\[([^\\]\\n]+)\\]\\((https?:\\/\\/[^\\s)]+|www\\.[^\\s)]+)\\)`;
const LINK_PATTERN = new RegExp(`${MARKDOWN_LINK_SOURCE}|(${PLAIN_URL_SOURCE})`, "gi");
const URL_TRAILING_PUNCTUATION = /[.,!?;:]+$/;

function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function splitPlainUrl(rawUrl: string): { url: string; trailing: string } {
  let url = rawUrl;
  let trailing = "";

  const punctuationMatch = url.match(URL_TRAILING_PUNCTUATION);
  if (punctuationMatch) {
    trailing = punctuationMatch[0];
    url = url.slice(0, url.length - trailing.length);
  }

  while (url.endsWith(")")) {
    const openCount = (url.match(/\(/g) ?? []).length;
    const closeCount = (url.match(/\)/g) ?? []).length;
    if (closeCount <= openCount) {
      break;
    }
    trailing = `)${trailing}`;
    url = url.slice(0, -1);
  }

  return { url, trailing };
}

export function AssetDescriptionText({
  text,
  className
}: {
  text: string;
  className?: string;
}): React.JSX.Element {
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const matchStart = match.index ?? 0;
    const matchEnd = matchStart + match[0].length;

    if (matchStart > lastIndex) {
      segments.push(text.slice(lastIndex, matchStart));
    }

    const markdownLabel = match[1];
    const markdownUrl = match[2];
    const plainUrl = match[3];

    if (markdownLabel !== undefined && markdownUrl !== undefined) {
      segments.push(
        <a
          key={`${matchStart}-md`}
          className="text-primary underline underline-offset-2 hover:opacity-80"
          href={toHref(markdownUrl)}
          rel="noopener noreferrer"
          target="_blank"
        >
          {markdownLabel}
        </a>
      );
    } else if (plainUrl !== undefined) {
      const { url, trailing } = splitPlainUrl(plainUrl);
      segments.push(
        <a
          key={`${matchStart}-plain`}
          className="text-primary underline underline-offset-2 hover:opacity-80"
          href={toHref(url)}
          rel="noopener noreferrer"
          target="_blank"
        >
          {url}
        </a>
      );
      if (trailing) {
        segments.push(trailing);
      }
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return (
    <p className={cn("whitespace-pre-wrap break-words text-sm leading-7 text-foreground", className)}>
      {segments}
    </p>
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
