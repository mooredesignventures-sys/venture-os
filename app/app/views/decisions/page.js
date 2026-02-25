import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";
import AppNav from "../../../../src/components/app-nav";
import ViewScopeToggle from "../view-scope-toggle";

export const dynamic = "force-dynamic";

export default async function DecisionsViewPage({ searchParams }) {
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
    <main>
      <h1>Decision Tree ({modeLabel})</h1>
      <p>Decision nodes with related items in {modeLabel} mode.</p>
      <AppNav current="/app/views" />
      <ViewScopeToggle basePath="/app/views/decisions" scope={scope} />
      <ViewClientLoader mode="decisions" viewScope={scope} />
      <nav>
        <Link href={`/app/views${scopeQuery}`}>Views</Link> |{" "}
        <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
