import { ApiError, type DownloadedFile } from "../../api/client";
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
      return messages.denied ?? "현재 권한으로는 이 자산에 접근할 수 없습니다.";
    }

    if (error.status === 404) {
      return messages.notFound ?? "대상 자산을 찾을 수 없습니다.";
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

export function triggerFileDownload(file: DownloadedFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
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

export function openAssetExternalLink(linkUrl: string): void {
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
