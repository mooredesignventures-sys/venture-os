import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExitButton from "./exit-button";
import AppNav from "../../src/components/app-nav";
import AppShell from "../../src/components/ui/app-shell";
import Card from "../../src/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="Workspace Command Center"
      description="Launch operations areas with a consistent war-room control surface."
    >
      <Card>
        <AppNav current="/app" />
      </Card>
      <section className="workspace-grid">
        <Card
          title="Operations"
          description="Primary product surfaces for strategy, graph editing, and review."
        >
          <div className="workspace-links">
            <Link href="/app/brainstorm">Brainstorm Engine</Link>
            <Link href="/app/views/requirements">Requirements Workspace</Link>
            <Link href="/app/council">Council (Coming soon)</Link>
          </div>
        </Card>
        <Card title="Route Status" description="Quick links for local checks.">
          <p>
            <Link href="/login">/login</Link>
          </p>
          <p>
            <Link href="/app">/app</Link>
          </p>
          <p>
            <Link href="/app/brainstorm">/app/brainstorm</Link>
          </p>
          <p>
            <Link href="/app/views/requirements">/app/views/requirements</Link>
          </p>
          <p>
            <Link href="/app/council">/app/council</Link>
          </p>
        </Card>
        <Card title="Session Control" description="Reset your temporary access session.">
          <ExitButton />
        </Card>
      </section>
    </AppShell>
  );
}
