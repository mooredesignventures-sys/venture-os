import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProposalsClient from "./proposals-client";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Guided Proposals (Draft)</h1>
      <p>Draft only \u2014 text templates, no governance rules yet.</p>
      <ProposalsClient />
      <nav>
        <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link> |{" "}
        <Link href="/app/views">Views</Link>
      </nav>
    </main>
  );
}
