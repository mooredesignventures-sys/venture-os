import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NodesDraftClientLoader from "./nodes-draft-client-loader";
import AppNav from "../../../src/components/app-nav";

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
      <p>Draft only - DB will come after Master Spec.</p>
      <p>Manage draft nodes, relationships, and local bundle actions.</p>
      <AppNav current="/app/nodes" />
      <NodesDraftClientLoader />
      <p>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link>
      </p>
    </main>
  );
}
