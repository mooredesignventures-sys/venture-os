"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  function handleEnter() {
    document.cookie = "temp_app_access=1; Path=/; Max-Age=86400; SameSite=Lax";
    router.replace("/app");
    router.refresh();
  }

  return (
    <main>
      <h1>Login</h1>
      <p>Temporary gate</p>
      <button onClick={handleEnter}>Enter (temporary)</button>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
