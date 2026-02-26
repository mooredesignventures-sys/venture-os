import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NodesDraftClientLoader from "./nodes-draft-client-loader";
import AppNav from "../../../src/components/app-nav";
import Badge from "../../../src/components/ui/badge";
import Banner from "../../../src/components/ui/banner";
import Card from "../../../src/components/ui/card";
import PageLayout from "../../../src/components/ui/page-layout";

export const dynamic = "force-dynamic";

export default async function NodesPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <PageLayout
      title="Nodes"
      description="Manage draft nodes, relationships, and local bundle actions."
      badge={<Badge tone="info">Draft</Badge>}
    >
      <Card>
        <Banner tone="info">Draft only. DB will come after Master Spec.</Banner>
      </Card>
      <Card title="Navigation">
        <AppNav current="/app/nodes" />
      </Card>
      <Card title="Workspace">
        <NodesDraftClientLoader />
      </Card>
      <Card>
        <p>
          <Link href="/">Home</Link> | <Link href="/app">App area</Link>
        </p>
      </Card>
    </PageLayout>
  );
}
