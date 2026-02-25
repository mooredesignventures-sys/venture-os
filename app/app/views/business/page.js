import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";
import AppNav from "../../../../src/components/app-nav";

export const dynamic = "force-dynamic";

export default async function BusinessViewPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Business Graph (Draft)</h1>
      <p>Relationship list across active draft nodes.</p>
      <AppNav current="/app/views" />
      <ViewClientLoader mode="business" />
      <nav>
        <Link href="/app/views">Views</Link> | <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
