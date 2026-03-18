import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  Clock3,
  FileAudio2,
  FileImage,
  FileText,
  Film,
  Grid2x2,
  List,
  RotateCcw,
  Search,
  Sparkles
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import type { AssetDetailView, AssetSummaryView, AuthSessionView } from "../../dashboard-types";
import { isBlank } from "../../lib/utils";
import { AssetDetailModal } from "./asset-detail-modal";
import { AssetUploadModal } from "./asset-upload-modal";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetLibraryPageProps {
  assetDetail: AssetDetailView | null;
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isAssetDetailLoading: boolean;
  isLoading: boolean;
  isUploading: boolean;
  onCloseAssetDetail: () => void;
  onOpenAssetDetail: (assetId: number) => void;
  onOpenAssetPage: (assetId: number) => void;
  onSearchQueryChange: (value: string) => void;
  onUploadAssets: (drafts: AssetUploadDraftView[]) => Promise<void>;
  searchQuery: string;
  session: AuthSessionView;
}

type AssetLibraryLayoutMode = "grid" | "list";

const cardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

export function AssetLibraryPage({
  assetDetail,
  assets,
  authErrorMessage,
  authSuccessMessage,
  isAssetDetailLoading,
  isLoading,
  isUploading,
  onCloseAssetDetail,
  onOpenAssetDetail,
  onOpenAssetPage,
  onSearchQueryChange,
  onUploadAssets,
  searchQuery,
  session
}: AssetLibraryPageProps): React.JSX.Element {
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [drafts, setDrafts] = useState<AssetUploadDraftView[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<AssetLibraryLayoutMode>("grid");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const draftsRef = useRef<AssetUploadDraftView[]>([]);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => {
        if (draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
      });
    };
  }, []);

  const creatorOptions = Array.from(new Set(assets.map((asset) => asset.ownerName))).sort((left, right) =>
    left.localeCompare(right, "ko-KR")
  );
  const organizationOptions = Array.from(
    new Set(
      assets
        .map((asset) => asset.organizationName)
        .filter((organizationName): organizationName is string => Boolean(organizationName))
    )
  ).sort((left, right) => left.localeCompare(right, "ko-KR"));
  const normalizedTerms = deferredSearchQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const visibleAssets = assets.filter((asset) => {
    const searchable = [
      asset.title,
      asset.description ?? "",
      asset.originalFileName,
      asset.ownerName,
      asset.organizationName ?? "",
      ...asset.tags
    ]
      .join(" ")
      .toLowerCase();

    if (normalizedTerms.some((term) => !searchable.includes(term))) {
      return false;
    }

    if (typeFilter !== "ALL" && asset.type !== typeFilter) {
      return false;
    }

    if (statusFilter !== "ALL" && asset.status !== statusFilter) {
      return false;
    }

    if (organizationFilter !== "ALL" && asset.organizationName !== organizationFilter) {
      return false;
    }

    if (creatorFilter !== "ALL" && asset.ownerName !== creatorFilter) {
      return false;
    }

    return true;
  });
  const hasActiveFilters =
    !isBlank(searchQuery) ||
    typeFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    organizationFilter !== "ALL" ||
    creatorFilter !== "ALL";

  async function handleFileDrop(files: File[]): Promise<void> {
    const nextDrafts = await Promise.all(files.map((file) => createDraftFromFile(file)));

    setDrafts((currentDrafts) => {
      const existingNames = new Set(currentDrafts.map((draft) => `${draft.file.name}:${draft.file.size}`));
      const uniqueDrafts = nextDrafts.filter((draft) => {
        const isDuplicate = existingNames.has(`${draft.file.name}:${draft.file.size}`);
        if (isDuplicate && draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
        return !isDuplicate;
      });
      return [...currentDrafts, ...uniqueDrafts];
    });
  }

  function handleRemoveDraft(draftId: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => {
        if (draft.id === draftId && draft.previewUrl) {
          URL.revokeObjectURL(draft.previewUrl);
        }
        return draft.id !== draftId;
      })
    );
  }

  function handleTitleChange(draftId: string, value: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, title: value } : draft))
    );
  }

  function handleDescriptionChange(draftId: string, value: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, description: value } : draft))
    );
  }

  function handleTagInputChange(draftId: string, value: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.id === draftId ? { ...draft, tagInput: value } : draft))
    );
  }

  function handleAddTag(draftId: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => {
        if (draft.id !== draftId) {
          return draft;
        }

        const normalizedTag = normalizeTag(draft.tagInput);
        if (!normalizedTag) {
          return draft;
        }

        return {
          ...draft,
          tagInput: "",
          tags: draft.tags.includes(normalizedTag) ? draft.tags : [...draft.tags, normalizedTag]
        };
      })
    );
  }

  function handleRemoveTag(draftId: string, tag: string): void {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId ? { ...draft, tags: draft.tags.filter((value) => value !== tag) } : draft
      )
    );
  }

  async function handleUploadSubmit(): Promise<void> {
    await onUploadAssets(drafts);
    drafts.forEach((draft) => {
      if (draft.previewUrl) {
        URL.revokeObjectURL(draft.previewUrl);
      }
    });
    setDrafts([]);
    setIsUploadModalOpen(false);
  }

  function resetFilters(): void {
    onSearchQueryChange("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setOrganizationFilter("ALL");
    setCreatorFilter("ALL");
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-[32px] font-semibold tracking-tight">자산 라이브러리</h1>
          <p className="text-sm text-muted-foreground">
            하모니 힐즈 IP 콘텐츠 애셋을 검색하고 관리하세요.
          </p>
        </div>

        {session.authenticated ? (
          <Button
            className="h-10 rounded-xl bg-primary px-4 text-sm font-medium hover:bg-primary/92"
            onClick={() => setIsUploadModalOpen(true)}
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            애셋 업로드
          </Button>
        ) : null}
      </div>

      {authSuccessMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {authSuccessMessage}
        </div>
      ) : null}

      {authErrorMessage ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {authErrorMessage}
        </div>
      ) : null}

      {!session.authenticated ? (
        <Card className="rounded-[28px] border-border shadow-none">
          <CardContent className="flex flex-col items-start gap-4 p-8">
            <Badge variant="warning">로그인 필요</Badge>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">사내 Google 계정으로 로그인하세요.</h2>
              <p className="text-sm text-muted-foreground">
                자산 업로드와 검색은 `@iportfolio.co.kr` 계정으로만 사용할 수 있습니다.
              </p>
            </div>
            <Button asChild className="h-10 rounded-xl px-4">
              <a href={GOOGLE_LOGIN_PATH}>Google SSO 로그인</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-[24px] border-border shadow-none">
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_repeat(4,minmax(0,0.36fr))_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-xl border-0 bg-muted pl-11 shadow-none"
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    placeholder="키워드로 검색... (캐릭터, 태그, 제목)"
                    value={searchQuery}
                  />
                </div>

                <Select onValueChange={setTypeFilter} value={typeFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 유형</SelectItem>
                    {assetTypeOptions.map((assetType) => (
                      <SelectItem key={assetType} value={assetType}>
                        {typeLabelMap[assetType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setStatusFilter} value={statusFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 상태</SelectItem>
                    <SelectItem value="READY">리뷰</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={setOrganizationFilter} value={organizationFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 부서" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 부서</SelectItem>
                    {organizationOptions.map((organizationName) => (
                      <SelectItem key={organizationName} value={organizationName}>
                        {organizationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={setCreatorFilter} value={creatorFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 제작자" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 제작자</SelectItem>
                    {creatorOptions.map((ownerName) => (
                      <SelectItem key={ownerName} value={ownerName}>
                        {ownerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    className={`inline-flex h-11 w-11 items-center justify-center ${
                      layoutMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setLayoutMode("grid")}
                    type="button"
                  >
                    <Grid2x2 className="h-4 w-4" />
                  </button>
                  <button
                    className={`inline-flex h-11 w-11 items-center justify-center ${
                      layoutMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setLayoutMode("list")}
                    type="button"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>{isLoading ? "자산을 불러오는 중..." : `${visibleAssets.length}개 애셋`}</p>
                {hasActiveFilters ? (
                  <Button
                    className="h-8 rounded-full px-3 text-xs"
                    onClick={resetFilters}
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    필터 초기화
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {visibleAssets.length > 0 ? (
            layoutMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleAssets.map((asset) => (
                  <article
                    className="rounded-[20px] border border-border bg-card p-4 shadow-none transition-all hover:border-primary/25 hover:shadow-[0_14px_40px_rgba(17,24,39,0.06)]"
                    key={asset.id}
                  >
                    <button
                      className="block w-full text-left"
                      onClick={() => onOpenAssetDetail(asset.id)}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#f1ebff] text-[#6d4ae2]">
                          <AssetTypeIcon assetType={asset.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">
                            {typeLabelMap[asset.type]} · v{asset.versionNumber}
                          </p>
                          <h2 className="mt-1 line-clamp-1 text-[15px] font-medium">{asset.title}</h2>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-muted-foreground">
                        {asset.description ?? asset.originalFileName}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {asset.tags.slice(0, 3).map((tag) => (
                          <span
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                            key={`${asset.id}-${tag}`}
                          >
                            {tag}
                          </span>
                        ))}
                        {asset.tags.length > 3 ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
                            +{asset.tags.length - 3}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 border-t border-border pt-3">
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                          <span>{asset.ownerName}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3 w-3" />
                            {cardDateFormatter.format(new Date(asset.updatedAt))}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Badge className="rounded-full bg-emerald-100 text-emerald-700" variant="secondary">
                            {statusLabelMap[asset.status]}
                          </Badge>
                          <span className="text-[12px] text-muted-foreground">
                            {asset.organizationName ?? "조직 미지정"}
                          </span>
                        </div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden rounded-[24px] border-border shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/70 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">애셋명</th>
                          <th className="px-4 py-3 font-medium">유형</th>
                          <th className="px-4 py-3 font-medium">태그</th>
                          <th className="px-4 py-3 font-medium">부서</th>
                          <th className="px-4 py-3 font-medium">제작자</th>
                          <th className="px-4 py-3 font-medium">수정일</th>
                          <th className="px-4 py-3 font-medium">버전</th>
                          <th className="px-4 py-3 font-medium">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {visibleAssets.map((asset) => (
                          <tr className="hover:bg-muted/30" key={asset.id}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1ebff] text-[#6d4ae2]">
                                  <AssetTypeIcon assetType={asset.type} />
                                </div>
                                <div className="min-w-0">
                                  <p className="line-clamp-1 font-medium">{asset.title}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {asset.description ?? asset.originalFileName}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{typeLabelMap[asset.type]}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {asset.tags.slice(0, 2).map((tag) => (
                                  <span
                                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                                    key={`${asset.id}-${tag}`}
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {asset.tags.length > 2 ? (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
                                    +{asset.tags.length - 2}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {asset.organizationName ?? "조직 미지정"}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{asset.ownerName}</td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {cardDateFormatter.format(new Date(asset.updatedAt))}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">v{asset.versionNumber}</td>
                            <td className="px-4 py-4">
                              <Button
                                className="h-8 rounded-xl px-3 text-xs"
                                onClick={() => onOpenAssetDetail(asset.id)}
                                type="button"
                                variant="outline"
                              >
                                상세 보기
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="rounded-[28px] border-border shadow-none">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ecff] text-[#6d4ae2]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {isLoading ? "자산을 불러오는 중입니다." : "조건에 맞는 자산이 없습니다."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    검색어와 필터를 조정하거나 첫 애셋을 업로드해 라이브러리를 시작하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AssetUploadModal
        drafts={drafts}
        isOpen={isUploadModalOpen && session.authenticated}
        isUploading={isUploading}
        onAddTag={handleAddTag}
        onClose={() => setIsUploadModalOpen(false)}
        onDescriptionChange={handleDescriptionChange}
        onFileDrop={handleFileDrop}
        onRemoveDraft={handleRemoveDraft}
        onRemoveTag={handleRemoveTag}
        onSubmit={handleUploadSubmit}
        onTagInputChange={handleTagInputChange}
        onTitleChange={handleTitleChange}
      />
      <AssetDetailModal
        asset={assetDetail}
        isLoading={isAssetDetailLoading}
        isOpen={Boolean(assetDetail) || isAssetDetailLoading}
        onClose={onCloseAssetDetail}
        onOpenDetailPage={onOpenAssetPage}
      />
    </section>
  );
}

function AssetTypeIcon({ assetType }: { assetType: AssetSummaryView["type"] }): React.JSX.Element {
  switch (assetType) {
    case "AUDIO":
      return <FileAudio2 className="h-5 w-5" />;
    case "IMAGE":
      return <FileImage className="h-5 w-5" />;
    case "SCENARIO":
    case "DOCUMENT":
      return <FileText className="h-5 w-5" />;
    case "VIDEO":
      return <Film className="h-5 w-5" />;
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}

async function createDraftFromFile(file: File): Promise<AssetUploadDraftView> {
  const type = inferAssetType(file);
  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
  const dimensions = previewUrl ? await readImageSize(previewUrl) : null;

  return {
    id: crypto.randomUUID(),
    file,
    formatLabel: file.type || file.name.split(".").pop()?.toUpperCase() || "UNKNOWN",
    previewUrl,
    sizeLabel: formatFileSize(file.size),
    suggestedHeight: dimensions?.height ?? null,
    suggestedWidth: dimensions?.width ?? null,
    description: "",
    tagInput: "",
    tags: createSuggestedTags(file.name, type),
    title: file.name.replace(/\.[^/.]+$/, ""),
    type
  };
}

function createSuggestedTags(fileName: string, type: AssetSummaryView["type"]): string[] {
  const tokens = fileName
    .replace(/\.[^/.]+$/, "")
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 4);

  return Array.from(new Set([typeLabelMap[type], ...tokens]));
}

function inferAssetType(file: File): AssetSummaryView["type"] {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type.startsWith("image/")) {
    return "IMAGE";
  }
  if (file.type.startsWith("video/")) {
    return "VIDEO";
  }
  if (file.type.startsWith("audio/")) {
    return "AUDIO";
  }
  if (extension && ["txt", "md", "rtf"].includes(extension)) {
    return "SCENARIO";
  }
  if (extension && ["pdf", "doc", "docx", "ppt", "pptx", "zip", "ai"].includes(extension)) {
    return "DOCUMENT";
  }
  return "OTHER";
}

function normalizeTag(value: string): string | null {
  const normalizedValue = value.trim();
  return isBlank(normalizedValue) ? null : normalizedValue;
}

function formatFileSize(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(fileSizeBytes / 1024))} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageSize(previewUrl: string): Promise<{ height: number; width: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        width: image.naturalWidth
      });
    };
    image.onerror = () => {
      resolve({
        height: 0,
        width: 0
      });
    };
    image.src = previewUrl;
  });
}

const assetTypeOptions: AssetSummaryView["type"][] = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "SCENARIO",
  "OTHER"
];

const statusLabelMap: Record<AssetSummaryView["status"], string> = {
  READY: "리뷰"
};

const typeLabelMap: Record<AssetSummaryView["type"], string> = {
  AUDIO: "오디오",
  DOCUMENT: "문서",
  IMAGE: "이미지",
  OTHER: "기타",
  SCENARIO: "시나리오",
  VIDEO: "영상"
};
