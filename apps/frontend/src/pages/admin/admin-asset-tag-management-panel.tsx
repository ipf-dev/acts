import { useRef, useState } from "react";
import type React from "react";
import {
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PencilLine,
  Search,
  Tags,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import type {
  AdminAssetTagCatalogView,
  AdminAssetTagValueView,
  AssetTagTypeView,
  CharacterTagUpsertInput
} from "../../api/types";
import {
  filterTagValuesByQuery,
  paginateItems,
  sortTagValuesByUsage
} from "../../lib/asset-tag-search/utils";
import { normalizeTagValue } from "../asset-library/asset-library-utils";

type ManagedAssetTagTypeView = "LOCATION" | "KEYWORD";
type TagActionKind = "RENAME" | "MERGE" | "DELETE";

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

interface TagActionDialogState {
  action: TagActionKind;
  tagType: ManagedAssetTagTypeView;
  targetValue: string;
  value: string;
}

const TAG_PAGE_SIZE = 8;
const INITIAL_TAG_SEARCH: Record<ManagedAssetTagTypeView, string> = {
  KEYWORD: "",
  LOCATION: ""
};
const INITIAL_TAG_PAGE: Record<ManagedAssetTagTypeView, number> = {
  KEYWORD: 1,
  LOCATION: 1
};
const MANAGED_TAG_PANEL_DEFINITIONS: Array<{
  description: string;
  emptyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  type: ManagedAssetTagTypeView;
}> = [
  {
    description: "검색과 업로드 태그 정리를 위해 동일한 값을 병합하거나 이름을 통일할 수 있습니다.",
    emptyMessage: "아직 등록된 장소 태그가 없습니다.",
    icon: MapPin,
    title: "장소 태그",
    type: "LOCATION"
  },
  {
    description: "검색과 업로드 태그 정리를 위해 동일한 값을 병합하거나 이름을 통일할 수 있습니다.",
    emptyMessage: "아직 등록된 키워드 태그가 없습니다.",
    icon: Tags,
    title: "키워드 태그",
    type: "KEYWORD"
  }
];

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
  const [tagActionDialog, setTagActionDialog] = useState<TagActionDialogState | null>(null);
  const [tagPageByType, setTagPageByType] = useState(INITIAL_TAG_PAGE);
  const [tagSearchByType, setTagSearchByType] = useState(INITIAL_TAG_SEARCH);
  const aliasCompositionStateRef = useRef(false);
  const pendingAliasSubmitRef = useRef(false);

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

  function handleAliasKeyDown(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key !== "Enter") {
      return;
    }

    const nativeEvent = event.nativeEvent as KeyboardEvent;
    const isComposing =
      aliasCompositionStateRef.current ||
      nativeEvent.isComposing ||
      nativeEvent.keyCode === 229;

    if (isComposing) {
      pendingAliasSubmitRef.current = true;
      return;
    }

    event.preventDefault();
    handleAddAlias();
  }

  function handleAliasCompositionStart(): void {
    aliasCompositionStateRef.current = true;
  }

  function handleAliasCompositionEnd(): void {
    aliasCompositionStateRef.current = false;
    if (!pendingAliasSubmitRef.current) {
      return;
    }

    pendingAliasSubmitRef.current = false;
    window.requestAnimationFrame(() => handleAddAlias());
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

  function handleDeleteCharacterClick(characterId: number, value: string): void {
    if (!window.confirm(`"${value}" 캐릭터를 삭제하시겠습니까?`)) {
      return;
    }

    void onDeleteCharacter(characterId);
  }

  function handleTagSearchChange(tagType: ManagedAssetTagTypeView, nextQuery: string): void {
    setTagSearchByType((currentQueries) => ({
      ...currentQueries,
      [tagType]: nextQuery
    }));
    setTagPageByType((currentPages) => ({
      ...currentPages,
      [tagType]: 1
    }));
  }

  function handleTagPageChange(tagType: ManagedAssetTagTypeView, nextPage: number): void {
    setTagPageByType((currentPages) => ({
      ...currentPages,
      [tagType]: nextPage
    }));
  }

  function openTagActionDialog(
    action: TagActionKind,
    tagType: ManagedAssetTagTypeView,
    value: string
  ): void {
    setTagActionDialog({
      action,
      tagType,
      targetValue: action === "RENAME" ? value : "",
      value
    });
  }

  function closeTagActionDialog(): void {
    setTagActionDialog(null);
  }

  async function handleTagActionConfirm(): Promise<void> {
    if (!tagActionDialog) {
      return;
    }

    const normalizedTargetValue = normalizeTagValue(tagActionDialog.targetValue);

    if (tagActionDialog.action === "DELETE") {
      await onDeleteTagValue(tagActionDialog.tagType, tagActionDialog.value);
      closeTagActionDialog();
      return;
    }

    if (!normalizedTargetValue || normalizedTargetValue === tagActionDialog.value) {
      return;
    }

    if (tagActionDialog.action === "RENAME") {
      await onRenameTag(tagActionDialog.tagType, tagActionDialog.value, normalizedTargetValue);
    }

    if (tagActionDialog.action === "MERGE") {
      await onMergeTags(tagActionDialog.tagType, tagActionDialog.value, normalizedTargetValue);
    }

    closeTagActionDialog();
  }

  const sortedCharacters = [...(catalog?.characters ?? [])].sort((left, right) => {
    const usageDelta = right.usageCount - left.usageCount;
    if (usageDelta !== 0) {
      return usageDelta;
    }

    return left.name.localeCompare(right.name, "ko-KR");
  });

  return (
    <>
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
                    onCompositionEnd={handleAliasCompositionEnd}
                    onCompositionStart={handleAliasCompositionStart}
                    onKeyDown={handleAliasKeyDown}
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
              {sortedCharacters.length > 0 ? (
                sortedCharacters.map((character) => (
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
                        <Button
                          disabled={isSaving}
                          onClick={() => handleEditCharacter(character.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
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
          {MANAGED_TAG_PANEL_DEFINITIONS.map((panelDefinition) => (
            <ManagedTagValuePanel
              description={panelDefinition.description}
              emptyMessage={panelDefinition.emptyMessage}
              icon={panelDefinition.icon}
              isSaving={isSaving}
              items={panelDefinition.type === "LOCATION" ? catalog?.locations ?? [] : catalog?.keywords ?? []}
              key={panelDefinition.type}
              onDelete={(value) => openTagActionDialog("DELETE", panelDefinition.type, value)}
              onMerge={(value) => openTagActionDialog("MERGE", panelDefinition.type, value)}
              onPageChange={(nextPage) => handleTagPageChange(panelDefinition.type, nextPage)}
              onRename={(value) => openTagActionDialog("RENAME", panelDefinition.type, value)}
              onSearchChange={(nextQuery) => handleTagSearchChange(panelDefinition.type, nextQuery)}
              page={tagPageByType[panelDefinition.type]}
              searchQuery={tagSearchByType[panelDefinition.type]}
              title={panelDefinition.title}
            />
          ))}
        </div>
      </div>

      <TagActionDialog
        isSaving={isSaving}
        onClose={closeTagActionDialog}
        onConfirm={() => void handleTagActionConfirm()}
        onTargetValueChange={(nextValue) =>
          setTagActionDialog((currentDialog) =>
            currentDialog
              ? {
                  ...currentDialog,
                  targetValue: nextValue
                }
              : currentDialog
          )
        }
        state={tagActionDialog}
      />
    </>
  );
}

function ManagedTagValuePanel({
  description,
  emptyMessage,
  icon: Icon,
  isSaving,
  items,
  onDelete,
  onMerge,
  onPageChange,
  onRename,
  onSearchChange,
  page,
  searchQuery,
  title
}: {
  description: string;
  emptyMessage: string;
  icon: React.ComponentType<{ className?: string }>;
  isSaving: boolean;
  items: AdminAssetTagValueView[];
  onDelete: (value: string) => void;
  onMerge: (value: string) => void;
  onPageChange: (page: number) => void;
  onRename: (value: string) => void;
  onSearchChange: (query: string) => void;
  page: number;
  searchQuery: string;
  title: string;
}): React.JSX.Element {
  const sortedItems = sortTagValuesByUsage(items);
  const filteredItems = filterTagValuesByQuery(sortedItems, searchQuery);
  const pagination = paginateItems(filteredItems, page, TAG_PAGE_SIZE);
  const currentPageNumbers = buildPageNumbers(pagination.page, pagination.totalPages);
  const hasActiveSearch = normalizeTagValue(searchQuery) !== null;

  return (
    <Card className="rounded-[24px] border-border shadow-none">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4" />
              {title}
            </CardTitle>
            <p className="text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">전체 {items.length}</Badge>
            <Badge variant="outline">사용 횟수 순</Badge>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-xl border-0 bg-muted pl-10 shadow-none"
              disabled={isSaving}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={`${title} 검색`}
              value={searchQuery}
            />
          </div>
          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {hasActiveSearch ? `검색 결과 ${filteredItems.length}개` : `검색`}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pagination.items.length > 0 ? (
          <>
            <div className="space-y-3">
              {pagination.items.map((item) => (
                <article
                  className="rounded-[22px] border border-border bg-background px-4 py-4"
                  key={`${item.type}-${item.value}`}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.value}</p>
                        <Badge variant="secondary">사용 {item.usageCount}</Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        className="rounded-xl"
                        disabled={isSaving}
                        onClick={() => onRename(item.value)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        수정
                      </Button>
                      <Button
                        className="rounded-xl"
                        disabled={isSaving}
                        onClick={() => onMerge(item.value)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        병합
                      </Button>
                      <Button
                        className="rounded-xl"
                        disabled={isSaving}
                        onClick={() => onDelete(item.value)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        삭제
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination.totalItems}개 중 {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)}개 표시
              </p>
              <div className="flex items-center gap-1">
                <Button
                  className="rounded-xl"
                  disabled={isSaving || pagination.page === 1}
                  onClick={() => onPageChange(pagination.page - 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="h-4 w-4" />
                  이전
                </Button>
                {currentPageNumbers.map((pageNumber) => (
                  <Button
                    className="min-w-9 rounded-xl px-3"
                    key={pageNumber}
                    onClick={() => onPageChange(pageNumber)}
                    size="sm"
                    type="button"
                    variant={pageNumber === pagination.page ? "default" : "outline"}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  className="rounded-xl"
                  disabled={isSaving || pagination.page === pagination.totalPages}
                  onClick={() => onPageChange(pagination.page + 1)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  다음
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-background px-4 py-8 text-sm text-muted-foreground">
            {hasActiveSearch ? "검색 조건에 맞는 태그가 없습니다." : emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TagActionDialog({
  isSaving,
  onClose,
  onConfirm,
  onTargetValueChange,
  state
}: {
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onTargetValueChange: (nextValue: string) => void;
  state: TagActionDialogState | null;
}): React.JSX.Element {
  const isOpen = state !== null;
  const normalizedTargetValue = normalizeTagValue(state?.targetValue ?? "");
  const isActionReady =
    state?.action === "DELETE" || (!!normalizedTargetValue && normalizedTargetValue !== state?.value);

  return (
    <Dialog onOpenChange={(open) => (!open ? onClose() : undefined)} open={isOpen}>
      <DialogContent
        className="overflow-hidden rounded-[24px] border border-border bg-background p-0 shadow-[0_24px_80px_rgba(15,23,42,0.20)]"
        size="form"
        showCloseButton={false}
      >
        {state ? (
          <div className="p-6">
            <DialogHeader className="space-y-3 pr-10 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle className="text-[18px] leading-tight">{getTagActionTitle(state)}</DialogTitle>
                  <DialogDescription className="mt-2 leading-6">
                    {getTagActionDescription(state)}
                  </DialogDescription>
                </div>

                <DialogClose
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  type="button"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">닫기</span>
                </DialogClose>
              </div>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-border bg-muted/25 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">현재 태그</p>
                <p className="mt-2 text-[15px] font-semibold text-foreground">{state.value}</p>
              </div>

              {state.action !== "DELETE" ? (
                <div className="rounded-[20px] border border-border bg-background px-4 py-4">
                  <p className="text-sm font-medium text-foreground">
                    {state.action === "RENAME" ? "새 태그 이름" : "병합 대상 태그"}
                  </p>
                  <Input
                    autoFocus
                    className="mt-3 h-11 rounded-xl border-border bg-background"
                    disabled={isSaving}
                    onChange={(event) => onTargetValueChange(event.target.value)}
                    placeholder={state.action === "RENAME" ? "새 이름을 입력하세요" : "합칠 대상 태그를 입력하세요"}
                    value={state.targetValue}
                  />
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {state.action === "RENAME"
                      ? "기존 태그 값을 새 이름으로 일괄 정리합니다."
                      : "병합하면 현재 태그가 대상 태그로 합쳐지고 중복 태그는 자동으로 정리됩니다."}
                  </p>
                </div>
              ) : (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                  이 작업은 현재 태그를 에셋 메타데이터와 검색 인덱스에서 제거합니다.
                </div>
              )}
            </div>

            <DialogFooter className="mt-6 border-t border-border pt-4 sm:justify-end">
              <Button
                className="h-10 rounded-xl sm:min-w-24"
                disabled={isSaving}
                onClick={onClose}
                type="button"
                variant="ghost"
              >
                취소
              </Button>
              <Button
                className="h-10 rounded-xl sm:min-w-24"
                disabled={isSaving || !isActionReady}
                onClick={onConfirm}
                type="button"
                variant={state.action === "DELETE" ? "destructive" : "default"}
              >
                {isSaving ? "처리 중..." : getTagActionConfirmLabel(state)}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function buildPageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.min(Math.max(page - 2, 1), totalPages - 4);
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function getTagActionTitle(state: TagActionDialogState): string {
  switch (state.action) {
    case "RENAME":
      return "태그 이름 수정";
    case "MERGE":
      return "태그 병합";
    case "DELETE":
      return "태그 삭제";
  }
}

function getTagActionDescription(state: TagActionDialogState): string {
  const tagLabel = state.tagType === "LOCATION" ? "장소 태그" : "키워드 태그";

  switch (state.action) {
    case "RENAME":
      return `${tagLabel}의 이름을 바꿔 업로드/검색 기준을 통일합니다.`;
    case "MERGE":
      return `${tagLabel}를 다른 값으로 합쳐서 중복 태그를 정리합니다.`;
    case "DELETE":
      return `${tagLabel}를 더 이상 사용하지 않을 때 삭제합니다.`;
  }
}

function getTagActionConfirmLabel(state: TagActionDialogState): string {
  switch (state.action) {
    case "RENAME":
      return "수정 적용";
    case "MERGE":
      return "병합 적용";
    case "DELETE":
      return "삭제";
  }
}
