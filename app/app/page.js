"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import LogoutButton from "./logout-button";

export default function AppPage() {
  const router = useRouter();

  if (typeof window === "undefined") {
    return <main>Checking founder session...</main>;
  }

  const isLoggedIn = localStorage.getItem("founder_auth") === "1";

  if (!isLoggedIn) {
    router.replace("/login");
    return <main>Redirecting to login...</main>;
  }

  return (
    <main>
      <h1>App area (placeholder)</h1>
      <p>You are logged in as Founder.</p>
      <LogoutButton />
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
