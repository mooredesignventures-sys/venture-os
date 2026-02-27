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
      title="Requirements"
      description={`Structured requirement view in ${modeLabel} mode.`}
    >
      <Card>
        <AppNav current="/app/views" />
      </Card>
      <Card title="Requirements Overview">
        <p className="text-sm text-slate-300">
          Review requirement nodes with clear scope context and quick status cues.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md border border-indigo-700/50 bg-indigo-900/30 px-2 py-1 text-[10px] text-indigo-200">
            Stage: {scope === "committed" ? "Committed" : "Draft"}
          </span>
          <span className="rounded-md border border-emerald-700/50 bg-emerald-900/30 px-2 py-1 text-[10px] text-emerald-200">
            Status: Active
          </span>
          <span className="rounded-md border border-amber-700/50 bg-amber-900/30 px-2 py-1 text-[10px] text-amber-200">
            Risk: Review
          </span>
        </div>
      </Card>
      <Card title="Scope Filter">
        <ViewScopeToggle basePath="/app/views/requirements" scope={scope} />
      </Card>
      <Card title="Requirements Graph">
        <div className="max-h-[75vh] overflow-auto pr-1">
          <ViewClientLoader mode="requirements" viewScope={scope} />
        </div>
      </Card>
      <Card>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href={`/app/views${scopeQuery}`}>Views</Link>
          <span className="text-slate-500">/</span>
          <Link href="/app/nodes">Nodes</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
