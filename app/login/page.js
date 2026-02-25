"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  function handleLogin() {
    localStorage.setItem("founder_auth", "1");
    router.replace("/app");
    router.refresh();
  }

  return (
    <main>
      <h1>Founder login</h1>
      <button onClick={handleLogin}>Login as Founder</button>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
