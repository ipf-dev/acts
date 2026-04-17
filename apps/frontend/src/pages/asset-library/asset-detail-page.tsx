import { useEffect, useState } from "react";
import type React from "react";
import {
  ChevronRight,
  Download,
  ExternalLink,
  MoreHorizontal,
  Save,
  Trash2
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import type {
  AssetDetailView,
  AssetSummaryView,
  AssetTypeMetadataInputView,
  AssetUpdateInput,
  AuthSessionView,
  CharacterTagOptionView
} from "../../api/types";
import { formatAllowedDomains, GOOGLE_LOGIN_PATH } from "../../api/auth";
import {
  detailDateFormatter,
  formatFileSize,
  historyLabelMap,
  typeLabelMap
} from "./asset-detail-model";
import {
  AssetDataField,
  AssetTagChip,
  AssetTypeIcon
} from "./asset-detail-section";
import { AssetPreviewPanel } from "./asset-preview-panel";
import { AssetTagEditor } from "./asset-tag-editor-section";
import { AssetVideoPlayerPanel } from "./asset-video-player-panel";
import {
  commitPendingTagInputs,
  findSelectedCharacterTagIds,
  flattenAssetTags,
  getAssetPrimaryText,
  normalizeTagValue,
  openAssetExternalLink
} from "./asset-library-utils";
import {
  createAssetTypeMetadataInputFromView
} from "./asset-type-metadata-model";
import {
  AssetTypeMetadataDisplaySection,
  AssetTypeMetadataEditorSection
} from "./asset-type-metadata-section";

interface AssetDetailPageProps {
  asset: AssetDetailView | null;
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  characterOptions: CharacterTagOptionView[];
  isDeleting: boolean;
  isDownloading: boolean;
  isLoading: boolean;
  isLoadingPlayback: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDelete: () => Promise<void>;
  onDownload: () => Promise<void>;
  onOpenRelatedAsset: (assetId: number) => void;
  onRefreshPlaybackUrl: () => Promise<void>;
  onSave: (input: AssetUpdateInput) => Promise<void>;
  playbackErrorMessage: string | null;
  playbackUrl: string | null;
  relatedAssets: AssetSummaryView[];
  session: AuthSessionView;
}

export function AssetDetailPage({
  asset,
  authErrorMessage,
  authSuccessMessage,
  characterOptions,
  isDeleting,
  isDownloading,
  isLoading,
  isLoadingPlayback,
  isSaving,
  onBack,
  onDelete,
  onDownload,
  onOpenRelatedAsset,
  onRefreshPlaybackUrl,
  onSave,
  playbackErrorMessage,
  playbackUrl,
  relatedAssets,
  session
}: AssetDetailPageProps): React.JSX.Element {
  const [characterTagIdsDraft, setCharacterTagIdsDraft] = useState<number[]>([]);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywordsDraft, setKeywordsDraft] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [locationsDraft, setLocationsDraft] = useState<string[]>([]);
  const [titleDraft, setTitleDraft] = useState("");
  const [typeMetadataDraft, setTypeMetadataDraft] = useState<AssetTypeMetadataInputView>({
    imageArtStyle: null,
    imageHasLayerFile: null,
    audioTtsVoice: "",
    audioRecordingType: null,
    videoStage: null,
    documentKind: null
  });
  const canDelete = asset?.canDelete ?? false;
  const canEdit = asset?.canEdit ?? false;
  const canDownload = asset?.canDownload ?? false;
  const isLinkAsset = asset?.sourceKind === "LINK";
  const isVideoAsset = asset?.sourceKind === "FILE" && asset.type === "VIDEO";

  useEffect(() => {
    if (!asset) {
      return;
    }

    setTitleDraft(asset.title);
    setDescriptionDraft(asset.description ?? "");
    setCharacterTagIdsDraft(findSelectedCharacterTagIds(asset.tags, characterOptions));
    setLocationsDraft(asset.tags.locations);
    setKeywordsDraft(asset.tags.keywords);
    setLocationInput("");
    setKeywordInput("");
    setTypeMetadataDraft(
      createAssetTypeMetadataInputFromView(asset.type, asset.sourceKind, asset.typeMetadata)
    );
  }, [asset, characterOptions]);

  async function handleSave(): Promise<void> {
    if (!asset) {
      return;
    }

    const resolvedTags = commitPendingTagInputs({
      characterTagIds: characterTagIdsDraft,
      keywordInput,
      keywords: keywordsDraft,
      locationInput,
      locations: locationsDraft
    });

    setKeywordInput(resolvedTags.keywordInput);
    setKeywordsDraft(resolvedTags.keywords);
    setLocationInput(resolvedTags.locationInput);
    setLocationsDraft(resolvedTags.locations);

    await onSave({
      title: titleDraft,
      description: descriptionDraft,
      tags: {
        characterTagIds: resolvedTags.characterTagIds,
        locations: resolvedTags.locations,
        keywords: resolvedTags.keywords
      },
      typeMetadata: typeMetadataDraft
    });
  }

  async function handleDelete(): Promise<void> {
    if (!asset) {
      return;
    }

    const confirmed = window.confirm(`"${asset.title}" 에셋을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    await onDelete();
  }

  if (!session.authenticated) {
    return (
      <Card className="rounded-[28px] border-border shadow-none">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <Badge variant="warning">로그인 필요</Badge>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">사내 Google 계정으로 로그인하세요.</h2>
            <p className="text-sm text-muted-foreground">
              에셋 상세 조회와 다운로드는 <code>{formatAllowedDomains(session.allowedDomains)}</code> 계정으로만 사용할 수 있습니다.
            </p>
          </div>
          <Button asChild className="h-10 rounded-xl px-4">
            <a href={GOOGLE_LOGIN_PATH}>Google SSO 로그인</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto max-w-[1240px] space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button className="transition-colors hover:text-foreground" onClick={onBack} type="button">
          에셋 라이브러리
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{asset?.title ?? "에셋 상세"}</span>
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

      {isLoading ? (
        <Card className="rounded-[28px] border-border shadow-none">
          <CardContent className="p-8 text-sm text-muted-foreground">에셋 정보를 불러오는 중입니다.</CardContent>
        </Card>
      ) : !asset ? (
        <Card className="rounded-[28px] border-border shadow-none">
          <CardContent className="flex flex-col items-start gap-4 p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">에셋을 찾을 수 없습니다.</h2>
              <p className="text-sm text-muted-foreground">
                에셋 라이브러리로 돌아가 다른 에셋을 선택해 주세요.
              </p>
            </div>
            <Button className="h-10 rounded-xl px-4" onClick={onBack} type="button" variant="outline">
              에셋 라이브러리로 돌아가기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#f1ebff] text-[#6d4ae2]">
                <AssetTypeIcon assetType={asset.type} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[34px] font-semibold tracking-tight">{asset.title}</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typeLabelMap[asset.type]} · {asset.organizationName ?? "조직 미지정"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLinkAsset && asset?.linkUrl ? (
                <Button
                  className="h-10 rounded-xl bg-primary px-4 text-sm"
                  onClick={() => openAssetExternalLink(asset.linkUrl!)}
                  type="button"
                >
                  <ExternalLink className="h-4 w-4" />
                  외부 열기
                </Button>
              ) : (
                <Button
                  className="h-10 rounded-xl bg-primary px-4 text-sm"
                  disabled={!canDownload || isDownloading}
                  onClick={() => void onDownload()}
                  type="button"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "다운로드 중" : "다운로드"}
                </Button>
              )}
              {canDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-10 w-10 rounded-xl" size="icon" variant="outline">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => void handleDelete()}
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? "삭제 중" : "삭제"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Tabs className="space-y-4" defaultValue="summary">
                <TabsList className="h-auto self-start rounded-full bg-muted p-1">
                  <TabsTrigger className="rounded-full px-4 py-2 text-sm" value="summary">
                    상세 정보
                  </TabsTrigger>
                  <TabsTrigger className="rounded-full px-4 py-2 text-sm" value="history">
                    변경 이력
                  </TabsTrigger>
                  <TabsTrigger className="rounded-full px-4 py-2 text-sm" value="metadata">
                    메타데이터
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                    <Card className="rounded-[24px] border-border shadow-none">
                    <CardContent className="space-y-6 p-6">
                      {isVideoAsset ? (
                        <AssetVideoPlayerPanel
                          assetId={asset.id}
                          cacheKey={asset.updatedAt}
                          errorMessage={playbackErrorMessage}
                          isLoading={isLoadingPlayback}
                          onRefreshPlaybackUrl={onRefreshPlaybackUrl}
                          playbackUrl={playbackUrl}
                          title={asset.title}
                        />
                      ) : (
                        <AssetPreviewPanel
                          assetId={asset.id}
                          sourceKind={asset.sourceKind}
                          assetType={asset.type}
                          cacheKey={asset.updatedAt}
                          className="aspect-[16/9] w-full rounded-[20px]"
                          title={asset.title}
                        />
                      )}

                      <section className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">설명</p>
                        <p className="text-sm leading-7 text-foreground">
                          {getAssetPrimaryText(asset)}
                        </p>
                      </section>

                      <section className="grid gap-6 border-y border-border py-5 sm:grid-cols-2">
                        <AssetDataField label="카테고리" value={typeLabelMap[asset.type]} />
                        {asset.sourceKind === "FILE" ? (
                          <>
                            <AssetDataField label="파일 형식" value={asset.fileExtension ?? asset.mimeType} />
                            <AssetDataField label="원본 파일명" value={asset.originalFileName} />
                            <AssetDataField label="파일 크기" value={formatFileSize(asset.fileSizeBytes)} />
                          </>
                        ) : (
                          <>
                            <AssetDataField label="링크 유형" value={asset.linkType ?? "링크"} />
                            <AssetDataField
                              label="URL"
                              value={asset.linkUrl ?? "-"}
                              valueClassName="break-all text-[13px] font-normal leading-5 text-muted-foreground"
                            />
                            <AssetDataField label="소스" value="외부 링크" />
                          </>
                        )}
                      </section>

                      <section className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">태그</p>
                        <AssetTagGroupList tags={asset.tags} />
                      </section>

                      <AssetTypeMetadataDisplaySection
                        assetType={asset.type}
                        sourceKind={asset.sourceKind}
                        typeMetadata={asset.typeMetadata}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history">
                  <Card className="rounded-[24px] border-border shadow-none">
                    <CardContent className="space-y-4 p-6">
                      {asset.events.length > 0 ? (
                        asset.events.map((event, index) => (
                          <div className="relative flex items-start gap-4" key={`${event.createdAt}-${event.eventType}`}>
                            {index < asset.events.length - 1 ? (
                              <div className="absolute left-[11px] top-6 h-[calc(100%-6px)] w-px bg-border" />
                            ) : null}
                            <div className="relative z-10 mt-1 h-6 w-6 rounded-full bg-violet-500" />
                            <div className="min-w-0 flex-1 rounded-2xl bg-muted/40 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{historyLabelMap[event.eventType]}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {detailDateFormatter.format(new Date(event.createdAt))}
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-medium">{event.detail ?? "등록 이력이 기록되었습니다."}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                by {event.actorName ?? event.actorEmail}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">아직 기록된 이력이 없습니다.</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="metadata">
                  <Card className="rounded-[24px] border-border shadow-none">
                    <CardContent className="space-y-5 p-6">
                      <section className="grid gap-4 sm:grid-cols-2">
                        <AssetDataField
                          label="소스"
                          value={asset.sourceKind === "FILE" ? "파일 업로드" : "외부 링크"}
                        />
                        {asset.currentFile ? (
                          <>
                            <AssetDataField label="MIME" value={asset.currentFile.mimeType} />
                          </>
                        ) : (
                          <>
                            <AssetDataField label="링크 유형" value={asset.linkType ?? "링크"} />
                            <AssetDataField
                              label="등록 URL"
                              value={asset.linkUrl ?? "-"}
                              valueClassName="break-all text-[13px] font-normal leading-5 text-muted-foreground"
                            />
                          </>
                        )}
                        <AssetDataField
                          label="해상도"
                          value={
                            asset.widthPx && asset.heightPx
                              ? `${asset.widthPx}x${asset.heightPx}`
                              : "추출 정보 없음"
                          }
                        />
                      </section>

                      <AssetTypeMetadataDisplaySection
                        assetType={asset.type}
                        className="rounded-2xl border border-border bg-muted/20 p-4"
                        sourceKind={asset.sourceKind}
                        typeMetadata={asset.typeMetadata}
                      />

                      <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">권한 및 메타데이터</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              소유자와 Admin은 제목, 설명, 태그, 세부 메타데이터를 수정할 수 있습니다.
                            </p>
                          </div>
                          <Badge variant={canEdit ? "success" : "outline"}>
                            {canEdit ? "수정 가능" : "읽기 전용"}
                          </Badge>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <AssetDataField label="소유자" value={asset.ownerName} />
                          <AssetDataField
                            label="조회 범위"
                            value={
                              asset.sourceKind === "FILE"
                                ? "모든 로그인 사용자가 목록, 상세, 다운로드에 접근할 수 있습니다."
                                : "모든 로그인 사용자가 목록, 상세, 외부 링크 열기에 접근할 수 있습니다."
                            }
                            valueClassName="text-[13px] font-normal leading-5 text-muted-foreground"
                          />
                        </div>

                        {canEdit ? (
                          <>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">제목</p>
                              <Input
                                className="h-11 rounded-xl border-border bg-background"
                                onChange={(event) => setTitleDraft(event.target.value)}
                                value={titleDraft}
                              />
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">설명</p>
                              <Textarea
                                className="min-h-28 rounded-xl border-border bg-background"
                                onChange={(event) => setDescriptionDraft(event.target.value)}
                                placeholder="에셋 설명을 입력하세요"
                                value={descriptionDraft}
                              />
                            </div>

                            <AssetTypeMetadataEditorSection
                              assetType={asset.type}
                              onChange={setTypeMetadataDraft}
                              sourceKind={asset.sourceKind}
                              value={typeMetadataDraft}
                            />

                            <AssetTagEditor
                              characterOptions={characterOptions}
                              onAddTag={(collectionKey, explicitValue) => {
                                if (collectionKey === "locations") {
                                  const normalizedValue = normalizeTagValue(explicitValue ?? locationInput);
                                  if (!normalizedValue) {
                                    return;
                                  }
                                  setLocationsDraft((currentTags) =>
                                    currentTags.includes(normalizedValue)
                                      ? currentTags
                                      : [...currentTags, normalizedValue]
                                  );
                                  setLocationInput("");
                                  return;
                                }

                                const normalizedValue = normalizeTagValue(explicitValue ?? keywordInput);
                                if (!normalizedValue) {
                                  return;
                                }
                                setKeywordsDraft((currentTags) =>
                                  currentTags.includes(normalizedValue)
                                    ? currentTags
                                    : [...currentTags, normalizedValue]
                                );
                                setKeywordInput("");
                              }}
                              onCharacterToggle={(characterTagId) =>
                                setCharacterTagIdsDraft((currentIds) =>
                                  currentIds.includes(characterTagId)
                                    ? currentIds.filter((currentId) => currentId !== characterTagId)
                                    : [...currentIds, characterTagId]
                                )
                              }
                              onRemoveTag={(collectionKey, value) => {
                                if (collectionKey === "locations") {
                                  setLocationsDraft((currentTags) => currentTags.filter((tag) => tag !== value));
                                  return;
                                }

                                setKeywordsDraft((currentTags) => currentTags.filter((tag) => tag !== value));
                              }}
                              onTagInputChange={(key, value) => {
                                if (key === "locationInput") {
                                  setLocationInput(value);
                                  return;
                                }

                                setKeywordInput(value);
                              }}
                              value={{
                                characterTagIds: characterTagIdsDraft,
                                keywordInput,
                                keywords: keywordsDraft,
                                locationInput,
                                locations: locationsDraft
                              }}
                            />

                            <div className="flex justify-end">
                              <Button
                                className="h-10 rounded-xl px-4"
                                disabled={isSaving || titleDraft.trim().length === 0}
                                onClick={() => void handleSave()}
                                type="button"
                              >
                                <Save className="h-4 w-4" />
                                {isSaving ? "저장 중" : "변경 저장"}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <section className="grid gap-4 sm:grid-cols-2">
                            <AssetDataField label="제작 조직" value={asset.organizationName ?? "조직 미지정"} />
                            <AssetDataField label="삭제 권한" value={asset.canDelete ? "허용" : "불가"} />
                            <AssetDataField label="편집 권한" value={asset.canEdit ? "허용" : "불가"} />
                            <AssetDataField
                              label={asset.sourceKind === "FILE" ? "다운로드 권한" : "링크 열기"}
                              value={
                                asset.sourceKind === "FILE"
                                  ? asset.canDownload
                                    ? "허용"
                                    : "불가"
                                  : asset.linkUrl
                                    ? "허용"
                                    : "불가"
                              }
                            />
                          </section>
                        )}
                      </section>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">
              <Card className="rounded-[24px] border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">기본 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SidebarField label="유형" value={typeLabelMap[asset.type]} />
                  <SidebarDivider />
                  <SidebarField label="생성일" value={detailDateFormatter.format(new Date(asset.createdAt))} />
                  <SidebarDivider />
                  <SidebarField label="최종 수정일" value={detailDateFormatter.format(new Date(asset.updatedAt))} />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">제작자</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700">
                      {asset.ownerName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{asset.ownerName}</p>
                      <p className="text-xs text-muted-foreground">{asset.organizationName ?? "조직 미지정"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">관련 에셋</CardTitle>
                  <p className="text-xs text-muted-foreground">같은 조직 또는 비슷한 태그 기준</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedAssets.length > 0 ? (
                    relatedAssets.map((relatedAsset) => (
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50"
                        key={relatedAsset.id}
                        onClick={() => onOpenRelatedAsset(relatedAsset.id)}
                        type="button"
                      >
                        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <AssetTypeIcon assetType={relatedAsset.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{relatedAsset.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{typeLabelMap[relatedAsset.type]}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">표시할 관련 에셋이 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SidebarField({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function SidebarDivider(): React.JSX.Element {
  return <div className="h-px w-full bg-border" />;
}

function AssetTagGroupList({
  tags
}: {
  tags: AssetDetailView["tags"];
}): React.JSX.Element {
  const groups = [
    { label: "캐릭터", values: tags.characters },
    { label: "장소", values: tags.locations },
    { label: "키워드", values: tags.keywords }
  ];

  if (flattenAssetTags(tags).length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 태그가 없습니다.</p>;
  }

  return (
    <div className="space-y-3">
      {groups.filter((group) => group.values.length > 0).map((group) => (
        <div className="space-y-2" key={group.label}>
          <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((tag) => <AssetTagChip key={`${group.label}-${tag}`} tag={tag} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
