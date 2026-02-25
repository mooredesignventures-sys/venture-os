import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ViewClientLoader from "../view-client-loader";

export const dynamic = "force-dynamic";

export default async function RequirementsViewPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Requirements Tree (Draft)</h1>
      <ViewClientLoader mode="requirements" />
      <nav>
        <Link href="/app/views">Views</Link> | <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
