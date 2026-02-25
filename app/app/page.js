"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AppPage() {
  const router = useRouter();

  if (typeof window === "undefined") {
    return <main>Checking access...</main>;
  }

  const hasEntered = localStorage.getItem("temp_app_access") === "1";

  if (!hasEntered) {
    router.replace("/login");
    return <main>Redirecting to /login...</main>;
  }

  function handleExit() {
    localStorage.removeItem("temp_app_access");
    router.replace("/login");
    router.refresh();
  }

  return (
    <main>
      <h1>App area (placeholder)</h1>
      <button onClick={handleExit}>Exit</button>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
