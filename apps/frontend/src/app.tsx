import { DashboardHomePageContainer } from "./pages/dashboard/dashboard-home-page-container";
import { DashboardShell } from "./pages/dashboard/dashboard-shell";

export function App(): React.JSX.Element {
  return (
    <DashboardShell title="acts">
      <DashboardHomePageContainer />
    </DashboardShell>
  );
}
