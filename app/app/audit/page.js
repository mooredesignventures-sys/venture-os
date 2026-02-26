import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuditClient from "./audit-client";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="Audit (Draft, Local)"
      description="Local audit events for draft commit actions."
    >
      <Card>
        <AppNav current="/app/audit" />
      </Card>
      <Card title="Audit Events">
        <AuditClient />
      </Card>
      <Card>
        <nav>
          <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
