import type React from "react";
import { ApiError } from "../../api/client";
import type {
  AssetStructuredTagsInput,
  AssetStructuredTagsView,
  AssetSummaryView,
  CharacterTagOptionView
} from "../../api/types";
import type { AssetTagDraftView } from "./asset-library-page-model";

interface AssetApiErrorMessages {
  badRequest?: string;
  denied?: string;
  fallback: string;
  notFound?: string;
  unauthorized?: string;
}

export function getAssetApiErrorMessage(
  error: unknown,
  messages: AssetApiErrorMessages
): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return messages.unauthorized ?? "로그인이 필요합니다.";
    }

    if (error.status === 403) {
      return messages.denied ?? "현재 권한으로는 이 에셋에 접근할 수 없습니다.";
    }

    if (error.status === 404) {
      return messages.notFound ?? "대상 에셋을 찾을 수 없습니다.";
    }

    if (error.status === 400) {
      return messages.badRequest ?? messages.fallback;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return messages.fallback;
}

export function triggerFileAccessUrlDownload(accessUrl: string): void {
  try {
    const parsed = new URL(accessUrl, window.location.origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return;
    }
  } catch {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = accessUrl;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function buildAssetPreviewUrl(assetId: number, cacheKey: string): string {
  return `/api/assets/${assetId}/preview?v=${encodeURIComponent(cacheKey)}`;
}

export function getAssetPrimaryText(asset: Pick<AssetSummaryView, "description" | "linkUrl" | "originalFileName" | "sourceKind">): string {
  if (asset.description) {
    return asset.description;
  }

  if (asset.sourceKind === "LINK") {
    return asset.linkUrl ?? asset.originalFileName;
  }

  return asset.originalFileName;
}

function isPasteableUrl(text: string): boolean {
  if (text.length === 0 || /\s/.test(text)) {
    return false;
  }
  if (!/^(https?:\/\/|www\.)/i.test(text)) {
    return false;
  }
  try {
    const normalized = /^https?:\/\//i.test(text) ? text : `https://${text}`;
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function handleMarkdownLinkPaste(
  event: React.ClipboardEvent<HTMLTextAreaElement>,
  setValue: (next: string) => void
): void {
  const textarea = event.currentTarget;
  const { selectionStart, selectionEnd, value } = textarea;

  if (selectionStart === null || selectionEnd === null || selectionStart === selectionEnd) {
    return;
  }

  const clipboardText = event.clipboardData.getData("text/plain").trim();
  if (!isPasteableUrl(clipboardText)) {
    return;
  }

  event.preventDefault();

  const selectedText = value.slice(selectionStart, selectionEnd);
  const wrapped = `[${selectedText}](${clipboardText})`;
  const nextValue = value.slice(0, selectionStart) + wrapped + value.slice(selectionEnd);

  setValue(nextValue);

  const cursorPos = selectionStart + wrapped.length;
  queueMicrotask(() => {
    textarea.setSelectionRange(cursorPos, cursorPos);
  });
}

export function openAssetExternalLink(linkUrl: string): void {
  try {
    const parsed = new URL(linkUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return;
    }
  } catch {
    return;
  }

  window.open(linkUrl, "_blank", "noopener,noreferrer");
}

export function flattenAssetTags(tags: AssetStructuredTagsView): string[] {
  return [...tags.characters, ...tags.locations, ...tags.keywords];
}

export function normalizeTagValue(value: string): string | null {
  const normalizedValue = value.normalize("NFC").trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function commitPendingTagInputs<T extends AssetTagDraftView>(draft: T): T {
  const nextLocations = appendPendingTagValue(draft.locations, draft.locationInput);
  const nextKeywords = appendPendingTagValue(draft.keywords, draft.keywordInput);

  return {
    ...draft,
    keywordInput: "",
    keywords: nextKeywords,
    locationInput: "",
    locations: nextLocations
  };
}

export function toggleCharacterTagId(
  currentCharacterTagIds: number[],
  characterTagId: number
): number[] {
  return currentCharacterTagIds.includes(characterTagId)
    ? currentCharacterTagIds.filter((currentId) => currentId !== characterTagId)
    : [...currentCharacterTagIds, characterTagId];
}

export function assetTagDraftToInput(draft: AssetTagDraftView): AssetStructuredTagsInput {
  const resolvedDraft = commitPendingTagInputs(draft);

  return {
    characterTagIds: resolvedDraft.characterTagIds,
    locations: resolvedDraft.locations,
    keywords: resolvedDraft.keywords
  };
}

export function findSelectedCharacterTagIds(
  tags: AssetStructuredTagsView,
  characterOptions: CharacterTagOptionView[]
): number[] {
  const normalizedNames = new Set(tags.characters.map((characterName) => characterName.normalize("NFC").trim()));
  return characterOptions
    .filter((option) => normalizedNames.has(option.name.normalize("NFC").trim()))
    .map((option) => option.id);
}

function appendPendingTagValue(values: string[], inputValue: string): string[] {
  const normalizedValue = normalizeTagValue(inputValue);
  if (!normalizedValue || values.includes(normalizedValue)) {
    return values;
  }

  return [...values, normalizedValue];
}

export async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<unknown>
): Promise<PromiseSettledResult<unknown>[]> {
  if (items.length === 0) {
    return [];
  }

  let nextIndex = 0;
  const workerCount = Math.min(concurrency, items.length);
  const results: PromiseSettledResult<unknown>[] = Array.from({ length: items.length });

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;

        try {
          const value = await worker(items[currentIndex]);
          results[currentIndex] = {
            status: "fulfilled",
            value
          };
        } catch (error: unknown) {
          results[currentIndex] = {
            reason: error,
            status: "rejected"
          };
        }
      }
    })
  );

  return results;
}
