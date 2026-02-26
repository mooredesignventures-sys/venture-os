import Link from "next/link";

export default function ViewScopeToggle({ basePath, scope = "draft" }) {
  const isCommittedOnly = scope === "committed";

  return (
    <p className="vo-meta">
      View mode:{" "}
      {isCommittedOnly ? (
        <Link href={basePath}>Draft</Link>
      ) : (
        <strong className="status-badge">Draft</strong>
      )}{" "}
      |{" "}
      {isCommittedOnly ? (
        <strong className="status-badge status-badge--committed">Committed only</strong>
      ) : (
        <Link href={`${basePath}?scope=committed`}>Committed only</Link>
      )}
    </p>
  );
}
