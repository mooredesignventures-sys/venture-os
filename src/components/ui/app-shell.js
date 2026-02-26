export default function AppShell({
  title,
  description,
  children,
  grid = false,
  header,
  dense = false,
}) {
  const pageClassName = `vo-page${grid ? " vo-grid" : ""}`;
  const shellClassName = `app-shell${dense ? " app-shell--dense" : ""}`;

  return (
    <main className={pageClassName}>
      <div className={shellClassName}>
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
