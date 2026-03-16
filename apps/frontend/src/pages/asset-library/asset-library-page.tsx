import { useDeferredValue, useEffect, useRef, useState } from "react";
import {
  Clock3,
  Download,
  FileAudio2,
  FileImage,
  FileText,
  Film,
  Grid2x2,
  List,
  Search,
  Sparkles
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import type { AssetSummaryView, AuthSessionView } from "../../dashboard-types";
import { isBlank } from "../../lib/utils";
import { AssetUploadModal } from "./asset-upload-modal";
import type { AssetUploadDraftView } from "./asset-library-page-model";

interface AssetLibraryPageProps {
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isLoading: boolean;
  isUploading: boolean;
  onUploadAssets: (drafts: AssetUploadDraftView[]) => Promise<void>;
  session: AuthSessionView;
}

type AssetLibraryLayoutMode = "grid" | "list";

const cardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

export function AssetLibraryPage({
  assets,
  authErrorMessage,
  authSuccessMessage,
  isLoading,
  isUploading,
  onUploadAssets,
  session
}: AssetLibraryPageProps): React.JSX.Element {
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [drafts, setDrafts] = useState<AssetUploadDraftView[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<AssetLibraryLayoutMode>("grid");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");
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
  const tagOptions = Array.from(new Set(assets.flatMap((asset) => asset.tags))).sort((left, right) =>
    left.localeCompare(right, "ko-KR")
  );
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

    if (tagFilter !== "ALL" && !asset.tags.includes(tagFilter)) {
      return false;
    }

    return true;
  });

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

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">자산 라이브러리</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            하모니 힐즈 IP 콘텐츠 애셋을 검색하고 관리하세요.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled variant="outline">
            <Download className="h-4 w-4" />
            내보내기
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Sparkles className="h-4 w-4" />
            애셋 업로드
          </Button>
        </div>
      </div>

      {authSuccessMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {authSuccessMessage}
        </div>
      ) : null}

      {authErrorMessage ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {authErrorMessage}
        </div>
      ) : null}

      {!session.authenticated ? (
        <Card className="rounded-[28px] border-border">
          <CardContent className="flex flex-col items-start gap-4 p-8">
            <Badge variant="warning">로그인 필요</Badge>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">사내 Google 계정으로 먼저 로그인하세요.</h2>
              <p className="text-sm text-muted-foreground">
                ACTS 자산 업로드와 검색은 `@iportfolio.co.kr` 계정으로만 사용할 수 있습니다.
              </p>
            </div>
            <Button asChild>
              <a href={GOOGLE_LOGIN_PATH}>Google SSO 로그인</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-[28px] border-border">
            <CardContent className="space-y-4 p-6">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_repeat(5,minmax(0,0.32fr))_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-12 rounded-2xl pl-11"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="키워드로 검색... (캐릭터, 태그, 제목)"
                    value={searchQuery}
                  />
                </div>

                <Select onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}>
                  <option value="ALL">전체 유형</option>
                  {assetTypeOptions.map((assetType) => (
                    <option key={assetType} value={assetType}>
                      {typeLabelMap[assetType]}
                    </option>
                  ))}
                </Select>

                <Select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="ALL">전체 상태</option>
                  <option value="READY">등록 완료</option>
                </Select>

                <Select
                  onChange={(event) => setOrganizationFilter(event.target.value)}
                  value={organizationFilter}
                >
                  <option value="ALL">전체 부서</option>
                  {organizationOptions.map((organizationName) => (
                    <option key={organizationName} value={organizationName}>
                      {organizationName}
                    </option>
                  ))}
                </Select>

                <Select onChange={(event) => setCreatorFilter(event.target.value)} value={creatorFilter}>
                  <option value="ALL">전체 제작자</option>
                  {creatorOptions.map((ownerName) => (
                    <option key={ownerName} value={ownerName}>
                      {ownerName}
                    </option>
                  ))}
                </Select>

                <Select onChange={(event) => setTagFilter(event.target.value)} value={tagFilter}>
                  <option value="ALL">전체 태그</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </Select>

                <div className="flex items-center overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    className={`inline-flex h-12 w-12 items-center justify-center ${
                      layoutMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setLayoutMode("grid")}
                    type="button"
                  >
                    <Grid2x2 className="h-4 w-4" />
                  </button>
                  <button
                    className={`inline-flex h-12 w-12 items-center justify-center ${
                      layoutMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"
                    }`}
                    onClick={() => setLayoutMode("list")}
                    type="button"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {isLoading ? "자산을 불러오는 중..." : `${visibleAssets.length}개 애셋`}
              </p>
            </CardContent>
          </Card>

          {visibleAssets.length > 0 ? (
            <div
              className={
                layoutMode === "grid"
                  ? "grid gap-5 xl:grid-cols-4 md:grid-cols-2"
                  : "grid gap-4"
              }
            >
              {visibleAssets.map((asset) => (
                <article
                  className="rounded-[24px] border border-border bg-white p-5 shadow-[0_14px_40px_rgba(17,24,39,0.06)] transition-transform hover:-translate-y-0.5"
                  key={asset.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1ebff] text-[#6d4ae2]">
                        <AssetTypeIcon assetType={asset.type} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {typeLabelMap[asset.type]} · v{asset.versionNumber}
                        </p>
                        <h2 className="line-clamp-1 text-base font-semibold">{asset.title}</h2>
                      </div>
                    </div>
                    <Badge variant="success">{statusLabelMap[asset.status]}</Badge>
                  </div>

                  <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {asset.description ?? asset.originalFileName}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {asset.tags.slice(0, 4).map((tag) => (
                      <span
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                        key={`${asset.id}-${tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                    {asset.tags.length > 4 ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        +{asset.tags.length - 4}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <p className="font-medium text-foreground">{asset.ownerName}</p>
                      <p className="mt-1">{asset.organizationName ?? "조직 미지정"}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        <span>{cardDateFormatter.format(new Date(asset.createdAt))}</span>
                      </div>
                      <p>{formatFileSize(asset.fileSizeBytes)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Card className="rounded-[28px] border-border">
              <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">
                    {isLoading ? "자산을 불러오는 중입니다." : "조건에 맞는 자산이 없습니다."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    첫 애셋을 업로드해서 태그 검색과 라이브러리 흐름을 시작하세요.
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
        onFileDrop={handleFileDrop}
        onRemoveDraft={handleRemoveDraft}
        onRemoveTag={handleRemoveTag}
        onSubmit={handleUploadSubmit}
        onTagInputChange={handleTagInputChange}
        onTitleChange={handleTitleChange}
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
  READY: "등록 완료"
};

const typeLabelMap: Record<AssetSummaryView["type"], string> = {
  AUDIO: "오디오",
  DOCUMENT: "문서",
  IMAGE: "이미지",
  OTHER: "기타",
  SCENARIO: "시나리오",
  VIDEO: "영상"
};
