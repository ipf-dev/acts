import { useCallback, useEffect, useState } from "react";
import type React from "react";
import {
  BookMarked,
  ChevronDown,
  FolderOpen,
  Plus
} from "lucide-react";
import { dashboardApi } from "../../api/client";
import type { HubSeriesNavigationView } from "../../api/types";
import { cn, hasDistinctEpisodeTitle, parseEpisodeCodeNumber } from "../../lib/utils";
import { HubEpisodeFormModal } from "./hub-episode-form-modal";
import { HubLevelFormModal } from "./hub-level-form-modal";
import { HubSeriesFormModal } from "./hub-series-form-modal";

interface HubSidebarPanelProps {
  hasAssetLibraryAccess: boolean;
  hubNavigationRefreshKey: number;
  isAssetLibraryActive: boolean;
  onOpenAssetLibrary: () => void;
  onOpenHubEpisode: (episodeKey: string) => void;
  selectedHubEpisodeKey: string | null;
}

const secondaryActionButtonClassName =
  "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none";

export function HubSidebarPanel({
  hasAssetLibraryAccess,
  hubNavigationRefreshKey,
  isAssetLibraryActive,
  onOpenAssetLibrary,
  onOpenHubEpisode,
  selectedHubEpisodeKey
}: HubSidebarPanelProps): React.JSX.Element {
  const [createLevelErrorMessage, setCreateLevelErrorMessage] = useState<string | null>(null);
  const [createLevelNumber, setCreateLevelNumber] = useState("1");
  const [createLevelSeries, setCreateLevelSeries] = useState<{ key: string; label: string } | null>(null);
  const [createEpisodeDescription, setCreateEpisodeDescription] = useState("");
  const [createEpisodeErrorMessage, setCreateEpisodeErrorMessage] = useState<string | null>(null);
  const [createEpisodeLevel, setCreateEpisodeLevel] = useState<{ key: string; label: string } | null>(null);
  const [createEpisodeName, setCreateEpisodeName] = useState("");
  const [createEpisodeNumber, setCreateEpisodeNumber] = useState("1");
  const [createSeriesErrorMessage, setCreateSeriesErrorMessage] = useState<string | null>(null);
  const [createSeriesName, setCreateSeriesName] = useState("");
  const [isCreatingLevel, setIsCreatingLevel] = useState(false);
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [isSeriesDialogOpen, setIsSeriesDialogOpen] = useState(false);
  const [expandedSeriesKeys, setExpandedSeriesKeys] = useState<string[]>([]);
  const [expandedLevelKeys, setExpandedLevelKeys] = useState<string[]>([]);
  const [hubSeriesItems, setHubSeriesItems] = useState<HubSeriesNavigationView[]>([]);
  const [hubNavigationError, setHubNavigationError] = useState<string | null>(null);
  const [isHubNavigationLoading, setIsHubNavigationLoading] = useState(false);

  const loadHubNavigation = useCallback(async (): Promise<void> => {
    if (!hasAssetLibraryAccess) {
      setHubSeriesItems([]);
      setHubNavigationError(null);
      setIsHubNavigationLoading(false);
      return;
    }

    setIsHubNavigationLoading(true);
    setHubNavigationError(null);

    try {
      const response = await dashboardApi.getHubNavigation();
      setHubSeriesItems(response.series);
      setIsHubNavigationLoading(false);
    } catch {
      setHubSeriesItems([]);
      setHubNavigationError("시리즈 구조를 불러오지 못했습니다.");
      setIsHubNavigationLoading(false);
    }
  }, [hasAssetLibraryAccess]);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!isActive) {
        return;
      }
      await loadHubNavigation();
    })();

    return () => {
      isActive = false;
    };
  }, [hubNavigationRefreshKey, loadHubNavigation]);

  useEffect(() => {
    const nextSeriesKeys = hubSeriesItems.map((item) => item.key);
    const nextLevelKeys = hubSeriesItems.flatMap((item) => item.levels.map((level) => level.key));

    setExpandedSeriesKeys((currentValue) => {
      const filteredValue = currentValue.filter((key) => nextSeriesKeys.includes(key));
      return filteredValue.length > 0 ? filteredValue : nextSeriesKeys;
    });
    setExpandedLevelKeys((currentValue) => {
      const filteredValue = currentValue.filter((key) => nextLevelKeys.includes(key));
      return filteredValue.length > 0 ? filteredValue : nextLevelKeys;
    });
  }, [hubSeriesItems]);

  function toggleSeries(key: string): void {
    setExpandedSeriesKeys((currentValue) =>
      currentValue.includes(key)
        ? currentValue.filter((currentKey) => currentKey !== key)
        : [...currentValue, key]
    );
  }

  function toggleLevel(key: string): void {
    setExpandedLevelKeys((currentValue) =>
      currentValue.includes(key)
        ? currentValue.filter((currentKey) => currentKey !== key)
        : [...currentValue, key]
    );
  }

  function openCreateEpisodeDialog(levelKey: string, levelLabel: string, nextEpisodeNumber: number): void {
    setCreateEpisodeLevel({ key: levelKey, label: levelLabel });
    setCreateEpisodeName("");
    setCreateEpisodeNumber(String(nextEpisodeNumber));
    setCreateEpisodeDescription("");
    setCreateEpisodeErrorMessage(null);
  }

  function openCreateSeriesDialog(): void {
    setCreateSeriesName("");
    setCreateSeriesErrorMessage(null);
    setIsSeriesDialogOpen(true);
  }

  function closeCreateSeriesDialog(): void {
    if (isCreatingSeries) {
      return;
    }

    setCreateSeriesName("");
    setCreateSeriesErrorMessage(null);
    setIsSeriesDialogOpen(false);
  }

  function openCreateLevelDialog(seriesKey: string, seriesLabel: string, nextLevelNumber: number): void {
    setCreateLevelSeries({ key: seriesKey, label: seriesLabel });
    setCreateLevelNumber(String(nextLevelNumber));
    setCreateLevelErrorMessage(null);
  }

  function closeCreateLevelDialog(): void {
    if (isCreatingLevel) {
      return;
    }

    setCreateLevelSeries(null);
    setCreateLevelNumber("1");
    setCreateLevelErrorMessage(null);
  }

  function closeCreateEpisodeDialog(): void {
    if (isCreatingEpisode) {
      return;
    }

    setCreateEpisodeLevel(null);
    setCreateEpisodeName("");
    setCreateEpisodeNumber("1");
    setCreateEpisodeDescription("");
    setCreateEpisodeErrorMessage(null);
  }

  async function handleCreateSeries(): Promise<void> {
    setIsCreatingSeries(true);
    setCreateSeriesErrorMessage(null);

    try {
      const createdSeries = await dashboardApi.createHubSeries({
        name: createSeriesName
      });
      setExpandedSeriesKeys((currentValue) =>
        currentValue.includes(createdSeries.key) ? currentValue : [...currentValue, createdSeries.key]
      );
      await loadHubNavigation();
      setCreateSeriesName("");
      setCreateSeriesErrorMessage(null);
      setIsSeriesDialogOpen(false);
    } catch {
      setCreateSeriesErrorMessage("시리즈 생성에 실패했습니다.");
    } finally {
      setIsCreatingSeries(false);
    }
  }

  async function handleCreateLevel(): Promise<void> {
    if (createLevelSeries === null) {
      return;
    }

    const levelNumber = Number.parseInt(createLevelNumber, 10);
    if (Number.isNaN(levelNumber) || levelNumber < 1) {
      setCreateLevelErrorMessage("생성할 레벨 번호를 입력해주세요.");
      return;
    }

    setIsCreatingLevel(true);
    setCreateLevelErrorMessage(null);

    try {
      const createdLevel = await dashboardApi.createHubLevel(createLevelSeries.key, {
        levelNumber
      });
      setExpandedSeriesKeys((currentValue) =>
        currentValue.includes(createLevelSeries.key)
          ? currentValue
          : [...currentValue, createLevelSeries.key]
      );
      setExpandedLevelKeys((currentValue) =>
        currentValue.includes(createdLevel.key) ? currentValue : [...currentValue, createdLevel.key]
      );
      await loadHubNavigation();
      setCreateLevelSeries(null);
      setCreateLevelNumber("1");
      setCreateLevelErrorMessage(null);
    } catch {
      setCreateLevelErrorMessage("레벨 생성에 실패했습니다.");
    } finally {
      setIsCreatingLevel(false);
    }
  }

  async function handleCreateEpisode(): Promise<void> {
    if (createEpisodeLevel === null) {
      return;
    }

    const episodeNumber = Number.parseInt(createEpisodeNumber, 10);
    if (Number.isNaN(episodeNumber) || episodeNumber < 1) {
      setCreateEpisodeErrorMessage("생성할 EP 번호를 입력해주세요.");
      return;
    }

    setIsCreatingEpisode(true);
    setCreateEpisodeErrorMessage(null);

    try {
      const createdEpisode = await dashboardApi.createHubEpisode(createEpisodeLevel.key, {
        name: createEpisodeName,
        description: createEpisodeDescription,
        episodeNumber
      });
      await loadHubNavigation();
      setCreateEpisodeLevel(null);
      setCreateEpisodeName("");
      setCreateEpisodeNumber("1");
      setCreateEpisodeDescription("");
      setCreateEpisodeErrorMessage(null);
      onOpenHubEpisode(createdEpisode.episodeKey);
    } catch {
      setCreateEpisodeErrorMessage("에피소드 생성에 실패했습니다.");
    } finally {
      setIsCreatingEpisode(false);
    }
  }

  return (
    <>
      <aside className="hidden border-r border-sidebar-border bg-white/88 backdrop-blur-sm lg:flex lg:flex-col">
        <div className="flex h-[84px] items-center border-b border-sidebar-border px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Hub
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              콘텐츠 허브
            </h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!hasAssetLibraryAccess ? (
            <div className="rounded-3xl border border-border bg-card px-4 py-5 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Hub 접근 권한이 없습니다</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                현재 계정에는 Hub 내부 기능이 허용되지 않았습니다. 관리자에게 권한을 요청하세요.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <section>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Browse
                </p>
                <div className="mt-3 space-y-1">
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition-all",
                      isAssetLibraryActive
                        ? "border-border bg-card text-foreground shadow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground"
                    )}
                    onClick={onOpenAssetLibrary}
                    type="button"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-foreground">
                      <FolderOpen className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">에셋 라이브러리</p>
                      <p className="truncate text-xs text-muted-foreground">
                        파일, 링크, 메타데이터 탐색
                      </p>
                    </div>
                  </button>
                </div>
              </section>

              <section className="rounded-[26px] border border-border bg-card/95 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3 px-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">시리즈</p>
                  </div>
                  <button
                    aria-label="시리즈 추가"
                    className={secondaryActionButtonClassName}
                    onClick={openCreateSeriesDialog}
                    title="시리즈 추가"
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {hubNavigationError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                      {hubNavigationError}
                    </div>
                  ) : isHubNavigationLoading ? (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      시리즈 구조를 불러오는 중입니다.
                    </div>
                  ) : hubSeriesItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      아직 등록된 시리즈가 없습니다.
                    </div>
                  ) : hubSeriesItems.map((series) => {
                    const isSeriesExpanded = expandedSeriesKeys.includes(series.key);
                    const nextLevelNumber =
                      series.levels.reduce((maxValue, level) => {
                        const parsedLevelNumber = parseLevelNumber(level.label);
                        return parsedLevelNumber === null
                          ? maxValue
                          : Math.max(maxValue, parsedLevelNumber);
                      }, 0) + 1;

                    return (
                      <div
                        className="rounded-2xl border border-border/80 bg-background/90 px-2 py-2"
                        key={series.key}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            aria-expanded={isSeriesExpanded}
                            aria-label={`${series.label} 펼치기`}
                            className={secondaryActionButtonClassName}
                            onClick={() => toggleSeries(series.key)}
                            type="button"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                !isSeriesExpanded && "-rotate-90"
                              )}
                            />
                          </button>
                          <button
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/60"
                            onClick={() => toggleSeries(series.key)}
                            type="button"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground">
                              <BookMarked className="h-3.5 w-3.5" />
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">
                              {series.label}
                            </span>
                          </button>
                          <button
                            aria-label={`${series.label} 레벨 추가`}
                            className={secondaryActionButtonClassName}
                            onClick={() => openCreateLevelDialog(series.key, series.label, nextLevelNumber)}
                            title="레벨 추가"
                            type="button"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {isSeriesExpanded ? (
                          <div className="ml-5 mt-2 space-y-1.5 border-l border-sidebar-border pl-3">
                            {series.levels.map((level) => {
                              const isLevelExpanded = expandedLevelKeys.includes(level.key);
                              const nextEpisodeNumber = level.episodes.reduce((maxValue, episode) => {
                                const episodeNumber = parseEpisodeCodeNumber(episode.code);
                                return episodeNumber === null ? maxValue : Math.max(maxValue, episodeNumber);
                              }, 0) + 1;

                              return (
                                <div className="space-y-1" key={level.key}>
                                  <div className="flex items-center gap-1 rounded-xl px-1 py-0.5 transition-colors hover:bg-accent/35">
                                    <button
                                      aria-expanded={isLevelExpanded}
                                      aria-label={`${level.label} 펼치기`}
                                      className={secondaryActionButtonClassName}
                                      onClick={() => toggleLevel(level.key)}
                                      type="button"
                                    >
                                      <ChevronDown
                                        className={cn(
                                          "h-4 w-4 transition-transform",
                                          !isLevelExpanded && "-rotate-90"
                                        )}
                                      />
                                    </button>
                                    <button
                                      className="flex min-w-0 flex-1 items-center rounded-lg px-2 py-1.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-accent/60"
                                      onClick={() => toggleLevel(level.key)}
                                      type="button"
                                    >
                                      <span className="truncate">{level.label}</span>
                                    </button>
                                    <button
                                      aria-label={`${level.label} EP 추가`}
                                      className={secondaryActionButtonClassName}
                                      onClick={() =>
                                        openCreateEpisodeDialog(level.key, level.label, nextEpisodeNumber)
                                      }
                                      title="EP 추가"
                                      type="button"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {isLevelExpanded ? (
                                    <div className="ml-5 space-y-0.5 border-l border-sidebar-border/70 pl-3">
                                      {level.episodes.map((episode) => (
                                        <button
                                          className={cn(
                                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors",
                                            selectedHubEpisodeKey === episode.key
                                              ? "border border-primary/20 bg-primary/[0.08] text-foreground shadow-sm"
                                              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                                          )}
                                          key={episode.key}
                                          onClick={() => onOpenHubEpisode(episode.key)}
                                          type="button"
                                        >
                                          <span
                                            className={cn(
                                              "h-1.5 w-1.5 shrink-0 rounded-full",
                                              selectedHubEpisodeKey === episode.key
                                                ? "bg-primary"
                                                : "bg-emerald-500"
                                            )}
                                          />
                                          <span className="w-10 shrink-0 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                                            {episode.code}
                                          </span>
                                          {hasDistinctEpisodeTitle(episode.code, episode.title) ? (
                                            <span className="min-w-0 truncate font-medium">
                                              {episode.title}
                                            </span>
                                          ) : null}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </aside>

      <HubEpisodeFormModal
        description={createEpisodeDescription}
        errorMessage={createEpisodeErrorMessage}
        episodeNumber={createEpisodeNumber}
        isOpen={createEpisodeLevel !== null}
        isSaving={isCreatingEpisode}
        mode="CREATE"
        name={createEpisodeName}
        onClose={closeCreateEpisodeDialog}
        onDescriptionChange={setCreateEpisodeDescription}
        onEpisodeNumberChange={setCreateEpisodeNumber}
        onNameChange={setCreateEpisodeName}
        onSubmit={() => void handleCreateEpisode()}
        scopeLabel={createEpisodeLevel?.label ?? null}
      />
      <HubSeriesFormModal
        errorMessage={createSeriesErrorMessage}
        isOpen={isSeriesDialogOpen}
        isSaving={isCreatingSeries}
        name={createSeriesName}
        onClose={closeCreateSeriesDialog}
        onNameChange={setCreateSeriesName}
        onSubmit={() => void handleCreateSeries()}
      />
      <HubLevelFormModal
        errorMessage={createLevelErrorMessage}
        isOpen={createLevelSeries !== null}
        isSaving={isCreatingLevel}
        levelNumber={createLevelNumber}
        onClose={closeCreateLevelDialog}
        onLevelNumberChange={setCreateLevelNumber}
        onSubmit={() => void handleCreateLevel()}
        seriesLabel={createLevelSeries?.label ?? null}
      />
    </>
  );
}

function parseLevelNumber(label: string): number | null {
  const matchedNumber = label.match(/(\d+)/);
  if (!matchedNumber?.[1]) {
    return null;
  }

  const parsedNumber = Number.parseInt(matchedNumber[1], 10);
  return Number.isNaN(parsedNumber) ? null : parsedNumber;
}
