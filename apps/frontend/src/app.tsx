import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { dashboardApi } from "./api/client";
import { createAnonymousSession } from "./api/auth";
import type { AuthSessionView } from "./api/types";
import { AssetDetailPageContainer } from "./pages/asset-library/asset-detail-page-container";
import { AssetLibraryPageContainer } from "./pages/asset-library/asset-library-page-container";
import { AdminPageContainer } from "./pages/admin/admin-page-container";
import { HubEpisodePageContainer } from "./pages/hub/hub-episode-page-container";
import { ProjectDetailPageContainer } from "./pages/project/project-detail-page-container";
import { LandingPage } from "./pages/landing/landing-page";
import { type AdminTabKey, type DashboardNavigationKey, DashboardShell } from "./components/dashboard-shell";
import { PatchNotesModal } from "./components/patch-notes-modal";
import { usePatchNotes } from "./lib/use-patch-notes";

interface AppLocationState {
  activeNavigationKey: DashboardNavigationKey;
  selectedAssetId: number | null;
  selectedHubEpisodeKey: string | null;
  selectedProjectKey: string | null;
}

const ASSET_ID_PARAM = "assetId";
const EPISODE_PARAM = "episode";
const PROJECT_PARAM = "project";
const SECTION_PARAM = "section";
function readAppLocation(location: Location = window.location): AppLocationState {
  const params = new URLSearchParams(location.search);
  const sectionParam = params.get(SECTION_PARAM);
  const activeNavigationKey: DashboardNavigationKey =
    sectionParam === "admin"
      ? "admin"
      : sectionParam === "series"
        ? "series"
        : sectionParam === "projects"
          ? "projects"
          : "assets";
  const rawEpisodeKey = activeNavigationKey === "series" ? params.get(EPISODE_PARAM)?.trim() : null;
  const rawProjectKey = activeNavigationKey === "projects" ? params.get(PROJECT_PARAM)?.trim() : null;
  const rawAssetId = activeNavigationKey === "assets" ? params.get(ASSET_ID_PARAM) : null;
  const parsedAssetId = rawAssetId ? Number(rawAssetId) : Number.NaN;

  return {
    activeNavigationKey,
    selectedAssetId:
      activeNavigationKey === "assets" && Number.isFinite(parsedAssetId) ? parsedAssetId : null,
    selectedHubEpisodeKey: rawEpisodeKey ? rawEpisodeKey : null,
    selectedProjectKey: rawProjectKey ? rawProjectKey : null
  };
}

function writeAppLocation(nextState: AppLocationState, method: "push" | "replace" = "push"): void {
  const nextUrl = new URL(window.location.href);

  if (nextState.activeNavigationKey === "assets") {
    nextUrl.searchParams.delete(SECTION_PARAM);
    nextUrl.searchParams.delete(EPISODE_PARAM);
    nextUrl.searchParams.delete(PROJECT_PARAM);

    if (nextState.selectedAssetId !== null) {
      nextUrl.searchParams.set(ASSET_ID_PARAM, String(nextState.selectedAssetId));
    } else {
      nextUrl.searchParams.delete(ASSET_ID_PARAM);
    }
  } else if (nextState.activeNavigationKey === "series") {
    nextUrl.searchParams.set(SECTION_PARAM, "series");
    nextUrl.searchParams.delete(ASSET_ID_PARAM);
    nextUrl.searchParams.delete(PROJECT_PARAM);

    if (nextState.selectedHubEpisodeKey !== null) {
      nextUrl.searchParams.set(EPISODE_PARAM, nextState.selectedHubEpisodeKey);
    } else {
      nextUrl.searchParams.delete(EPISODE_PARAM);
    }
  } else if (nextState.activeNavigationKey === "projects") {
    nextUrl.searchParams.set(SECTION_PARAM, "projects");
    nextUrl.searchParams.delete(ASSET_ID_PARAM);
    nextUrl.searchParams.delete(EPISODE_PARAM);

    if (nextState.selectedProjectKey !== null) {
      nextUrl.searchParams.set(PROJECT_PARAM, nextState.selectedProjectKey);
    } else {
      nextUrl.searchParams.delete(PROJECT_PARAM);
    }
  } else {
    nextUrl.searchParams.set(SECTION_PARAM, "admin");
    nextUrl.searchParams.delete(ASSET_ID_PARAM);
    nextUrl.searchParams.delete(EPISODE_PARAM);
    nextUrl.searchParams.delete(PROJECT_PARAM);
  }

  const nextSearch = nextUrl.searchParams.toString();
  const nextPath = `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextUrl.hash}`;

  if (method === "replace") {
    window.history.replaceState({}, document.title, nextPath);
    return;
  }

  window.history.pushState({}, document.title, nextPath);
}

