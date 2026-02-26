import Link from "next/link";

export default function LoginPage() {
  return (
    <main>
      <h1>Login</h1>
      <p>Temporary gate</p>
      <form action="/login/enter" method="get">
        <button type="submit">Enter (temporary)</button>
      </form>
      <form action="/login/founder" method="get">
        <button type="submit">Enter as Founder</button>
      </form>
      <nav>
        <Link href="/">Home</Link> | <Link href="/app">App area</Link> |{" "}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  );
}
