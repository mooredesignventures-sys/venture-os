export default function AppShell({ title, description, children, grid = false, header }) {
  return (
    <main className={`vo-page${grid ? " vo-grid" : ""}`}>
      <div className="app-shell">
        {header ? (
          <header className="app-shell__header">{header}</header>
        ) : (
          <header className="app-shell__header">
            {title ? <h1 className="vo-title">{title}</h1> : null}
            {description ? <p className="vo-meta">{description}</p> : null}
          </header>
        )}
        <div className="app-shell__content">{children}</div>
      </div>
    </main>
  );
}
