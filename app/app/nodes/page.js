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
  const isFounder = cookieStore.get("founder_session")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="Nodes (Draft)"
      description="War-room node staging, relationships, and commit controls."
    >
      <div className="nodes-hero-grid">
        <section className="nodes-hero-left">
          <Card title="Record / Controls" description="Navigation and working context">
            <AppNav current="/app/nodes" />
            <p className="vo-meta">Mode: Draft local state only</p>
            <p>
              <Link href="/app/views">Open Views</Link>
            </p>
            <p>
              <Link href="/app/proposals">Open Proposals</Link>
            </p>
          </Card>
        </section>

        <section className="nodes-hero-main">
          <Card
            title="Nodes Workspace"
            description="Use CONFIRMED when committing. Buttons and inputs are visual-only updates."
          >
            <div className="nodes-workspace">
              <NodesDraftClientLoader isFounder={isFounder} />
            </div>
          </Card>
        </section>

        <section className="nodes-hero-right">
          <Card title="Audit / Help" description="Review changes and run a quick walkthrough">
            <p>
              <Link href="/app/audit">Open Audit</Link>
            </p>
            <p>
              <Link href="/app/tour">Open Tour</Link>
            </p>
            <p>
              <Link href="/">Home</Link> | <Link href="/app">App area</Link>
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
