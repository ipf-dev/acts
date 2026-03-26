import type React from "react";
import { Check, ChevronDown, MapPin, Tags, UserRound, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import type { CharacterTagOptionView } from "../../api/types";
import { cn } from "../../lib/utils";
import type { AssetTagDraftView } from "./asset-library-page-model";

export type AssetTagCollectionKey = "locations" | "keywords";
export type AssetTagInputKey = "locationInput" | "keywordInput";

interface AssetTagEditorProps {
  characterOptions: CharacterTagOptionView[];
  className?: string;
  onAddTag: (collectionKey: AssetTagCollectionKey) => void;
  onCharacterToggle: (characterTagId: number) => void;
  onRemoveTag: (collectionKey: AssetTagCollectionKey, value: string) => void;
  onTagInputChange: (inputKey: AssetTagInputKey, value: string) => void;
  value: AssetTagDraftView;
}

const tagTypeConfig = {
  keywords: {
    chipTone: "bg-[#efe7ff] text-[#6d4ae2]",
    icon: Tags,
    inputKey: "keywordInput" as const,
    label: "키워드",
    placeholder: "키워드 추가"
  },
  locations: {
    chipTone: "bg-[#eaf7ef] text-[#247a47]",
    icon: MapPin,
    inputKey: "locationInput" as const,
    label: "장소",
    placeholder: "장소 추가"
  }
};

export function AssetTagEditor({
  characterOptions,
  className,
  onAddTag,
  onCharacterToggle,
  onRemoveTag,
  onTagInputChange,
  value
}: AssetTagEditorProps): React.JSX.Element {
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
                <span className="truncate text-foreground">
                  {value.characterTagIds.length > 0
                    ? `${value.characterTagIds.length}명 선택됨`
                    : "캐릭터를 선택하세요"}
                </span>
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
            <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm">
              <Input
                className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                onChange={(event) => onTagInputChange(config.inputKey, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onAddTag(collectionKey);
                  }
                }}
                placeholder={config.placeholder}
                value={value[config.inputKey]}
              />
              <button
                className="text-xs font-medium text-primary"
                onClick={() => onAddTag(collectionKey)}
                type="button"
              >
                추가
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
