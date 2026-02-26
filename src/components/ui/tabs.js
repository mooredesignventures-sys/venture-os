import Link from "next/link";

export default function Tabs({ items }) {
  return (
    <nav className="ui-tabs" aria-label="Page tabs">
      {items.map((item) =>
        item.active ? (
          <span key={item.href} className="ui-tab ui-tab-active">
            {item.label}
          </span>
        ) : (
          <Link key={item.href} href={item.href} className="ui-tab">
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
