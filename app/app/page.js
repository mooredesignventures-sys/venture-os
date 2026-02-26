import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExitButton from "./exit-button";
import AppNav from "../../src/components/app-nav";
import AppShell from "../../src/components/ui/app-shell";
import Card from "../../src/components/ui/card";
import PageHeader from "../../src/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";
  const isFounder = cookieStore.get("founder_session")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      header={
        <PageHeader
          title="App Workspace"
          meta={`Navigate prototype areas quickly. Founder mode: ${isFounder ? "On" : "Off"}.`}
          actions={<ExitButton />}
        />
      }
    >
      <Card>
        <AppNav current="/app" />
      </Card>
      <div className="app-dashboard-grid">
        <Card title="Areas" description="Core prototype sections" className="app-dashboard-grid__main">
          <ul className="link-list">
            <li>
              <Link href="/app/nodes">Nodes (Draft)</Link>
            </li>
            <li>
              <Link href="/app/views">Views (Draft)</Link>
            </li>
            <li>
              <Link href="/app/proposals">Guided Proposals (Draft)</Link>
            </li>
            <li>
              <Link href="/app/brainstorm">Brainstorm (Draft)</Link>
            </li>
            <li>
              <Link href="/app/audit">Audit (Draft, Local)</Link>
            </li>
            <li>
              <Link href="/app/tour">Tour</Link>
            </li>
          </ul>
        </Card>
        <Card title="Session" description="Current access mode" className="app-dashboard-grid__side">
          <p className="vo-meta">Founder mode: {isFounder ? "On" : "Off"}</p>
          <ExitButton />
        </Card>
      </div>
      <Card>
        <nav>
          <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
          <Link href="/login">Login</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
