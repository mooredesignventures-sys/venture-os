import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import BrainstormClient from "./brainstorm-client";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";
import PageHeader from "../../../src/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function BrainstormPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      header={
        <PageHeader
          title="Brainstorm (Draft)"
          meta="Capture an idea and stage requirement/task candidates for review."
          actions={<Link href="/app/views/requirements">Requirements View</Link>}
        />
      }
    >
      <Card>
        <AppNav current="/app/brainstorm" />
      </Card>
      <Card title="Idea Intake">
        <BrainstormClient />
      </Card>
      <Card>
        <nav>
          <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link> |{" "}
          <Link href="/app/views/requirements">Requirements view</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
