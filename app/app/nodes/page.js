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
      grid
      title="Nodes (Draft)"
      description="War-room node staging, relationships, and commit controls."
    >
      <Card description="Manage draft nodes, relationships, and local bundle actions.">
        <AppNav current="/app/nodes" />
      </Card>
      <Card
        title="Nodes Workspace"
        description="Use CONFIRMED when committing. Buttons and inputs are visual-only updates."
      >
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
