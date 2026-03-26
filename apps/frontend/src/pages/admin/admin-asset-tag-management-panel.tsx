import { useState } from "react";
import type React from "react";
import { ArrowRightLeft, MapPin, PencilLine, Tags, Trash2, UserRound } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import type {
  AdminAssetTagCatalogView,
  AdminAssetTagValueView,
  AssetTagTypeView,
  CharacterTagUpsertInput
} from "../../api/types";
import { normalizeTagValue } from "../asset-library/asset-library-utils";

interface AdminAssetTagManagementProps {
  catalog: AdminAssetTagCatalogView | null;
  isSaving: boolean;
  onCreateCharacter: (input: CharacterTagUpsertInput) => Promise<void>;
  onDeleteCharacter: (characterId: number) => Promise<void>;
  onDeleteTagValue: (tagType: AssetTagTypeView, value: string) => Promise<void>;
  onMergeTags: (tagType: AssetTagTypeView, sourceValue: string, targetValue: string) => Promise<void>;
  onRenameTag: (tagType: AssetTagTypeView, currentValue: string, nextValue: string) => Promise<void>;
  onUpdateCharacter: (characterId: number, input: CharacterTagUpsertInput) => Promise<void>;
}

export function AdminAssetTagManagement({
  catalog,
  isSaving,
  onCreateCharacter,
  onDeleteCharacter,
  onDeleteTagValue,
  onMergeTags,
  onRenameTag,
  onUpdateCharacter
}: AdminAssetTagManagementProps): React.JSX.Element {
  const [editingCharacterId, setEditingCharacterId] = useState<number | null>(null);
  const [characterName, setCharacterName] = useState("");
  const [aliasInput, setAliasInput] = useState("");
  const [aliases, setAliases] = useState<string[]>([]);

  function resetCharacterForm(): void {
    setEditingCharacterId(null);
    setCharacterName("");
    setAliasInput("");
    setAliases([]);
  }

  function handleAddAlias(): void {
    const normalizedAlias = normalizeTagValue(aliasInput);
    if (!normalizedAlias) {
      return;
    }

    setAliases((currentAliases) =>
      currentAliases.includes(normalizedAlias) ? currentAliases : [...currentAliases, normalizedAlias]
    );
    setAliasInput("");
  }

  async function handleSaveCharacter(): Promise<void> {
    const normalizedName = normalizeTagValue(characterName);
    if (!normalizedName) {
      return;
    }

    const payload = {
      aliases,
      name: normalizedName
    };

    if (editingCharacterId === null) {
      await onCreateCharacter(payload);
    } else {
      await onUpdateCharacter(editingCharacterId, payload);
    }

    resetCharacterForm();
  }

  function handleEditCharacter(characterId: number): void {
    const character = catalog?.characters.find((item) => item.id === characterId);
    if (!character) {
      return;
    }

    setEditingCharacterId(character.id);
    setCharacterName(character.name);
    setAliases(character.aliases);
    setAliasInput("");
  }

  function handleRenameClick(tagType: AssetTagTypeView, currentValue: string): void {
    const nextValue = window.prompt("새 태그 값을 입력하세요.", currentValue);
    const normalizedNextValue = normalizeTagValue(nextValue ?? "");
    if (!normalizedNextValue || normalizedNextValue === currentValue) {
      return;
    }

    void onRenameTag(tagType, currentValue, normalizedNextValue);
  }

  function handleMergeClick(tagType: AssetTagTypeView, sourceValue: string): void {
    const targetValue = window.prompt(`"${sourceValue}"를 어떤 태그로 병합할까요?`, sourceValue);
    const normalizedTargetValue = normalizeTagValue(targetValue ?? "");
    if (!normalizedTargetValue || normalizedTargetValue === sourceValue) {
      return;
    }

    void onMergeTags(tagType, sourceValue, normalizedTargetValue);
  }

  function handleDeleteCharacterClick(characterId: number, value: string): void {
    if (!window.confirm(`"${value}" 캐릭터를 삭제하시겠습니까?`)) {
      return;
    }

    void onDeleteCharacter(characterId);
  }

  function handleDeleteTagClick(tagType: AssetTagTypeView, value: string): void {
    if (!window.confirm(`"${value}" 태그를 삭제하시겠습니까?`)) {
      return;
    }

    void onDeleteTagValue(tagType, value);
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[24px] border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <UserRound className="h-4 w-4" />
            캐릭터 관리
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">캐릭터 이름</p>
              <Input
                disabled={isSaving}
                onChange={(event) => setCharacterName(event.target.value)}
                placeholder="예: 코코"
                value={characterName}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">alias</p>
              <div className="flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <button
                    className="inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-3 py-1 text-xs font-medium text-[#6d4ae2]"
                    key={alias}
                    onClick={() => setAliases((currentAliases) => currentAliases.filter((value) => value !== alias))}
                    type="button"
                  >
                    {alias}
                    <Trash2 className="h-3 w-3" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  disabled={isSaving}
                  onChange={(event) => setAliasInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddAlias();
                    }
                  }}
                  placeholder="검색용 alias 추가"
                  value={aliasInput}
                />
                <Button disabled={isSaving} onClick={handleAddAlias} type="button" variant="outline">
                  추가
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              {editingCharacterId !== null ? (
                <Button disabled={isSaving} onClick={resetCharacterForm} type="button" variant="ghost">
                  취소
                </Button>
              ) : null}
              <Button disabled={isSaving} onClick={() => void handleSaveCharacter()} type="button">
                {editingCharacterId === null ? "캐릭터 추가" : "캐릭터 저장"}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {catalog?.characters.length ? (
              catalog.characters.map((character) => (
                <article className="rounded-2xl border border-border bg-background px-4 py-3" key={character.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{character.name}</p>
                        <Badge variant="secondary">사용 {character.usageCount}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {character.aliases.length > 0 ? `alias: ${character.aliases.join(", ")}` : "alias 없음"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button disabled={isSaving} onClick={() => handleEditCharacter(character.id)} size="sm" type="button" variant="outline">
                        편집
                      </Button>
                      <Button
                        disabled={isSaving}
                        onClick={() => handleDeleteCharacterClick(character.id, character.name)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
                등록된 캐릭터가 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <TagValuePanel
          description="업로드 시 자유롭게 추가되며, 관리자가 병합·수정·삭제할 수 있습니다."
          icon={MapPin}
          isSaving={isSaving}
          items={catalog?.locations ?? []}
          onDelete={handleDeleteTagClick}
          onMerge={handleMergeClick}
          onRename={handleRenameClick}
          title="장소 태그"
          type="LOCATION"
        />
        <TagValuePanel
          description="업로드 시 자유롭게 추가되며, 검색 시 장소·캐릭터와 함께 동시 반영됩니다."
          icon={Tags}
          isSaving={isSaving}
          items={catalog?.keywords ?? []}
          onDelete={handleDeleteTagClick}
          onMerge={handleMergeClick}
          onRename={handleRenameClick}
          title="키워드 태그"
          type="KEYWORD"
        />
      </div>
    </div>
  );
}

function TagValuePanel({
  description,
  icon: Icon,
  isSaving,
  items,
  onDelete,
  onMerge,
  onRename,
  title,
  type
}: {
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isSaving: boolean;
  items: AdminAssetTagValueView[];
  onDelete: (tagType: AssetTagTypeView, value: string) => void;
  onMerge: (tagType: AssetTagTypeView, sourceValue: string) => void;
  onRename: (tagType: AssetTagTypeView, currentValue: string) => void;
  title: string;
  type: AssetTagTypeView;
}): React.JSX.Element {
  return (
    <Card className="rounded-[24px] border-border shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <article className="rounded-2xl border border-border bg-background px-4 py-3" key={`${type}-${item.value}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium">{item.value}</p>
                  <p className="text-xs text-muted-foreground">사용 {item.usageCount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button disabled={isSaving} onClick={() => onRename(type, item.value)} size="sm" type="button" variant="outline">
                    <PencilLine className="h-3.5 w-3.5" />
                    수정
                  </Button>
                  <Button disabled={isSaving} onClick={() => onMerge(type, item.value)} size="sm" type="button" variant="outline">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    병합
                  </Button>
                  <Button disabled={isSaving} onClick={() => onDelete(type, item.value)} size="sm" type="button" variant="outline">
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </Button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
            아직 등록된 태그가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
