"use client";

export function AiModeBadge({ source, fallbackReason, className = "" }) {
  const isLive = source === "ai";

  return (
    <div className={className}>
      <span className="status-badge">{isLive ? "AI: LIVE" : "AI: FALLBACK (mock)"}</span>
      {!isLive && fallbackReason === "missing_api_key" ? (
        <div className="status-badge__hint">Set OPENAI_API_KEY to enable LIVE AI.</div>
      ) : null}
    </div>
  );
}

export function StageBadge({ stage }) {
  const normalized = typeof stage === "string" ? stage.toLowerCase() : "proposed";
  const isCommitted = normalized === "committed";
  return (
    <span className={`status-badge${isCommitted ? " status-badge--committed" : ""}`}>
      {isCommitted ? "COMMITTED" : "PROPOSED"}
    </span>
  );
}
