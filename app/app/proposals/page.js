import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import ProposalsClientLoader from "./proposals-client-loader";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="Guided Proposals (Draft)"
      description="Draft only - text templates, no governance rules yet."
    >
      <Card>
        <AppNav current="/app/proposals" />
      </Card>
      <Card title="Proposal Workspace">
        <ProposalsClientLoader />
      </Card>
      <Card>
        <nav>
          <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link> |{" "}
          <Link href="/app/views">Views</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
