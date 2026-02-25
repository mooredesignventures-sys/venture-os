import Link from "next/link";

export default function ViewScopeToggle({ basePath, scope = "draft" }) {
  const isCommittedOnly = scope === "committed";

  return (
    <p>
      View mode:{" "}
      {isCommittedOnly ? (
        <Link href={basePath}>Draft</Link>
      ) : (
        <strong>Draft</strong>
      )}{" "}
      |{" "}
      {isCommittedOnly ? (
        <strong>Committed only</strong>
      ) : (
        <Link href={`${basePath}?scope=committed`}>Committed only</Link>
      )}
    </p>
  );
}
