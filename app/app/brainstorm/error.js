"use client";

export default function BrainstormError({ reset }) {
  return (
    <main className="vo-page vo-grid">
      <div className="app-shell">
        <section className="ui-card vo-surface">
          <p className="vo-title" style={{ fontSize: "1rem" }}>
            Brainstorm loading / retry
          </p>
          <p className="vo-meta">
            A temporary route load error occurred. Retry this panel without leaving the page.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <button type="button" className="vo-btn-primary" onClick={() => reset()}>
              Retry Brainstorm
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
