import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Grid2x2,
  Infinity as InfinityIcon,
  Link2,
  List,
  PencilLine,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";
import type React from "react";
import type { AssetSummaryView, ProjectDetailView } from "../../api/types";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { formatFileSize, typeLabelMap } from "../asset-library/asset-detail-model";
import { AssetPreviewPanel } from "../asset-library/asset-preview-panel";
import { AssetTypeIcon } from "../asset-library/asset-detail-section";
import { flattenAssetTags, getAssetPrimaryText } from "../asset-library/asset-library-utils";
import {
  formatProjectDeadlineLabel,
  getProjectStatusDotClassName,
  projectStatusLabelMap
} from "./project-utils";

type LinkedAssetLayoutMode = "grid" | "list";

const cardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

interface ProjectDetailPageProps {
  busyAssetId: number | null;
  errorMessage: string | null;
  isDeletingProject: boolean;
  isLoading: boolean;
  isTogglingCompletion: boolean;
  isUploadingAssets: boolean;
  onDeleteProject: () => Promise<void>;
  onOpenAssetPage: (assetId: number) => void;
  onOpenAssetPicker: () => void;
  onOpenProjectEditor: () => void;
  onOpenUploadModal: () => void;
  onRemoveLinkedAsset: (assetId: number, assetTitle: string) => Promise<void>;
  onToggleCompletion: () => Promise<void>;
  project: ProjectDetailView | null;
}

