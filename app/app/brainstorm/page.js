import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import BrainstormClient from "./brainstorm-client";

export const dynamic = "force-dynamic";

export default async function BrainstormPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Brainstorm</h1>
      <p>Idea to proposed requirements/tasks draft pipeline.</p>
      <AppNav current="/app/brainstorm" />
      <BrainstormClient />
      <nav>
        <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link> |{" "}
        <Link href="/app/views/requirements">Requirements view</Link>
      </nav>
    </main>
  );
}
