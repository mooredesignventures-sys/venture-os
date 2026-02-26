import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";
import AppNav from "../../../../src/components/app-nav";
import Badge from "../../../../src/components/ui/badge";
import Banner from "../../../../src/components/ui/banner";
import Card from "../../../../src/components/ui/card";
import PageLayout from "../../../../src/components/ui/page-layout";
import ViewScopeToggle from "../view-scope-toggle";

export const dynamic = "force-dynamic";

export default async function BusinessViewPage({ searchParams }) {
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
    <PageLayout
      title="Business Graph"
      description={`Relationship list across nodes in ${modeLabel} mode.`}
      badge={<Badge tone="neutral">{modeLabel}</Badge>}
    >
      <Card>
        <Banner tone="info">Business Graph groups relationships by type.</Banner>
      </Card>
      <Card title="Navigation">
        <AppNav current="/app/views" />
      </Card>
      <Card title="View Scope">
        <ViewScopeToggle basePath="/app/views/business" scope={scope} />
      </Card>
      <Card title="Graph View">
        <ViewClientLoader mode="business" viewScope={scope} />
      </Card>
      <Card>
        <nav>
          <Link href={`/app/views${scopeQuery}`}>Views</Link> |{" "}
          <Link href="/app/nodes">Nodes</Link>
        </nav>
      </Card>
    </PageLayout>
  );
}
