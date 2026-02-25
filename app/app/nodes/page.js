import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NodesDraftClientLoader from "./nodes-draft-client-loader";

export const dynamic = "force-dynamic";

export default async function NodesPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Nodes (Draft)</h1>
      <p>{"Draft only \u2014 DB will come after Master Spec"}</p>
      <NodesDraftClientLoader />
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/app/nodes">Nodes (Draft)</Link>
      </nav>
    </main>
  );
}
