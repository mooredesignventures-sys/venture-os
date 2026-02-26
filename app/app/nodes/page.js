import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NodesDraftClientLoader from "./nodes-draft-client-loader";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function NodesPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      title="Nodes (Draft)"
      description="Draft only - DB will come after Master Spec."
    >
      <Card description="Manage draft nodes, relationships, and local bundle actions.">
        <AppNav current="/app/nodes" />
      </Card>
      <Card title="Nodes Workspace">
        <NodesDraftClientLoader />
      </Card>
      <Card>
        <p>
          <Link href="/">Home</Link> | <Link href="/app">App area</Link>
        </p>
      </Card>
    </AppShell>
  );
}
