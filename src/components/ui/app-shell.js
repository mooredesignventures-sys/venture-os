export default function AppShell({ title, description, children }) {
  return (
    <main className="app-shell">
      <header className="app-shell__header">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="app-shell__content">{children}</div>
    </main>
  );
}
