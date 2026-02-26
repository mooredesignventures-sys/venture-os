import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import ViewScopeToggle from "./view-scope-toggle";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ViewsPage({ searchParams }) {
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
      title={`Views (${modeLabel})`}
      description={`Review decision, requirement, and relationship snapshots in ${modeLabel} mode.`}
    >
      <Card>
        <AppNav current="/app/views" />
      </Card>
      <Card title="Scope">
        <ViewScopeToggle basePath="/app/views" scope={scope} />
      </Card>
      <Card title="Available Views">
        <ul>
          <li>
            <Link href={`/app/views/decisions${scopeQuery}`}>Decision Tree</Link>
          </li>
          <li>
            <Link href={`/app/views/requirements${scopeQuery}`}>Requirements Tree</Link>
          </li>
          <li>
            <Link href={`/app/views/business${scopeQuery}`}>Business Graph</Link>
          </li>
        </ul>
      </Card>
    </AppShell>
  );
}
