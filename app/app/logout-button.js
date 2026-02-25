"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("founder_auth");
    router.replace("/login");
    router.refresh();
  }

  return <button onClick={handleLogout}>Logout</button>;
}
