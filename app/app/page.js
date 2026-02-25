import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ExitButton from "./exit-button";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <main>
      <h1>App area (placeholder)</h1>
      <ExitButton />
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
