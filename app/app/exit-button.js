"use client";

import { useRouter } from "next/navigation";

export default function ExitButton() {
  const router = useRouter();

  function handleExit() {
    document.cookie = "temp_app_access=; Path=/; Max-Age=0; SameSite=Lax";
    router.replace("/login");
    router.refresh();
  }

  return <button onClick={handleExit}>Exit</button>;
}
