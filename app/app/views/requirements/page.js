import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";
import AppNav from "../../../../src/components/app-nav";
import ViewScopeToggle from "../view-scope-toggle";
import AppShell from "../../../../src/components/ui/app-shell";
import Card from "../../../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function RequirementsViewPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const scope = resolvedSearchParams?.scope === "committed" ? "committed" : "draft";
  const scopeQuery = scope === "committed" ? "?scope=committed" : "";
  const modeLabel = scope === "committed" ? "Committed only" : "Draft";
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title={`Requirements Tree (${modeLabel})`}
      description={`Requirement nodes with related items in ${modeLabel} mode.`}
    >
      <Card>
        <AppNav current="/app/views/requirements" />
      </Card>
      <Card title="Scope Filter">
        <ViewScopeToggle basePath="/app/views/requirements" scope={scope} />
      </Card>
      <Card title="Requirements Graph">
        <ViewClientLoader mode="requirements" viewScope={scope} />
      </Card>
      <Card>
        <nav>
          <Link href={`/app/views${scopeQuery}`}>Views</Link> | <Link href="/app/brainstorm">Brainstorm</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
