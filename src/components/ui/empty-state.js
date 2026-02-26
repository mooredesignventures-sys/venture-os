export default function EmptyState({ title, message, action }) {
  return (
    <div className="vo-surface" style={{ padding: "0.8rem 0.9rem" }}>
      <p className="vo-title" style={{ fontSize: "0.95rem" }}>
        {title}
      </p>
      <p className="vo-meta" style={{ marginTop: "0.35rem" }}>
        {message}
      </p>
      {action ? <p style={{ marginTop: "0.6rem" }}>{action}</p> : null}
    </div>
  );
}
