import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ViewsPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>Views (Draft)</h1>
      <ul>
        <li>
          <Link href="/app/views/decisions">Decision Tree</Link>
        </li>
        <li>
          <Link href="/app/views/requirements">Requirements Tree</Link>
        </li>
        <li>
          <Link href="/app/views/business">Business Graph</Link>
        </li>
      </ul>
      <nav>
        <Link href="/app">App area</Link> | <Link href="/app/nodes">Nodes</Link>
      </nav>
    </main>
  );
}
