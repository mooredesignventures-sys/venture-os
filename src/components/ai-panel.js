"use client";

import EmptyState from "./ui/empty-state";
import { AiModeBadge } from "./ui/status-badges";

export default function AiPanel({
  title,
  subtitle = "",
  messages = [],
  inputValue,
  inputPlaceholder,
  onInputChange,
  onSend,
  onApply,
  sendLabel = "Send",
  applyLabel = "Apply",
  canSend = true,
  canApply = false,
  loading = false,
  errorMessage = "",
  resultMessage = "",
  source = "",
  fallbackReason = "",
  lastProposalSummary = "",
  emptyTitle = "",
  emptyMessage = "",
  renderPreview = null,
  extraActions = null,
}) {
  return (
    <section className="ai-panel">
      <div className="ai-panel__header">
        <h3 className="ai-panel__title">{title}</h3>
        {subtitle ? <p className="ai-panel__subtitle">{subtitle}</p> : null}
      </div>

      <div className="ai-panel__messages">
        {messages.map((message) => (
          <p key={message.id}>
            <strong>{message.role === "founder" ? "Founder" : "AI"}:</strong> {message.text}
          </p>
        ))}
        {messages.length === 0 ? (
          <p>
            <strong>AI:</strong> Ready when you are.
          </p>
        ) : null}
      </div>

      <p className="ai-panel__input">
        <textarea
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={inputPlaceholder}
          className="h-20 w-full"
        />
      </p>

      <p className="ai-panel__actions">
        <button type="button" onClick={onSend} disabled={loading || !canSend}>
          {loading ? "Sending..." : sendLabel}
        </button>{" "}
        <button type="button" onClick={onApply} disabled={!canApply}>
          {applyLabel}
        </button>
      </p>

      {extraActions}

      {errorMessage ? <p>{errorMessage}</p> : null}
      {resultMessage ? <p>{resultMessage}</p> : null}

      {source ? <AiModeBadge source={source} fallbackReason={fallbackReason} className="text-xs" /> : null}
      {lastProposalSummary ? <p>{lastProposalSummary}</p> : null}

      {renderPreview
        ? renderPreview()
        : emptyTitle
          ? <EmptyState title={emptyTitle} message={emptyMessage} />
          : null}
    </section>
  );
}
