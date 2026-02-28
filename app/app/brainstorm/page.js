import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";
import BrainstormClientLoader from "./brainstorm-client-loader";

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
      title="Brainstorm Engine"
      description="Capture ideas and generate draft Decision/Requirement/Task candidates."
    >
      <Card>
        <AppNav current="/app/brainstorm" />
      </Card>
      <section className="brainstorm-layout">
        <Card
          className="brainstorm-layout__main"
          title="Prompt Console"
          description="Generate a visual draft preview without mutating persisted state."
        >
          <BrainstormClientLoader />
        </Card>
        <Card
          className="brainstorm-layout__side"
          title="Route Links"
          description="Fast access to surrounding workspace context."
        >
          <p>
            <Link href="/app">App area</Link>
          </p>
          <p>
            <Link href="/app/views/requirements">Requirements workspace</Link>
          </p>
          <p>
            <Link href="/app/council">Council</Link>
          </p>
        </Card>
      </section>
    </AppShell>
  );
}
