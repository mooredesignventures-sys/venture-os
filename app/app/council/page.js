import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";
import CouncilClient from "./council-client";

export const dynamic = "force-dynamic";

export default async function CouncilPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="War Council Room"
      description="Council alignment hub with deterministic mock briefings."
    >
      <Card>
        <AppNav current="/app/council" />
      </Card>
      <CouncilClient />
    </AppShell>
  );
}
