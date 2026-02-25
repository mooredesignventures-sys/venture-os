"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  function handleEnter() {
    localStorage.setItem("temp_app_access", "1");
    router.replace("/app");
    router.refresh();
  }

  return (
    <main>
      <h1>Login</h1>
      <p>{"Temporary gate \u2014 will be replaced after Master Spec update"}</p>
      <button onClick={handleEnter}>Enter (temporary)</button>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
