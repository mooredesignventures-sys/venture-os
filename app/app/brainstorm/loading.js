export default function BrainstormLoading() {
  return (
    <main className="vo-page vo-grid">
      <div className="app-shell">
        <section className="ui-card vo-surface">
          <p className="vo-title" style={{ fontSize: "1rem" }}>
            Brainstorm loading / retry
          </p>
          <p className="vo-meta">
            Preparing page resources. If this takes too long, refresh once.
          </p>
        </section>
      </div>
    </main>
  );
}
