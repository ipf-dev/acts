import { memo, useDeferredValue, useState } from "react";
import type React from "react";
import {
  Clock3,
  Download,
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
import { GOOGLE_LOGIN_PATH } from "../../api/auth";
import type {
  AssetTagOptionCatalogView,
  AssetSummaryView,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { cn, isBlank } from "../../lib/utils";
import { typeLabelMap } from "./asset-detail-model";
import { AssetTypeIcon } from "./asset-detail-section";
import { AssetPreviewPanel } from "./asset-preview-panel";
import { AssetUploadModal } from "./asset-upload-modal";
import { flattenAssetTags, getAssetPrimaryText } from "./asset-library-utils";
import type {
  AssetFileUploadDraftView,
  AssetLinkDraftView
} from "./asset-library-page-model";

interface AssetLibraryPageProps {
  assets: AssetSummaryView[];
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  characterOptions: CharacterTagOptionView[];
  tagOptions: AssetTagOptionCatalogView;
  isExporting: boolean;
  isLoading: boolean;
  isUploading: boolean;
  onExportAssets: () => Promise<void>;
  onOpenAssetPage: (assetId: number) => void;
  onRegisterAssetLinks: (drafts: AssetLinkDraftView[]) => Promise<void>;
  onSearchQueryChange: (value: string) => void;
  onUploadAssets: (drafts: AssetFileUploadDraftView[]) => Promise<void>;
  searchQuery: string;
  session: AuthSessionView;
}

type AssetLibraryLayoutMode = "grid" | "list";

const cardDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short"
});

function AssetLibraryPageComponent({
  assets,
  authErrorMessage,
  authSuccessMessage,
  characterOptions,
  tagOptions,
  isExporting,
  isLoading,
  isUploading,
  onExportAssets,
  onOpenAssetPage,
  onRegisterAssetLinks,
  onSearchQueryChange,
  onUploadAssets,
  searchQuery,
  session
}: AssetLibraryPageProps): React.JSX.Element {
  const [creatorFilter, setCreatorFilter] = useState("ALL");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<AssetLibraryLayoutMode>("grid");
  const [organizationFilter, setOrganizationFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const deferredSearchQuery = useDeferredValue(searchQuery);

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
  const normalizedTerms = normalizeSearchValue(deferredSearchQuery)
    .split(/\s+/)
    .filter(Boolean);
  const visibleAssets = assets.filter((asset) => {
    if (normalizedTerms.some((term) => !asset.searchText.includes(term))) {
      return false;
    }

    if (typeFilter !== "ALL" && asset.type !== typeFilter) {
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
    organizationFilter !== "ALL" ||
    creatorFilter !== "ALL";

  function resetFilters(): void {
    onSearchQueryChange("");
    setTypeFilter("ALL");
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
          <div className="flex items-center gap-2">
            {session.user?.companyWideViewer ? (
              <Button
                className="h-10 rounded-xl px-4 text-sm font-medium"
                disabled={isExporting}
                onClick={() => void onExportAssets()}
                type="button"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                {isExporting ? "내보내는 중" : "내보내기"}
              </Button>
            ) : null}
            <Button
              className="h-10 rounded-xl bg-primary px-4 text-sm font-medium hover:bg-primary/92"
              disabled={isUploading}
              onClick={() => setIsUploadModalOpen(true)}
              type="button"
            >
              <Sparkles className="h-4 w-4" />
              {isUploading ? "업로드 진행 중" : "애셋 업로드"}
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
                      onClick={() => onOpenAssetPage(asset.id)}
                      type="button"
                    >
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
                          <p className="text-xs text-muted-foreground">
                            {typeLabelMap[asset.type]} · v{asset.versionNumber}
                          </p>
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
                          <span
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                            key={`${asset.id}-${tag}`}
                          >
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
                        <p className="mt-2 text-[12px] text-muted-foreground">
                          {asset.organizationName ?? "조직 미지정"}
                        </p>
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
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {getAssetPrimaryText(asset)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{typeLabelMap[asset.type]}</td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {flattenAssetTags(asset.tags).slice(0, 2).map((tag) => (
                                  <span
                                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-foreground/80"
                                    key={`${asset.id}-${tag}`}
                                  >
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

function normalizeDisplayValue(value: string): string {
  return value.normalize("NFC");
}

function normalizeSearchValue(value: string): string {
  return normalizeDisplayValue(value).trim().toLowerCase();
}

const assetTypeOptions: AssetSummaryView["type"][] = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "DOCUMENT",
  "SCENARIO",
  "OTHER"
];

function areAssetLibraryPagePropsEqual(
  previousProps: AssetLibraryPageProps,
  nextProps: AssetLibraryPageProps
): boolean {
  return (
    previousProps.assets === nextProps.assets &&
    previousProps.authErrorMessage === nextProps.authErrorMessage &&
    previousProps.authSuccessMessage === nextProps.authSuccessMessage &&
    previousProps.characterOptions === nextProps.characterOptions &&
    previousProps.tagOptions === nextProps.tagOptions &&
    previousProps.isExporting === nextProps.isExporting &&
    previousProps.isLoading === nextProps.isLoading &&
    previousProps.isUploading === nextProps.isUploading &&
    previousProps.onOpenAssetPage === nextProps.onOpenAssetPage &&
    previousProps.onSearchQueryChange === nextProps.onSearchQueryChange &&
    previousProps.searchQuery === nextProps.searchQuery &&
    previousProps.session === nextProps.session
  );
}
