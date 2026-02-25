import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuditClient from "./audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Audit (Draft, Local)</h1>
      <AuditClient />
      <nav>
        <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
