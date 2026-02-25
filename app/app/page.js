"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import ExitButton from "./exit-button";

export default function AppPage() {
  const router = useRouter();

  if (typeof window === "undefined") {
    return <main>Checking temporary access...</main>;
  }

  const hasAccess = localStorage.getItem("temp_app_access") === "1";

  if (!hasAccess) {
    router.replace("/login");
    return <main>Redirecting to login...</main>;
  }

  return (
    <main>
      <h1>App area (placeholder)</h1>
      <p>Temporary gate only; replace with real auth later.</p>
      <ExitButton />
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
