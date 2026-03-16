import { useState } from "react";
import { AssetLibraryPageContainer } from "./pages/asset-library/asset-library-page-container";
import { DashboardHomePageContainer } from "./pages/dashboard/dashboard-home-page-container";
import { type DashboardNavigationKey, DashboardShell } from "./pages/dashboard/dashboard-shell";

export function App(): React.JSX.Element {
  const [activeNavigationKey, setActiveNavigationKey] = useState<DashboardNavigationKey>("assets");

  return (
    <DashboardShell
      activeNavigationKey={activeNavigationKey}
      onNavigate={setActiveNavigationKey}
      title="acts"
    >
      {activeNavigationKey === "assets" ? (
        <AssetLibraryPageContainer />
      ) : (
        <DashboardHomePageContainer />
      )}
    </DashboardShell>
  );
}
