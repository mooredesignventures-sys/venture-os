import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Venture OS — Foundation Setup</h1>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link>
      </nav>
    </main>
  );
}
