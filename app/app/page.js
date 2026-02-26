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
      title="App Workspace"
      description="Navigate prototype areas quickly."
    >
      <Card>
        <AppNav current="/app" />
      </Card>
      <Card title="Areas" description="Core prototype sections">
        <p>
          <Link href="/app/nodes">Nodes (Draft)</Link>
        </p>
        <p>
          <Link href="/app/views">Views (Draft)</Link>
        </p>
        <p>
          <Link href="/app/proposals">Guided Proposals (Draft)</Link>
        </p>
        <p>
          <Link href="/app/brainstorm">Brainstorm (AI Draft)</Link>
        </p>
        <p>
          <Link href="/app/audit">Audit (Draft, Local)</Link>
        </p>
        <p>
          <Link href="/app/tour">Tour</Link>
        </p>
      </Card>
      <Card title="Session">
        <ExitButton />
      </Card>
      <Card>
        <nav>
          <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
          <Link href="/login">Login</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
