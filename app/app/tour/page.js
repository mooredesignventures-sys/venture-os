import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TourPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Guided Tour (2 minutes)</h1>
      <ol>
        <li>
          Open <Link href="/app/nodes">Nodes</Link> and click <strong>Load Demo Data</strong>.
        </li>
        <li>
          In <Link href="/app/nodes">Nodes</Link>, create or edit a node.
        </li>
        <li>
          In node detail, add a relationship to another node.
        </li>
        <li>
          Open <Link href="/app/views/decisions">Decisions</Link>,{" "}
          <Link href="/app/views/requirements">Requirements</Link>, and{" "}
          <Link href="/app/views/business">Business</Link> views.
        </li>
        <li>
          In <Link href="/app/nodes">Nodes</Link>, commit a node (it becomes locked).
        </li>
        <li>
          Open <Link href="/app/audit">Audit</Link> to see commit events.
        </li>
        <li>
          In <Link href="/app/nodes">Nodes</Link>, click <strong>Export Bundle (JSON)</strong>.
        </li>
        <li>
          In <Link href="/app/nodes">Nodes</Link>, click{" "}
          <strong>Reset (clear all local data)</strong>.
        </li>
      </ol>
      <nav>
        <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link> |{" "}
        <Link href="/app/views">Views</Link> | <Link href="/app/proposals">Proposals</Link> |{" "}
        <Link href="/app/audit">Audit</Link>
      </nav>
    </main>
  );
}
