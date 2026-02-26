"use client";

import dynamic from "next/dynamic";

function BrainstormPanelFallback() {
  return (
    <section className="brainstorm-command">
      <div className="vo-surface ui-card">
        <p className="vo-title" style={{ fontSize: "0.95rem" }}>
          Brainstorm loading / retry
        </p>
        <p className="vo-meta">
          Loading brainstorming workspace. If this persists, refresh once.
        </p>
      </div>
    </section>
  );
}

const BrainstormClient = dynamic(() => import("./brainstorm-client"), {
  ssr: false,
  loading: () => <BrainstormPanelFallback />,
});

export default function BrainstormClientLoader() {
  return <BrainstormClient />;
}
