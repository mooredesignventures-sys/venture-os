import Link from "next/link";

const NAV_ITEMS = [
  { href: "/app/nodes", label: "Nodes" },
  { href: "/app/views", label: "Views" },
  { href: "/app/proposals", label: "Proposals" },
  { href: "/app/audit", label: "Audit" },
  { href: "/app/nodes#bundle-json", label: "Export" },
  { href: "/app/tour", label: "Tour" },
];

export default function AppNav({ current }) {
  return (
    <nav>
      {NAV_ITEMS.map((item, index) => (
        <span key={item.href}>
          {index > 0 ? " | " : ""}
          {current === item.href ? (
            <strong>{item.label}</strong>
          ) : (
            <Link href={item.href}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
