import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";
import AppNav from "../../../../src/components/app-nav";

export const dynamic = "force-dynamic";

export default async function DecisionsViewPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Decision Tree (Draft)</h1>
      <p>Decision nodes with related draft items.</p>
      <AppNav current="/app/views" />
      <ViewClientLoader mode="decisions" />
      <nav>
        <Link href="/app/views">Views</Link> | <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
