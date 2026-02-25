"use client";

import { useRouter } from "next/navigation";

export default function ExitButton() {
  const router = useRouter();

  function handleExit() {
    localStorage.removeItem("temp_app_access");
    router.replace("/login");
    router.refresh();
  }

  return <button onClick={handleExit}>Exit</button>;
}
