export default function EmptyState({ title, message, action }) {
  return (
    <div>
      <p>
        <strong>{title}</strong>
      </p>
      <p>{message}</p>
      {action ? <p>{action}</p> : null}
    </div>
  );
}
