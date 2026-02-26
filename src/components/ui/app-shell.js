export default function AppShell({ title, description, children, grid = false, header }) {
  return (
    <main className={`vo-page${grid ? " vo-grid" : ""}`}>
      <div className="app-shell">
        {header ? (
          <header className="app-shell__header">{header}</header>
        ) : (
          <header className="app-shell__header vo-surface app-shell__hero">
            <p className="app-shell__eyebrow">Venture OS // War Room</p>
            {title ? <h1 className="vo-title app-shell__title">{title}</h1> : null}
            {description ? <p className="vo-meta app-shell__subtitle">{description}</p> : null}
          </header>
        )}
        <div className="app-shell__content">{children}</div>
      </div>
    </main>
  );
}
