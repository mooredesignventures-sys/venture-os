import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";
import ComingSoon from "../../../src/components/ui/coming-soon";
import CouncilClient from "./council-client";
import { getNavItemById } from "../../../src/config/nav-config";

export const dynamic = "force-dynamic";

export default async function CouncilPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  const councilNavItem = getNavItemById("council");
  const councilEnabled = councilNavItem?.enabled !== false;

  return (
    <AppShell
      grid
      title="War Council Room"
      description={
        councilEnabled
          ? "Council alignment hub with deterministic mock briefings."
          : "Council is currently staged while AI avatar recruiting is prepared."
      }
    >
      <Card>
        <AppNav current="/app/council" />
      </Card>
      {councilEnabled ? (
        <CouncilClient />
      ) : (
        <ComingSoon
          title="Council: Coming soon"
          message="Coming soon (AI avatars recruiting next)."
          href="/app/brainstorm"
        />
      )}
    </AppShell>
  );
}
