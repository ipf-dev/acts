import { useState } from "react";
import { AssetLibraryPageContainer } from "./pages/asset-library/asset-library-page-container";
import { DashboardHomePageContainer } from "./pages/dashboard/dashboard-home-page-container";
import { type DashboardNavigationKey, DashboardShell } from "./pages/dashboard/dashboard-shell";

export function App(): React.JSX.Element {
  const [activeNavigationKey, setActiveNavigationKey] = useState<DashboardNavigationKey>("assets");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");

  return (
    <DashboardShell
      activeNavigationKey={activeNavigationKey}
      assetSearchQuery={assetSearchQuery}
      onNavigate={setActiveNavigationKey}
      onSearchAssetLibrary={setAssetSearchQuery}
      title="acts"
    >
      {activeNavigationKey === "assets" ? (
        <AssetLibraryPageContainer
          onSearchQueryChange={setAssetSearchQuery}
          searchQuery={assetSearchQuery}
        />
      ) : (
        <DashboardHomePageContainer />
      )}
    </DashboardShell>
  );
}
