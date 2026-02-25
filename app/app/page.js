import Link from "next/link";

export default function AppPage() {
  return (
    <main>
      <h1>App area (placeholder)</h1>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link>
      </nav>
    </main>
  );
}