export function ProjectDetailPage({
  busyAssetId,
  errorMessage,
  isDeletingProject,
  isLoading,
  isTogglingCompletion,
  isUploadingAssets,
  onDeleteProject,
  onOpenAssetPage,
  onOpenAssetPicker,
  onOpenProjectEditor,
  onOpenUploadModal,
  onRemoveLinkedAsset,
  onToggleCompletion,
  project
}: ProjectDetailPageProps): React.JSX.Element {
  const [layoutMode, setLayoutMode] = useState<LinkedAssetLayoutMode>("grid");

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-border bg-card px-8 py-14 text-center text-sm text-muted-foreground shadow-sm">
        프로젝트를 불러오는 중입니다.
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="rounded-[32px] border border-border bg-card px-8 py-14 text-center text-sm text-muted-foreground shadow-sm">
        프로젝트를 찾을 수 없습니다.
      </div>
    );
  }

  const resolvedProject = project;
  const isCompleted = resolvedProject.status === "COMPLETED";

  async function handleDeleteProject(): Promise<void> {
    const confirmed = window.confirm(`"${resolvedProject.name}" 프로젝트를 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }
    await onDeleteProject();
  }

  async function handleRemoveLinkedAsset(assetId: number, assetTitle: string): Promise<void> {
    const confirmed = window.confirm(`"${assetTitle}" 에셋 연결을 해제하시겠습니까?`);
    if (!confirmed) {
      return;
    }
    await onRemoveLinkedAsset(assetId, assetTitle);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{resolvedProject.name}</h1>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  getProjectStatusDotClassName(resolvedProject.status)
                )}
              />
              <span className="font-medium text-foreground">
                {projectStatusLabelMap[resolvedProject.status]}
              </span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">{resolvedProject.organizationName}</span>
            </span>
            {resolvedProject.deadline ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">
                  {formatProjectDeadlineLabel(resolvedProject.deadline)}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <InfinityIcon className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">마감일 없음</span>
              </span>
            )}
          </div>
          {resolvedProject.description?.trim() ? (
            <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {resolvedProject.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <Button
            className="h-10 rounded-full border-border bg-background px-4 shadow-sm"
            disabled={isDeletingProject || isTogglingCompletion}
            onClick={onOpenProjectEditor}
            size="sm"
            type="button"
            variant="outline"
          >
            <PencilLine className="h-4 w-4" />
            정보 수정
          </Button>
          <Button
            className="h-10 rounded-full border-border bg-background px-4 shadow-sm"
            disabled={isDeletingProject || isTogglingCompletion}
            onClick={() => void onToggleCompletion()}
            size="sm"
            type="button"
            variant="outline"
          >
            {isCompleted ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {isTogglingCompletion
              ? "처리 중..."
              : isCompleted
                ? "완료 해제"
                : "완료 처리"}
          </Button>
          <Button
            className="h-10 rounded-full border-destructive/20 bg-destructive/5 px-4 text-destructive shadow-sm hover:bg-destructive/10"
            disabled={isDeletingProject || isTogglingCompletion}
            onClick={() => void handleDeleteProject()}
            size="sm"
            type="button"
            variant="outline"
          >
            <Trash2 className="h-4 w-4" />
            {isDeletingProject ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[26px] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">연결된 에셋</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              프로젝트에 연결된 에셋 {resolvedProject.linkedAssets.length}개
            </p>
          </div>
          <div className="flex items-center gap-2">
            {resolvedProject.linkedAssets.length > 0 ? (
              <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background">
                <button
                  aria-label="카드 뷰"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center",
                    layoutMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setLayoutMode("grid")}
                  type="button"
                >
                  <Grid2x2 className="h-4 w-4" />
                </button>
                <button
                  aria-label="리스트 뷰"
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center",
                    layoutMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setLayoutMode("list")}
                  type="button"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <Button
              className="h-9 rounded-full px-4"
              disabled={isUploadingAssets}
              onClick={onOpenUploadModal}
              size="sm"
              type="button"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              {isUploadingAssets ? "업로드 중..." : "에셋 업로드"}
            </Button>
            <Button
              className="h-9 rounded-full px-4"
              onClick={onOpenAssetPicker}
              size="sm"
              type="button"
            >
              <Plus className="h-4 w-4" />
              에셋 연결
            </Button>
          </div>
        </div>

        <div className="mt-4">
          {resolvedProject.linkedAssets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
              아직 연결된 에셋이 없습니다. "에셋 연결"을 눌러 프로젝트에 에셋을 추가하세요.
            </div>
          ) : layoutMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {resolvedProject.linkedAssets.map((linkedAsset) => (
                <LinkedAssetCard
                  asset={linkedAsset}
                  isRemoving={busyAssetId === linkedAsset.id}
                  key={linkedAsset.id}
                  onOpenAssetPage={onOpenAssetPage}
                  onRemove={() => handleRemoveLinkedAsset(linkedAsset.id, linkedAsset.title)}
                />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border bg-background/80">
              {resolvedProject.linkedAssets.map((linkedAsset) => (
                <LinkedAssetRow
                  asset={linkedAsset}
                  isRemoving={busyAssetId === linkedAsset.id}
                  key={linkedAsset.id}
                  onOpenAssetPage={onOpenAssetPage}
                  onRemove={() => handleRemoveLinkedAsset(linkedAsset.id, linkedAsset.title)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

interface LinkedAssetViewProps {
  asset: AssetSummaryView;
  isRemoving: boolean;
  onOpenAssetPage: (assetId: number) => void;
  onRemove: () => Promise<void>;
}

function LinkedAssetCard({
  asset,
  isRemoving,
  onOpenAssetPage,
  onRemove
}: LinkedAssetViewProps): React.JSX.Element {
  const flattenedTags = flattenAssetTags(asset.tags);

  return (
    <article className="group relative rounded-[20px] border border-border bg-card p-4 shadow-none transition-all hover:border-primary/25 hover:shadow-[0_14px_40px_rgba(17,24,39,0.06)]">
      <button
        aria-label="연결 해제"
        className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-50"
        disabled={isRemoving}
        onClick={() => void onRemove()}
        title="연결 해제"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <button className="block w-full text-left" onClick={() => onOpenAssetPage(asset.id)} type="button">
        <AssetPreviewPanel
          assetId={asset.id}
          sourceKind={asset.sourceKind}
          assetType={asset.type}
          cacheKey={asset.updatedAt}
          className="aspect-[16/10] w-full"
          title={asset.title}
        />

        <div className="mt-4 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#f1ebff] text-[#6d4ae2]">
            <AssetTypeIcon assetType={asset.type} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{typeLabelMap[asset.type]}</p>
            <h3 className="mt-1 line-clamp-1 text-[15px] font-medium">{asset.title}</h3>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 min-h-[40px] text-[13px] leading-5 text-muted-foreground">
          {getAssetPrimaryText(asset)}
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {asset.sourceKind === "LINK" ? (
            <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground/80">
              {asset.linkType ?? "링크"}
            </span>
          ) : null}
          {flattenedTags.slice(0, 3).map((tag) => (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80" key={`${asset.id}-${tag}`}>
              {tag}
            </span>
          ))}
          {flattenedTags.length > 3 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
              +{flattenedTags.length - 3}
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
          <p className="mt-2 text-[12px] text-muted-foreground">{asset.organizationName ?? "조직 미지정"}</p>
        </div>
      </button>
    </article>
  );
}

function LinkedAssetRow({
  asset,
  isRemoving,
  onOpenAssetPage,
  onRemove
}: LinkedAssetViewProps): React.JSX.Element {
  return (
    <div className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
        {asset.sourceKind === "LINK" ? (
          <Link2 className="h-3.5 w-3.5" />
        ) : (
          <Clapperboard className="h-3.5 w-3.5" />
        )}
      </div>

      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpenAssetPage(asset.id)}
        type="button"
      >
        <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {asset.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-muted-foreground">
          <span>{typeLabelMap[asset.type]}</span>
          <span>&bull;</span>
          <span className="truncate">{asset.originalFileName}</span>
          {asset.fileSizeBytes > 0 ? (
            <>
              <span>&bull;</span>
              <span>{formatFileSize(asset.fileSizeBytes)}</span>
            </>
          ) : null}
        </span>
      </button>

      <button
        aria-label="연결 해제"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
        disabled={isRemoving}
        onClick={() => void onRemove()}
        title="연결 해제"
        type="button"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
