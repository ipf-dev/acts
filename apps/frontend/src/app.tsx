import { useEffect, useState } from "react";
import { AssetDetailPageContainer } from "./pages/asset-library/asset-detail-page-container";
import { AssetLibraryPageContainer } from "./pages/asset-library/asset-library-page-container";
import { DashboardHomePageContainer } from "./pages/dashboard/dashboard-home-page-container";
import { type DashboardNavigationKey, DashboardShell } from "./pages/dashboard/dashboard-shell";

interface AppLocationState {
  activeNavigationKey: DashboardNavigationKey;
  selectedAssetId: number | null;
}

const ASSET_ID_PARAM = "assetId";
const SECTION_PARAM = "section";

function readAppLocation(location: Location = window.location): AppLocationState {
  const params = new URLSearchParams(location.search);
  const activeNavigationKey = params.get(SECTION_PARAM) === "admin" ? "admin" : "assets";
  const rawAssetId = activeNavigationKey === "assets" ? params.get(ASSET_ID_PARAM) : null;
  const parsedAssetId = rawAssetId ? Number(rawAssetId) : Number.NaN;

  return {
    activeNavigationKey,
    selectedAssetId:
      activeNavigationKey === "assets" && Number.isFinite(parsedAssetId) ? parsedAssetId : null
  };
}

function writeAppLocation(nextState: AppLocationState, method: "push" | "replace" = "push"): void {
  const nextUrl = new URL(window.location.href);

  if (nextState.activeNavigationKey === "admin") {
    nextUrl.searchParams.set(SECTION_PARAM, "admin");
    nextUrl.searchParams.delete(ASSET_ID_PARAM);
  } else {
    nextUrl.searchParams.delete(SECTION_PARAM);

    if (nextState.selectedAssetId) {
      nextUrl.searchParams.set(ASSET_ID_PARAM, String(nextState.selectedAssetId));
    } else {
      nextUrl.searchParams.delete(ASSET_ID_PARAM);
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
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [locationState, setLocationState] = useState<AppLocationState>(() => readAppLocation());

  useEffect(() => {
    function syncLocation(): void {
      setLocationState(readAppLocation());
    }

    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  function navigateTo(nextState: AppLocationState, method: "push" | "replace" = "push"): void {
    setLocationState(nextState);
    writeAppLocation(nextState, method);
  }

  function handleNavigation(navigationKey: DashboardNavigationKey): void {
    navigateTo({
      activeNavigationKey: navigationKey,
      selectedAssetId: null
    });
  }

  function handleOpenAssetDetailPage(assetId: number): void {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: assetId
    });
  }

  function handleCloseAssetDetail(): void {
    navigateTo({
      activeNavigationKey: "assets",
      selectedAssetId: null
    });
  }

  return (
    <DashboardShell
      activeNavigationKey={locationState.activeNavigationKey}
      assetSearchQuery={assetSearchQuery}
      onNavigate={handleNavigation}
      onSearchAssetLibrary={setAssetSearchQuery}
      title="acts"
    >
      {locationState.activeNavigationKey === "assets" ? (
        locationState.selectedAssetId ? (
          <AssetDetailPageContainer
            assetId={locationState.selectedAssetId}
            onBack={handleCloseAssetDetail}
            onDeleted={handleCloseAssetDetail}
            onOpenRelatedAsset={handleOpenAssetDetailPage}
          />
        ) : (
          <AssetLibraryPageContainer
            onOpenAssetPage={handleOpenAssetDetailPage}
            onSearchQueryChange={setAssetSearchQuery}
            searchQuery={assetSearchQuery}
          />
        )
      ) : (
        <DashboardHomePageContainer />
      )}
    </DashboardShell>
  );
}
