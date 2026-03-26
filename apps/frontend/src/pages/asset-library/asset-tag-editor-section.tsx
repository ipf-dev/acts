import { useRef } from "react";
import type React from "react";
import { Check, ChevronDown, MapPin, Plus, Tags, UserRound, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import type {
  AssetTagOptionCatalogView,
  AssetTagValueOptionView,
  CharacterTagOptionView
} from "../../api/types";
import { suggestTagValues } from "../../lib/asset-tag-search/utils";
import { cn } from "../../lib/utils";
import type { AssetTagDraftView } from "./asset-library-page-model";

export type AssetTagCollectionKey = "locations" | "keywords";
export type AssetTagInputKey = "locationInput" | "keywordInput";

interface AssetTagEditorProps {
  characterOptions: CharacterTagOptionView[];
  className?: string;
  onAddTag: (collectionKey: AssetTagCollectionKey, explicitValue?: string) => void;
  onCharacterToggle: (characterTagId: number) => void;
  onRemoveTag: (collectionKey: AssetTagCollectionKey, value: string) => void;
  onTagInputChange: (inputKey: AssetTagInputKey, value: string) => void;
  tagOptions?: AssetTagOptionCatalogView;
  value: AssetTagDraftView;
}

const tagTypeConfig = {
  keywords: {
    chipTone: "bg-[#efe7ff] text-[#6d4ae2]",
    icon: Tags,
    inputKey: "keywordInput" as const,
    label: "키워드",
    placeholder: "키워드 입력 또는 검색"
  },
  locations: {
    chipTone: "bg-[#eaf7ef] text-[#247a47]",
    icon: MapPin,
    inputKey: "locationInput" as const,
    label: "장소",
    placeholder: "장소 입력 또는 검색"
  }
};

export function AssetTagEditor({
  characterOptions,
  className,
  onAddTag,
  onCharacterToggle,
  onRemoveTag,
  onTagInputChange,
  tagOptions,
  value
}: AssetTagEditorProps): React.JSX.Element {
  const compositionStateRef = useRef<Record<AssetTagInputKey, boolean>>({
    keywordInput: false,
    locationInput: false
  });
  const pendingEnterRef = useRef<Record<AssetTagInputKey, AssetTagCollectionKey | null>>({
    keywordInput: null,
    locationInput: null
  });
  const selectedCharacterNames = characterOptions
    .filter((option) => value.characterTagIds.includes(option.id))
    .map((option) => option.name);
  const characterTriggerLabel =
    selectedCharacterNames.length > 0 ? selectedCharacterNames.join(", ") : "캐릭터를 선택하세요";

  function handleTagInputKeyDown(
    collectionKey: AssetTagCollectionKey,
    inputKey: AssetTagInputKey,
    event: React.KeyboardEvent<HTMLInputElement>
  ): void {
    if (event.key !== "Enter") {
      return;
    }

    const nativeEvent = event.nativeEvent as KeyboardEvent;
    const isComposing =
      compositionStateRef.current[inputKey] ||
      nativeEvent.isComposing ||
      nativeEvent.keyCode === 229;

    if (isComposing) {
      pendingEnterRef.current[inputKey] = collectionKey;
      return;
    }

    event.preventDefault();
    onAddTag(collectionKey);
  }

  function handleTagInputCompositionStart(inputKey: AssetTagInputKey): void {
    compositionStateRef.current[inputKey] = true;
  }

  function handleTagInputCompositionEnd(inputKey: AssetTagInputKey): void {
    compositionStateRef.current[inputKey] = false;
    const pendingCollectionKey = pendingEnterRef.current[inputKey];
    if (!pendingCollectionKey) {
      return;
    }

    pendingEnterRef.current[inputKey] = null;
    window.requestAnimationFrame(() => onAddTag(pendingCollectionKey));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium">캐릭터 이름</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-11 w-full items-center justify-between rounded-2xl border border-border bg-background px-4 text-left text-sm shadow-sm transition-colors hover:border-primary/30"
              type="button"
            >
              <span className="flex min-w-0 items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" />
                <span className="truncate text-foreground">{characterTriggerLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[320px]">
            <DropdownMenuLabel>캐릭터 이름</DropdownMenuLabel>
            {characterOptions.length > 0 ? (
              characterOptions.map((option) => {
                const isChecked = value.characterTagIds.includes(option.id);

                return (
                  <DropdownMenuCheckboxItem
                    checked={isChecked}
                    key={option.id}
                    onCheckedChange={() => onCharacterToggle(option.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 items-center justify-center rounded border border-border bg-background text-primary",
                          isChecked ? "border-primary bg-primary text-primary-foreground" : ""
                        )}
                      >
                        {isChecked ? <Check className="h-3 w-3" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{option.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {option.aliases.length > 0 ? `alias: ${option.aliases.join(", ")}` : "alias 없음"}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">등록된 캐릭터가 없습니다.</div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {(Object.keys(tagTypeConfig) as AssetTagCollectionKey[]).map((collectionKey) => {
        const config = tagTypeConfig[collectionKey];
        const Icon = config.icon;
        const tags = value[collectionKey];
        const suggestions = suggestTagValues(
          tagOptions?.[collectionKey] ?? [],
          value[config.inputKey],
          tags
        );

        return (
          <div className="space-y-2" key={collectionKey}>
            <p className="text-sm font-medium">{config.label}</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                    config.chipTone
                  )}
                  key={`${collectionKey}-${tag}`}
                  onClick={() => onRemoveTag(collectionKey, tag)}
                  type="button"
                >
                  <Icon className="h-3 w-3" />
                  {tag}
                  <X className="h-3 w-3" />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-2.5 py-2 shadow-sm transition-colors focus-within:border-primary/30">
                <div className="min-w-0 flex-1">
                  <Input
                    className="h-8 min-w-0 border-0 bg-transparent px-2 py-0 shadow-none focus-visible:ring-0"
                    onChange={(event) => onTagInputChange(config.inputKey, event.target.value)}
                    onCompositionEnd={() => handleTagInputCompositionEnd(config.inputKey)}
                    onCompositionStart={() => handleTagInputCompositionStart(config.inputKey)}
                    onKeyDown={(event) => handleTagInputKeyDown(collectionKey, config.inputKey, event)}
                    placeholder={config.placeholder}
                    value={value[config.inputKey]}
                  />
                </div>
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
                  onClick={() => onAddTag(collectionKey)}
                  type="button"
                >
                  <Plus className="h-3 w-3" />
                  추가
                </button>
              </div>

              {suggestions.length > 0 ? (
                <TagSuggestionList
                  icon={<Icon className="h-3 w-3" />}
                  label={`${config.label} 추천`}
                  onSelect={(suggestedValue) => onAddTag(collectionKey, suggestedValue)}
                  suggestions={suggestions}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TagSuggestionList({
  icon,
  label,
  onSelect,
  suggestions
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: (value: string) => void;
  suggestions: AssetTagValueOptionView[];
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-background p-2 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="space-y-1">
        {suggestions.map((suggestion) => (
          <button
            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted"
            key={suggestion.value}
            onClick={() => onSelect(suggestion.value)}
            type="button"
          >
            <span className="truncate text-sm text-foreground">{suggestion.value}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">사용 {suggestion.usageCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
