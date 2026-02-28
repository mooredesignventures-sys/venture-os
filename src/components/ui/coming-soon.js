import Link from "next/link";

export default function ComingSoon({ title = "Coming soon", message, href = "/app/brainstorm" }) {
  return (
    <section className="vo-surface" style={{ padding: "0.95rem 1rem" }}>
      <p className="vo-title" style={{ fontSize: "1rem" }}>
        {title}
      </p>
      <p className="vo-meta" style={{ marginTop: "0.4rem" }}>
        {message || "This area is staged and will be enabled in a later release."}
      </p>
      <p style={{ marginTop: "0.65rem" }}>
        <Link href={href}>Go to active workspace</Link>
      </p>
    </section>
  );
}
