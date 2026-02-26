import Link from "next/link";
import AppShell from "../src/components/ui/app-shell";
import Card from "../src/components/ui/card";

export default function Home() {
  return (
    <AppShell
      grid
      title={"Venture OS \u2014 Foundation Setup"}
      description="Prototype operations shell with a war-room visual system."
    >
      <Card title="Entry Points" description="Start from login, then move into workspace routes.">
        <p>
          <Link href="/login">Open Login</Link>
        </p>
        <p>
          <Link href="/app">Open App Workspace</Link>
        </p>
      </Card>
      <Card title="Navigation">
        <nav>
          <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
          <Link href="/login">Login</Link>
        </nav>
      </Card>
    </AppShell>
  );
}