export function App(): React.JSX.Element {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTabKey>("users");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [hubNavigationRefreshKey, setHubNavigationRefreshKey] = useState(0);
  const [projectNavigationRefreshKey, setProjectNavigationRefreshKey] = useState(0);
  const [locationState, setLocationState] = useState<AppLocationState>(() => readAppLocation());
  const [session, setSession] = useState<AuthSessionView | null>(null);
  const patchNotesController = usePatchNotes(session?.authenticated === true);

  useEffect(() => {
    let isActive = true;

    async function loadSession(): Promise<void> {
      try {
        const nextSession = await dashboardApi.getSession();
        if (!isActive) return;
        setSession(nextSession);
      } catch {
        if (!isActive) return;
        setSession(createAnonymousSession());
      }
    }

    void loadSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    function syncLocation(): void {
      setLocationState(readAppLocation());
    }

    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  const navigateTo = useCallback((nextState: AppLocationState, method: "push" | "replace" = "push"): void => {
    setLocationState(nextState);
    writeAppLocation(nextState, method);
  }, []);

  const handleNavigation = useCallback((navigationKey: DashboardNavigationKey): void => {
    navigateTo({
      activeNavigationKey: navigationKey,
      selectedAssetId: null,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleOpenAssetDetailPage = useCallback((assetId: number): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: assetId,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleOpenAssetDetailPageFromEpisode = useCallback((assetId: number): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: assetId,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleOpenHubEpisode = useCallback((episodeKey: string): void => {
    navigateTo({
      activeNavigationKey: "series",
      selectedAssetId: null,
      selectedHubEpisodeKey: episodeKey,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleOpenProject = useCallback((projectKey: string): void => {
    navigateTo({
      activeNavigationKey: "projects",
      selectedAssetId: null,
      selectedHubEpisodeKey: null,
      selectedProjectKey: projectKey
    });
  }, [navigateTo]);

  const handleCloseAssetDetail = useCallback((): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleHubStructureChanged = useCallback((): void => {
    setHubNavigationRefreshKey((currentValue) => currentValue + 1);
  }, []);

  const handleHubEpisodeDeleted = useCallback((): void => {
    setHubNavigationRefreshKey((currentValue) => currentValue + 1);
    navigateTo({
      activeNavigationKey: "series",
      selectedAssetId: null,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  const handleProjectChanged = useCallback((): void => {
    setProjectNavigationRefreshKey((currentValue) => currentValue + 1);
  }, []);

  const handleProjectDeleted = useCallback((): void => {
    setProjectNavigationRefreshKey((currentValue) => currentValue + 1);
    navigateTo({
      activeNavigationKey: "projects",
      selectedAssetId: null,
      selectedHubEpisodeKey: null,
      selectedProjectKey: null
    });
  }, [navigateTo]);

  if (session === null || !session.authenticated) {
    const resolvedSession = session ?? createAnonymousSession();

    return (
      <LandingPage
        isLoading={session === null}
        loginConfigured={resolvedSession.loginConfigured}
      />
    );
  }

  return (
    <>
      <DashboardShell
        activeAdminTab={activeAdminTab}
        activeNavigationKey={locationState.activeNavigationKey}
        hubNavigationRefreshKey={hubNavigationRefreshKey}
        onAdminTabChange={setActiveAdminTab}
        onNavigate={handleNavigation}
        onOpenHubEpisode={handleOpenHubEpisode}
        onOpenProject={handleOpenProject}
        projectNavigationRefreshKey={projectNavigationRefreshKey}
        selectedHubEpisodeKey={locationState.selectedHubEpisodeKey}
        selectedProjectKey={locationState.selectedProjectKey}
        session={session}
      >
      {locationState.activeNavigationKey === "assets" ? (
        locationState.selectedAssetId !== null ? (
          <AssetDetailPageContainer
            assetId={locationState.selectedAssetId}
            onBack={handleCloseAssetDetail}
            onDeleted={handleCloseAssetDetail}
            onOpenRelatedAsset={handleOpenAssetDetailPage}
            session={session}
          />
        ) : (
          <AssetLibraryPageContainer
            onOpenAssetPage={handleOpenAssetDetailPage}
            onSearchQueryChange={setAssetSearchQuery}
            searchQuery={assetSearchQuery}
            session={session}
          />
        )
      ) : locationState.activeNavigationKey === "series" ? (
        locationState.selectedHubEpisodeKey !== null ? (
          <HubEpisodePageContainer
            episodeKey={locationState.selectedHubEpisodeKey}
            onDeleted={handleHubEpisodeDeleted}
            onHubStructureChanged={handleHubStructureChanged}
            onOpenAssetPage={handleOpenAssetDetailPageFromEpisode}
          />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-lg font-semibold">에피소드를 선택하세요</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                왼쪽 시리즈 트리에서 에피소드를 선택하면 슬롯 관리 화면이 표시됩니다.
              </p>
            </div>
          </div>
        )
      ) : locationState.activeNavigationKey === "projects" ? (
        locationState.selectedProjectKey !== null ? (
          <ProjectDetailPageContainer
            onDeleted={handleProjectDeleted}
            onOpenAssetPage={handleOpenAssetDetailPageFromEpisode}
            onProjectChanged={handleProjectChanged}
            projectKey={locationState.selectedProjectKey}
          />
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
              <p className="text-lg font-semibold">프로젝트를 선택하세요</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                왼쪽 프로젝트 사이드바에서 프로젝트를 선택하면 상세 화면이 표시됩니다.
              </p>
            </div>
          </div>
        )
      ) : (
        <AdminPageContainer activeTab={activeAdminTab} session={session} />
      )}
    </DashboardShell>
      <PatchNotesModal
        isOpen={patchNotesController.isOpen}
        latestPatchNote={patchNotesController.latestPatchNote}
        onClose={patchNotesController.close}
        onDismissForWeek={patchNotesController.dismissForWeek}
      />
    </>
  );
}
