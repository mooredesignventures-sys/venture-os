import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import Badge from "../../../src/components/ui/badge";
import Banner from "../../../src/components/ui/banner";
import Card from "../../../src/components/ui/card";
import PageLayout from "../../../src/components/ui/page-layout";
import Tabs from "../../../src/components/ui/tabs";
import ViewScopeToggle from "./view-scope-toggle";

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
    <PageLayout
      title="Views"
      description={`Review decision, requirement, and relationship snapshots in ${modeLabel} mode.`}
      badge={<Badge tone="neutral">{modeLabel}</Badge>}
    >
      <Card>
        <Banner tone="info">Views are read-only projections of your graph.</Banner>
      </Card>
      <Card title="Navigation">
        <AppNav current="/app/views" />
      </Card>
      <Card title="View Scope">
        <ViewScopeToggle basePath="/app/views" scope={scope} />
      </Card>
      <Card title="View Tabs">
        <Tabs
          items={[
            { href: `/app/views/decisions${scopeQuery}`, label: "Decision Tree", active: false },
            {
              href: `/app/views/requirements${scopeQuery}`,
              label: "Requirements Tree",
              active: false,
            },
            { href: `/app/views/business${scopeQuery}`, label: "Business Graph", active: false },
          ]}
        />
      </Card>
      <Card>
        <p>
          <Link href={`/app/views/decisions${scopeQuery}`}>Decision Tree</Link>
        </p>
        <p>
          <Link href={`/app/views/requirements${scopeQuery}`}>Requirements Tree</Link>
        </p>
        <p>
          <Link href={`/app/views/business${scopeQuery}`}>Business Graph</Link>
        </p>
      </Card>
    </PageLayout>
  );
}
