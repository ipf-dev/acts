import { useEffect, useState } from "react";
import {
  ChevronRight,
  Download,
  Save,
  X
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Textarea } from "../../components/ui/textarea";
import type {
  AssetDetailView,
  AssetSummaryView,
  AssetUpdateInput,
  AuthSessionView
} from "../../dashboard-types";
import { GOOGLE_LOGIN_PATH } from "../../dashboard-auth";
import {
  detailDateFormatter,
  formatFileSize,
  historyLabelMap,
  statusLabelMap,
  typeLabelMap
} from "./asset-detail-model";
import {
  AssetDataField,
  AssetStatusChip,
  AssetTagChip,
  AssetTypeIcon
} from "./asset-detail-section";

interface AssetDetailPageProps {
  asset: AssetDetailView | null;
  authErrorMessage: string | null;
  authSuccessMessage: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onBack: () => void;
  onOpenRelatedAsset: (assetId: number) => void;
  onSave: (input: AssetUpdateInput) => Promise<void>;
  relatedAssets: AssetSummaryView[];
  session: AuthSessionView;
}

export function AssetDetailPage({
  asset,
  authErrorMessage,
  authSuccessMessage,
  isLoading,
  isSaving,
  onBack,
  onOpenRelatedAsset,
  onSave,
  relatedAssets,
  session
}: AssetDetailPageProps): React.JSX.Element {
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    if (!asset) {
      return;
    }

    setTitleDraft(asset.title);
    setDescriptionDraft(asset.description ?? "");
    setTagsDraft(asset.tags);
    setTagInput("");
  }, [asset]);

  async function handleSave(): Promise<void> {
    if (!asset) {
      return;
    }

    await onSave({
      title: titleDraft,
      description: descriptionDraft,
      tags: tagsDraft
    });
  }

  if (!session.authenticated) {
    return (
      <Card className="rounded-[28px] border-border shadow-none">
        <CardContent className="flex flex-col items-start gap-4 p-8">
          <Badge variant="warning">로그인 필요</Badge>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">사내 Google 계정으로 로그인하세요.</h2>
            <p className="text-sm text-muted-foreground">
              자산 상세 조회와 다운로드는 `@iportfolio.co.kr` 계정으로만 사용할 수 있습니다.
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
          자산 라이브러리
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{asset?.title ?? "애셋 상세"}</span>
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
          <CardContent className="p-8 text-sm text-muted-foreground">애셋 정보를 불러오는 중입니다.</CardContent>
        </Card>
      ) : !asset ? (
        <Card className="rounded-[28px] border-border shadow-none">
          <CardContent className="flex flex-col items-start gap-4 p-8">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">애셋을 찾을 수 없습니다.</h2>
              <p className="text-sm text-muted-foreground">
                자산 라이브러리로 돌아가 다른 애셋을 선택해 주세요.
              </p>
            </div>
            <Button className="h-10 rounded-xl px-4" onClick={onBack} type="button" variant="outline">
              자산 라이브러리로 돌아가기
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
                  <Badge className="rounded-full bg-blue-100 text-blue-700" variant="secondary">
                    {statusLabelMap[asset.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {typeLabelMap[asset.type]} · v{asset.versionNumber} · {asset.organizationName ?? "조직 미지정"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild className="h-10 rounded-xl bg-primary px-4 text-sm">
                <a href={`/api/assets/${asset.id}/download`}>
                  <Download className="h-4 w-4" />
                  다운로드
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Tabs className="space-y-4" defaultValue="summary">
                <TabsList className="h-auto rounded-full bg-muted p-1">
                  <TabsTrigger className="rounded-full px-4 py-2" value="summary">
                    상세 정보
                  </TabsTrigger>
                  <TabsTrigger className="rounded-full px-4 py-2" value="history">
                    변경 이력
                  </TabsTrigger>
                  <TabsTrigger className="rounded-full px-4 py-2" value="metadata">
                    메타데이터
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <Card className="rounded-[24px] border-border shadow-none">
                    <CardContent className="space-y-6 p-6">
                      <section className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">설명</p>
                        <p className="text-sm leading-7 text-foreground">
                          {asset.description ?? asset.originalFileName}
                        </p>
                      </section>

                      <section className="grid gap-6 border-y border-border py-5 sm:grid-cols-2">
                        <AssetDataField label="카테고리" value={typeLabelMap[asset.type]} />
                        <AssetDataField label="파일 형식" value={asset.fileExtension ?? asset.mimeType} />
                        <AssetDataField label="생성 루트" value={asset.sourceDetail ?? "외부 등록"} />
                        <AssetDataField label="저장 타입" value={asset.sourceType} />
                        <AssetDataField label="원본 파일명" value={asset.originalFileName} />
                        <AssetDataField label="파일 크기" value={formatFileSize(asset.fileSizeBytes)} />
                      </section>

                      <section className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">태그</p>
                        <div className="flex flex-wrap gap-2">
                          {asset.tags.map((tag) => <AssetTagChip key={tag} tag={tag} />)}
                        </div>
                      </section>
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
                        <AssetDataField label="MIME" value={asset.currentFile.mimeType} />
                        <AssetDataField label="현재 버전" value={`v${asset.currentFile.versionNumber}`} />
                        <AssetDataField label="체크섬" value={asset.currentFile.checksumSha256.slice(0, 12)} />
                        <AssetDataField
                          label="해상도"
                          value={
                            asset.widthPx && asset.heightPx
                              ? `${asset.widthPx}x${asset.heightPx}`
                              : "추출 정보 없음"
                          }
                        />
                      </section>

                      <section className="space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
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
                            placeholder="애셋 설명을 입력하세요"
                            value={descriptionDraft}
                          />
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">태그</p>
                          <div className="flex flex-wrap gap-2">
                            {tagsDraft.map((tag) => (
                              <button
                                className="inline-flex items-center gap-1 rounded-full bg-[#efe7ff] px-3 py-1 text-xs font-medium text-[#6d4ae2]"
                                key={tag}
                                onClick={() =>
                                  setTagsDraft((currentTags) => currentTags.filter((value) => value !== tag))
                                }
                                type="button"
                              >
                                {tag}
                                <X className="h-3 w-3" />
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-none">
                            <Input
                              className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                              onChange={(event) => setTagInput(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  const normalizedTag = normalizeTag(tagInput);
                                  if (!normalizedTag) {
                                    return;
                                  }
                                  setTagsDraft((currentTags) =>
                                    currentTags.includes(normalizedTag)
                                      ? currentTags
                                      : [...currentTags, normalizedTag]
                                  );
                                  setTagInput("");
                                }
                              }}
                              placeholder="태그 추가"
                              value={tagInput}
                            />
                            <button
                              className="text-xs font-medium text-primary"
                              onClick={() => {
                                const normalizedTag = normalizeTag(tagInput);
                                if (!normalizedTag) {
                                  return;
                                }
                                setTagsDraft((currentTags) =>
                                  currentTags.includes(normalizedTag)
                                    ? currentTags
                                    : [...currentTags, normalizedTag]
                                );
                                setTagInput("");
                              }}
                              type="button"
                            >
                              추가
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            className="h-10 rounded-xl px-4"
                            disabled={isSaving}
                            onClick={() => void handleSave()}
                            type="button"
                          >
                            <Save className="h-4 w-4" />
                            {isSaving ? "저장 중" : "변경 저장"}
                          </Button>
                        </div>
                      </section>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">
              <Card className="rounded-[24px] border-border shadow-none">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm">상태 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SidebarField
                    label="상태"
                    value={<AssetStatusChip status={asset.status} />}
                  />
                  <SidebarDivider />
                  <SidebarField label="버전" value={`v${asset.versionNumber}`} />
                  <SidebarDivider />
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
                  <CardTitle className="text-sm">관련 애셋</CardTitle>
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
                    <p className="text-sm text-muted-foreground">표시할 관련 애셋이 없습니다.</p>
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

function normalizeTag(value: string): string | null {
  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}
