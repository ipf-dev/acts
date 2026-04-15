import { memo, useState } from "react";
import type React from "react";
import { Clock3, Grid2x2, List, RotateCcw, Search, Sparkles } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "../../components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { GOOGLE_LOGIN_PATH } from "../../api/auth";
import type {
  AssetCatalogFilterOptionsView,
  AssetCatalogPageView,
  AssetSummaryView,
  AssetTagOptionCatalogView,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { cn, isBlank } from "../../lib/utils";
import { typeLabelMap } from "./asset-detail-model";
import { AssetTypeIcon } from "./asset-detail-section";
import { flattenAssetTags, getAssetPrimaryText } from "./asset-library-utils";
import type {
  AssetFileUploadDraftView,
  AssetLibraryTypeFilterView,
  AssetLinkDraftView,
  AssetTypeMetadataFilterStateView,
  ImageLayerFileFilterView
} from "./asset-library-page-model";
import { AssetUploadModal } from "./asset-upload-modal";
import { AssetPreviewPanel } from "./asset-preview-panel";
import {
  audioRecordingTypeOptions,
  documentKindOptions,
  imageArtStyleOptions,
  videoStageOptions
} from "./asset-type-metadata-model";

interface AssetLibraryPageProps {
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  catalogFilterOptions: AssetCatalogFilterOptionsView;
  catalogPage: AssetCatalogPageView;
  characterOptions: CharacterTagOptionView[];
  creatorFilter: string;
  tagOptions: AssetTagOptionCatalogView;
  isLoading: boolean;
  isUploading: boolean;
  organizationFilter: string;
  onCreatorFilterChange: (value: string) => void;
  onOpenAssetPage: (assetId: number) => void;
  onOrganizationFilterChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRegisterAssetLinks: (drafts: AssetLinkDraftView[]) => Promise<void>;
  onResetFilters: () => void;
  onSearchQueryChange: (value: string) => void;
  onTypeFilterChange: (value: AssetLibraryTypeFilterView) => void;
  onTypeMetadataFiltersChange: (filters: AssetTypeMetadataFilterStateView) => void;
  onUploadAssets: (drafts: AssetFileUploadDraftView[]) => Promise<void>;
  searchQuery: string;
  session: AuthSessionView;
  typeFilter: AssetLibraryTypeFilterView;
  typeMetadataFilters: AssetTypeMetadataFilterStateView;
}

type AssetLibraryLayoutMode = "grid" | "list";

const cardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

const assetTypeOptions: AssetSummaryView["type"][] = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "URL",
  "OTHER"
];
const pageSizeOptions = [12, 24, 48];

