import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuditClient from "./audit-client";
import AuditUiTools from "./audit-ui-tools";
import AppNav from "../../../src/components/app-nav";
import Badge from "../../../src/components/ui/badge";
import Banner from "../../../src/components/ui/banner";
import Card from "../../../src/components/ui/card";
import PageLayout from "../../../src/components/ui/page-layout";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <PageLayout
      title="Audit"
      description="Local audit events for draft and governance actions."
      badge={<Badge tone="info">Local</Badge>}
    >
      <Card>
        <Banner tone="info">Audit data stays local in this prototype.</Banner>
      </Card>
      <Card title="Navigation">
        <AppNav current="/app/audit" />
      </Card>
      <Card title="Tools">
        <AuditUiTools />
      </Card>
      <Card title="Audit Log">
        <AuditClient />
      </Card>
      <Card>
        <nav>
          <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link>
        </nav>
      </Card>
    </PageLayout>
  );
}
