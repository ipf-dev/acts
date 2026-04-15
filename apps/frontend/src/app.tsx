import { useCallback, useEffect, useState } from "react";
import type React from "react";
import { dashboardApi } from "./api/client";
import { createAnonymousSession } from "./api/auth";
import type { AuthSessionView } from "./api/types";
import { AssetDetailPageContainer } from "./pages/asset-library/asset-detail-page-container";
import { AssetLibraryPageContainer } from "./pages/asset-library/asset-library-page-container";
import { AdminPageContainer } from "./pages/admin/admin-page-container";
import { HubEpisodePageContainer } from "./pages/hub/hub-episode-page-container";
import { LandingPage } from "./pages/landing/landing-page";
import { type AdminTabKey, type DashboardNavigationKey, DashboardShell } from "./components/dashboard-shell";

interface AppLocationState {
  activeNavigationKey: DashboardNavigationKey;
  selectedAssetId: number | null;
  selectedHubEpisodeKey: string | null;
}

const ASSET_ID_PARAM = "assetId";
const EPISODE_PARAM = "episode";
const SECTION_PARAM = "section";
function readAppLocation(location: Location = window.location): AppLocationState {
  const params = new URLSearchParams(location.search);
  const activeNavigationKey = params.get(SECTION_PARAM) === "admin" ? "admin" : "assets";
  const rawEpisodeKey = activeNavigationKey === "assets" ? params.get(EPISODE_PARAM)?.trim() : null;
  const rawAssetId = activeNavigationKey === "assets" ? params.get(ASSET_ID_PARAM) : null;
  const parsedAssetId = rawAssetId ? Number(rawAssetId) : Number.NaN;

  return {
    activeNavigationKey,
    selectedAssetId:
      activeNavigationKey === "assets" && Number.isFinite(parsedAssetId) ? parsedAssetId : null,
    selectedHubEpisodeKey: rawEpisodeKey ? rawEpisodeKey : null
  };
}

function writeAppLocation(nextState: AppLocationState, method: "push" | "replace" = "push"): void {
  const nextUrl = new URL(window.location.href);

  if (nextState.activeNavigationKey === "admin") {
    nextUrl.searchParams.set(SECTION_PARAM, "admin");
    nextUrl.searchParams.delete(ASSET_ID_PARAM);
    nextUrl.searchParams.delete(EPISODE_PARAM);
  } else {
    nextUrl.searchParams.delete(SECTION_PARAM);

    if (nextState.selectedAssetId !== null) {
      nextUrl.searchParams.set(ASSET_ID_PARAM, String(nextState.selectedAssetId));
      if (nextState.selectedHubEpisodeKey !== null) {
        nextUrl.searchParams.set(EPISODE_PARAM, nextState.selectedHubEpisodeKey);
      } else {
        nextUrl.searchParams.delete(EPISODE_PARAM);
      }
    } else if (nextState.selectedHubEpisodeKey !== null) {
      nextUrl.searchParams.delete(ASSET_ID_PARAM);
      nextUrl.searchParams.set(EPISODE_PARAM, nextState.selectedHubEpisodeKey);
    } else {
      nextUrl.searchParams.delete(ASSET_ID_PARAM);
      nextUrl.searchParams.delete(EPISODE_PARAM);
    }
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
  const [locationState, setLocationState] = useState<AppLocationState>(() => readAppLocation());
  const [session, setSession] = useState<AuthSessionView | null>(null);

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
      selectedHubEpisodeKey: null
    });
  }, [navigateTo]);

  const handleOpenAssetLibrary = useCallback((): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null,
      selectedHubEpisodeKey: null
    });
  }, [navigateTo]);

  const handleOpenAssetDetailPage = useCallback((assetId: number): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: assetId,
      selectedHubEpisodeKey: null
    });
  }, [navigateTo]);

  const handleOpenAssetDetailPageFromEpisode = useCallback((assetId: number): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: assetId,
      selectedHubEpisodeKey: locationState.selectedHubEpisodeKey
    });
  }, [locationState.selectedHubEpisodeKey, navigateTo]);

  const handleOpenHubEpisode = useCallback((episodeKey: string): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null,
      selectedHubEpisodeKey: episodeKey
    });
  }, [navigateTo]);

  const handleCloseAssetDetail = useCallback((): void => {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null,
      selectedHubEpisodeKey: locationState.selectedHubEpisodeKey
    });
  }, [locationState.selectedHubEpisodeKey, navigateTo]);

  const handleHubStructureChanged = useCallback((): void => {
    setHubNavigationRefreshKey((currentValue) => currentValue + 1);
  }, []);

  const handleHubEpisodeDeleted = useCallback((): void => {
    setHubNavigationRefreshKey((currentValue) => currentValue + 1);
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null,
      selectedHubEpisodeKey: null
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
    <DashboardShell
      activeAdminTab={activeAdminTab}
      activeNavigationKey={locationState.activeNavigationKey}
      hubNavigationRefreshKey={hubNavigationRefreshKey}
      isAssetLibraryActive={
        locationState.activeNavigationKey === "assets" && locationState.selectedHubEpisodeKey === null
      }
      onAdminTabChange={setActiveAdminTab}
      onNavigate={handleNavigation}
      onOpenAssetLibrary={handleOpenAssetLibrary}
      onOpenHubEpisode={handleOpenHubEpisode}
      selectedHubEpisodeKey={locationState.selectedHubEpisodeKey}
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
        ) : locationState.selectedHubEpisodeKey !== null ? (
          <HubEpisodePageContainer
            episodeKey={locationState.selectedHubEpisodeKey}
            onDeleted={handleHubEpisodeDeleted}
            onHubStructureChanged={handleHubStructureChanged}
            onOpenAssetPage={handleOpenAssetDetailPageFromEpisode}
          />
        ) : (
          <AssetLibraryPageContainer
            onOpenAssetPage={handleOpenAssetDetailPage}
            onSearchQueryChange={setAssetSearchQuery}
            searchQuery={assetSearchQuery}
            session={session}
          />
        )
      ) : (
        <AdminPageContainer activeTab={activeAdminTab} session={session} />
      )}
    </DashboardShell>
  );
}