function AssetLibraryPageComponent({
  authErrorMessage,
  authSuccessMessage,
  catalogFilterOptions,
  catalogPage,
  characterOptions,
  creatorFilter,
  tagOptions,
  isLoading,
  isUploading,
  organizationFilter,
  onCreatorFilterChange,
  onOpenAssetPage,
  onOrganizationFilterChange,
  onPageChange,
  onPageSizeChange,
  onRegisterAssetLinks,
  onResetFilters,
  onSearchQueryChange,
  onTypeFilterChange,
  onTypeMetadataFiltersChange,
  onUploadAssets,
  searchQuery,
  session,
  typeFilter,
  typeMetadataFilters
}: AssetLibraryPageProps): React.JSX.Element {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<AssetLibraryLayoutMode>("grid");
  const visibleAssets = catalogPage.items;
  const hasActiveFilters =
    !isBlank(searchQuery) ||
    typeFilter !== "ALL" ||
    organizationFilter !== "ALL" ||
    creatorFilter !== "ALL" ||
    hasActiveTypeMetadataFilters(typeFilter, typeMetadataFilters);
  const paginationItems = buildPaginationItems(catalogPage.page, catalogPage.totalPages);
  const paginationRangeStart = catalogPage.totalItems === 0 ? 0 : catalogPage.page * catalogPage.size + 1;
  const paginationRangeEnd =
    catalogPage.totalItems === 0 ? 0 : catalogPage.page * catalogPage.size + visibleAssets.length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-[32px] font-semibold tracking-tight">에셋 라이브러리</h1>
          <p className="text-sm text-muted-foreground">하모니 힐즈 IP 콘텐츠 에셋을 검색하고 관리하세요.</p>
        </div>

        {session.authenticated ? (
          <div className="flex items-center gap-2">
            <Button
              className="h-10 rounded-xl bg-primary px-4 text-sm font-medium hover:bg-primary/92"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
            >
              <Sparkles className="h-4 w-4" />
              {isUploading ? "업로드 진행 중" : "에셋 업로드"}
            </Button>
          </div>
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
                에셋 업로드와 검색은 <code>@{session.allowedDomain}</code> 계정으로만 사용할 수 있습니다.
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
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,0.36fr))_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="h-11 rounded-xl border-0 bg-muted pl-11 shadow-none"
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    placeholder="키워드로 검색... (캐릭터, 태그, 제목)"
                    value={searchQuery}
                  />
                </div>

                <Select onValueChange={(value) => onTypeFilterChange(value as AssetLibraryTypeFilterView)} value={typeFilter}>
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

                <Select onValueChange={onOrganizationFilterChange} value={organizationFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 부서" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 부서</SelectItem>
                    {catalogFilterOptions.organizations.map((organization) => (
                      <SelectItem key={organization.id} value={String(organization.id)}>
                        {organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select onValueChange={onCreatorFilterChange} value={creatorFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                    <SelectValue placeholder="전체 제작자" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 제작자</SelectItem>
                    {catalogFilterOptions.creators.map((creator) => (
                      <SelectItem key={creator.email} value={creator.email}>
                        {creator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center",
                      layoutMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
                    )}
                    onClick={() => setLayoutMode("grid")}
                    type="button"
                  >
                    <Grid2x2 className="h-4 w-4" />
                  </button>
                  <button
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center",
                      layoutMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"
                    )}
                    onClick={() => setLayoutMode("list")}
                    type="button"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {typeFilter === "IMAGE" ? (
                <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">이미지 아트 스타일</p>
                    <Select
                      onValueChange={(value) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          imageArtStyle: value as AssetTypeMetadataFilterStateView["imageArtStyle"]
                        })
                      }
                      value={typeMetadataFilters.imageArtStyle}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                        <SelectValue placeholder="전체 아트 스타일" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체 아트 스타일</SelectItem>
                        {imageArtStyleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">레이어 파일</p>
                    <Select
                      onValueChange={(value) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          imageHasLayerFile: value as ImageLayerFileFilterView
                        })
                      }
                      value={typeMetadataFilters.imageHasLayerFile}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                        <SelectValue placeholder="전체 레이어 상태" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체 레이어 상태</SelectItem>
                        <SelectItem value="INCLUDED">레이어 파일 포함</SelectItem>
                        <SelectItem value="NOT_INCLUDED">레이어 파일 미포함</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {typeFilter === "AUDIO" ? (
                <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">TTS 목소리</p>
                    <Input
                      className="h-11 rounded-xl border-0 bg-muted shadow-none"
                      onChange={(event) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          audioTtsVoice: event.target.value
                        })
                      }
                      placeholder="TTS 목소리로 필터링"
                      value={typeMetadataFilters.audioTtsVoice}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">녹음 유형</p>
                    <Select
                      onValueChange={(value) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          audioRecordingType: value as AssetTypeMetadataFilterStateView["audioRecordingType"]
                        })
                      }
                      value={typeMetadataFilters.audioRecordingType}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                        <SelectValue placeholder="전체 녹음 유형" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체 녹음 유형</SelectItem>
                        {audioRecordingTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {typeFilter === "VIDEO" ? (
                <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">영상 정보</p>
                    <Select
                      onValueChange={(value) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          videoStage: value as AssetTypeMetadataFilterStateView["videoStage"]
                        })
                      }
                      value={typeMetadataFilters.videoStage}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                        <SelectValue placeholder="전체 영상 정보" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체 영상 정보</SelectItem>
                        {videoStageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {typeFilter === "DOCUMENT" ? (
                <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">문서 정보</p>
                    <Select
                      onValueChange={(value) =>
                        onTypeMetadataFiltersChange({
                          ...typeMetadataFilters,
                          documentKind: value as AssetTypeMetadataFilterStateView["documentKind"]
                        })
                      }
                      value={typeMetadataFilters.documentKind}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-0 bg-muted shadow-none">
                        <SelectValue placeholder="전체 문서 정보" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">전체 문서 정보</SelectItem>
                        {documentKindOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  {isLoading
                    ? "에셋을 불러오는 중..."
                    : catalogPage.totalItems === 0
                      ? "조건에 맞는 에셋이 없습니다."
                      : `총 ${catalogPage.totalItems}개 에셋`}
                </p>
                {hasActiveFilters ? (
                  <Button className="h-8 rounded-full px-3 text-xs" onClick={onResetFilters} type="button" variant="ghost">
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
                          <h2 className="mt-1 line-clamp-1 text-[15px] font-medium">{asset.title}</h2>
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
                        {flattenAssetTags(asset.tags).slice(0, 3).map((tag) => (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80" key={`${asset.id}-${tag}`}>
                            {tag}
                          </span>
                        ))}
                        {flattenAssetTags(asset.tags).length > 3 ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
                            +{flattenAssetTags(asset.tags).length - 3}
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
                ))}
              </div>
            ) : (
              <Card className="overflow-hidden rounded-[24px] border-border shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border text-sm">
                      <thead className="bg-muted/70 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">에셋명</th>
                          <th className="px-4 py-3 font-medium">유형</th>
                          <th className="px-4 py-3 font-medium">태그</th>
                          <th className="px-4 py-3 font-medium">부서</th>
                          <th className="px-4 py-3 font-medium">제작자</th>
                          <th className="px-4 py-3 font-medium">수정일</th>
                          <th className="px-4 py-3 font-medium">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {visibleAssets.map((asset) => (
                          <tr className="hover:bg-muted/30" key={asset.id}>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <AssetPreviewPanel
                                  assetId={asset.id}
                                  sourceKind={asset.sourceKind}
                                  assetType={asset.type}
                                  cacheKey={asset.updatedAt}
                                  className="h-12 w-16 flex-none rounded-xl"
                                  title={asset.title}
                                />
                                <div className="min-w-0">
                                  <p className="line-clamp-1 font-medium">{asset.title}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{getAssetPrimaryText(asset)}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{typeLabelMap[asset.type]}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {flattenAssetTags(asset.tags).slice(0, 2).map((tag) => (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80" key={`${asset.id}-${tag}`}>
                                    {tag}
                                  </span>
                                ))}
                                {flattenAssetTags(asset.tags).length > 2 ? (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80">
                                    +{flattenAssetTags(asset.tags).length - 2}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{asset.organizationName ?? "조직 미지정"}</td>
                            <td className="px-4 py-4 text-muted-foreground">{asset.ownerName}</td>
                            <td className="px-4 py-4 text-muted-foreground">
                              {cardDateFormatter.format(new Date(asset.updatedAt))}
                            </td>
                            <td className="px-4 py-4">
                              <Button
                                className="h-8 rounded-xl px-3 text-xs"
                                onClick={() => onOpenAssetPage(asset.id)}
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
                    {isLoading ? "에셋을 불러오는 중입니다." : "조건에 맞는 에셋이 없습니다."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    검색어와 필터를 조정하거나 첫 에셋을 업로드해 라이브러리를 시작하세요.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {catalogPage.totalItems > 0 ? (
            <Card className="rounded-[24px] border-border shadow-none">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1 text-center lg:text-left">
                  <p className="text-sm font-medium">
                    {paginationRangeStart}-{paginationRangeEnd} / {catalogPage.totalItems}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    페이지 {catalogPage.totalPages === 0 ? 0 : catalogPage.page + 1} / {catalogPage.totalPages}
                  </p>
                </div>

                <Pagination className="justify-center lg:flex-1">
                  <PaginationContent className="flex-wrap justify-center">
                    <PaginationItem>
                      <PaginationFirst
                        disabled={!catalogPage.hasPrevious || isLoading}
                        onClick={() => onPageChange(0)}
                        type="button"
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={!catalogPage.hasPrevious || isLoading}
                        onClick={() => onPageChange(catalogPage.page - 1)}
                        type="button"
                      />
                    </PaginationItem>
                    {paginationItems.map((item, index) => (
                      <PaginationItem key={`${item}-${index}`}>
                        {item === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            disabled={isLoading}
                            isActive={item === catalogPage.page}
                            onClick={() => onPageChange(item)}
                          >
                            {item + 1}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        disabled={!catalogPage.hasNext || isLoading}
                        onClick={() => onPageChange(catalogPage.page + 1)}
                        type="button"
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLast
                        disabled={!catalogPage.hasNext || isLoading}
                        onClick={() => onPageChange(catalogPage.totalPages - 1)}
                        type="button"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>

                <div className="flex justify-center lg:justify-end">
                  <Select onValueChange={(value) => onPageSizeChange(Number(value))} value={String(catalogPage.size)}>
                    <SelectTrigger className="h-10 w-[112px] rounded-xl border-border bg-background text-sm shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((pageSize) => (
                        <SelectItem key={pageSize} value={String(pageSize)}>
                          {pageSize}개씩
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
      <AssetUploadModal
        characterOptions={characterOptions}
        isOpen={isUploadModalOpen && session.authenticated}
        isUploading={isUploading}
        onClose={() => setIsUploadModalOpen(false)}
        onRegisterAssetLinks={onRegisterAssetLinks}
        tagOptions={tagOptions}
        onUploadAssets={onUploadAssets}
      />
    </section>
  );
}

export const AssetLibraryPage = memo(AssetLibraryPageComponent, areAssetLibraryPagePropsEqual);

function areAssetLibraryPagePropsEqual(
  previousProps: AssetLibraryPageProps,
  nextProps: AssetLibraryPageProps
): boolean {
  return (
    previousProps.authErrorMessage === nextProps.authErrorMessage &&
    previousProps.authSuccessMessage === nextProps.authSuccessMessage &&
    previousProps.catalogFilterOptions === nextProps.catalogFilterOptions &&
    previousProps.catalogPage === nextProps.catalogPage &&
    previousProps.characterOptions === nextProps.characterOptions &&
    previousProps.creatorFilter === nextProps.creatorFilter &&
    previousProps.tagOptions === nextProps.tagOptions &&
    previousProps.isLoading === nextProps.isLoading &&
    previousProps.isUploading === nextProps.isUploading &&
    previousProps.organizationFilter === nextProps.organizationFilter &&
    previousProps.onCreatorFilterChange === nextProps.onCreatorFilterChange &&
    previousProps.onOpenAssetPage === nextProps.onOpenAssetPage &&
    previousProps.onOrganizationFilterChange === nextProps.onOrganizationFilterChange &&
    previousProps.onPageChange === nextProps.onPageChange &&
    previousProps.onPageSizeChange === nextProps.onPageSizeChange &&
    previousProps.onResetFilters === nextProps.onResetFilters &&
    previousProps.onSearchQueryChange === nextProps.onSearchQueryChange &&
    previousProps.onTypeFilterChange === nextProps.onTypeFilterChange &&
    previousProps.onTypeMetadataFiltersChange === nextProps.onTypeMetadataFiltersChange &&
    previousProps.onUploadAssets === nextProps.onUploadAssets &&
    previousProps.onRegisterAssetLinks === nextProps.onRegisterAssetLinks &&
    previousProps.searchQuery === nextProps.searchQuery &&
    previousProps.session === nextProps.session &&
    previousProps.typeFilter === nextProps.typeFilter &&
    previousProps.typeMetadataFilters === nextProps.typeMetadataFilters
  );
}

function hasActiveTypeMetadataFilters(
  typeFilter: AssetLibraryTypeFilterView,
  filters: AssetTypeMetadataFilterStateView
): boolean {
  switch (typeFilter) {
    case "IMAGE":
      return filters.imageArtStyle !== "ALL" || filters.imageHasLayerFile !== "ALL";
    case "AUDIO":
      return !isBlank(filters.audioTtsVoice) || filters.audioRecordingType !== "ALL";
    case "VIDEO":
      return filters.videoStage !== "ALL";
    case "DOCUMENT":
      return filters.documentKind !== "ALL";
    default:
      return false;
  }
}

function buildPaginationItems(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  if (currentPage <= 3) {
    return [0, 1, 2, 3, 4, "ellipsis", totalPages - 1];
  }

  if (currentPage >= totalPages - 4) {
    return [0, "ellipsis", totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1];
  }

  return [
    0,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages - 1
  ];
}
