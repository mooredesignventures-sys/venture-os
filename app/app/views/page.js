import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppNav from "../../../src/components/app-nav";
import ViewScopeToggle from "./view-scope-toggle";

export const dynamic = "force-dynamic";

export default async function ViewsPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const scope = resolvedSearchParams?.scope === "committed" ? "committed" : "draft";
  const scopeQuery = scope === "committed" ? "?scope=committed" : "";
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Views (Draft)</h1>
      <p>Review decision, requirement, and relationship snapshots.</p>
      <AppNav current="/app/views" />
      <ViewScopeToggle basePath="/app/views" scope={scope} />
      <ul>
        <li>
          <Link href={`/app/views/decisions${scopeQuery}`}>Decision Tree</Link>
        </li>
        <li>
          <Link href={`/app/views/requirements${scopeQuery}`}>Requirements Tree</Link>
        </li>
        <li>
          <Link href={`/app/views/business${scopeQuery}`}>Business Graph</Link>
        </li>
      </ul>
    </main>
  );
}
