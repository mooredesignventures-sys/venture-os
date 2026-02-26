import Link from "next/link";
import AppShell from "../../src/components/ui/app-shell";
import Card from "../../src/components/ui/card";

export default function LoginPage() {
  return (
    <AppShell
      grid
      title="Access Gate"
      description="Temporary authentication gate for local prototype routes."
    >
      <Card title="Session Entry">
        <form action="/login/enter" method="get">
          <button type="submit" className="vo-btn-primary">
            Enter (temporary)
          </button>
        </form>
        <form action="/login/founder" method="get" style={{ marginTop: "0.6rem" }}>
          <button type="submit" className="vo-btn-outline">
            Enter as Founder
          </button>
        </form>
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
