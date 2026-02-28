import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";
import WizardClient from "./wizard-client";

export const dynamic = "force-dynamic";

export default async function WizardPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="Workflow Wizard v1"
      description="Recruit experts, run brainstorm Q&A, accept baseline, and generate basic requirements."
    >
      <Card>
        <AppNav current="/app/wizard" />
      </Card>
      <WizardClient />
    </AppShell>
  );
}
