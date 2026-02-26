"use client";

import { useMemo, useState } from "react";

const NODE_STORAGE_KEY = "draft_nodes";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const CONFIRM_TEXT = "CONFIRMED";
const AUDIT_ACTOR = "founder";

function normalizeIdeas(rawIdeas) {
  if (!Array.isArray(rawIdeas)) {
    return [];
  }

  return rawIdeas
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const title = typeof item.title === "string" ? item.title.trim() : "";
      if (!title) {
        return null;
      }

      const cluster =
        typeof item.cluster === "string" && item.cluster.trim()
          ? item.cluster.trim()
          : "Core";
      const id =
        typeof item.id === "string" && item.id.trim() ? item.id.trim() : `idea-${index + 1}`;

      return { id, title, cluster };
    })
    .filter((item) => item !== null);
}

function loadDraftNodes() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(NODE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendAuditEntry(entry) {
  if (typeof window === "undefined") {
    return;
  }

  let current = [];
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    current = Array.isArray(parsed) ? parsed : [];
  } catch {
    current = [];
  }

  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify([...current, entry]));
}

function buildProposedNodes(ideas, source) {
  const base = Date.now();
  return ideas.map((idea, index) => ({
    id: `ai_${base}_${index}_${idea.id}`,
    title: idea.title,
    type: "Requirement",
    stage: "proposed",
    status: "queued",
    version: 1,
    createdAt: base + index,
    createdBy: AUDIT_ACTOR,
    relationships: [],
    aiSource: source,
    cluster: idea.cluster,
  }));
}

export default function BrainstormClient({ isFounder }) {
  const [prompt, setPrompt] = useState("");
  const [draftIdeas, setDraftIdeas] = useState([]);
  const [draftSource, setDraftSource] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const promptTrimmed = prompt.trim();
  const canApply = isFounder && confirmText === CONFIRM_TEXT && draftIdeas.length > 0 && !isApplying;
  const founderLabel = isFounder ? "Founder" : "Read-only";
  const sourceLabel = draftSource ? draftSource.toUpperCase() : "NONE";

  async function handleGenerateAIDraft() {
    if (!promptTrimmed) {
      setErrorMessage("Enter a prompt before generating.");
      setSuccessMessage("");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: promptTrimmed }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Draft generation failed.");
      }

      const ideas = normalizeIdeas(payload?.ideas);
      if (ideas.length === 0) {
        throw new Error("No ideas returned by AI.");
      }

      const source = payload?.source === "openai" ? "openai" : "mock";
      setDraftIdeas(ideas);
      setDraftSource(source);
      appendAuditEntry({
        type: "AI_DRAFT_GENERATED",
        action: "AI_DRAFT_GENERATED",
        eventType: "AI_DRAFT_GENERATED",
        source,
        actor: AUDIT_ACTOR,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now(),
      });
      setSuccessMessage(`AI draft generated from ${source}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft generation failed.";
      setErrorMessage(message);
      setDraftIdeas([]);
      setDraftSource("");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApplyDraft() {
    if (!isFounder) {
      setErrorMessage("Founder only.");
      setSuccessMessage("");
      return;
    }

    if (confirmText !== CONFIRM_TEXT) {
      setErrorMessage("Type CONFIRMED before applying.");
      setSuccessMessage("");
      return;
    }

    if (draftIdeas.length === 0) {
      setErrorMessage("Generate AI draft first.");
      setSuccessMessage("");
      return;
    }

    setIsApplying(true);
    setErrorMessage("");

    try {
      const existingNodes = loadDraftNodes();
      const proposedNodes = buildProposedNodes(draftIdeas, draftSource || "mock");
      window.localStorage.setItem(
        NODE_STORAGE_KEY,
        JSON.stringify([...existingNodes, ...proposedNodes])
      );

      appendAuditEntry({
        type: "AI_DRAFT_APPLIED",
        action: "AI_DRAFT_APPLIED",
        eventType: "AI_DRAFT_APPLIED",
        count: proposedNodes.length,
        actor: AUDIT_ACTOR,
        timestamp: new Date().toISOString(),
        timestampMs: Date.now(),
      });

      setSuccessMessage(`${proposedNodes.length} proposed nodes added.`);
      setConfirmText("");
    } catch {
      setErrorMessage("Apply failed. Please retry.");
      setSuccessMessage("");
    } finally {
      setIsApplying(false);
    }
  }

  const renderedIdeas = useMemo(
    () =>
      draftIdeas.map((item, index) => (
        <article key={`${item.id}-${index}`} className="brainstorm-preview__item">
          <p className="vo-meta">
            DRAFT | PROPOSED | {item.cluster}
          </p>
          <p>{item.title}</p>
        </article>
      )),
    [draftIdeas]
  );

  return (
    <section className="brainstorm-command">
      <div className="brainstorm-command__meta">
        <span className="status-badge">Mode: {founderLabel}</span>
        <span className="status-badge">Prompt chars: {prompt.length}</span>
        <span className="status-badge">Draft ideas: {draftIdeas.length}</span>
        <span className="status-badge">Source: {sourceLabel}</span>
      </div>

      <label htmlFor="brainstorm-prompt">Brainstorm prompt</label>
      <textarea
        id="brainstorm-prompt"
        rows={6}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="vo-input"
        placeholder="Describe the problem, target user, and intended business outcome."
      />

      <div className="brainstorm-actions">
        <button
          type="button"
          className="vo-btn-primary"
          onClick={handleGenerateAIDraft}
          disabled={isGenerating}
        >
          {isGenerating ? "Generating..." : "Generate AI Draft"}
        </button>
        <button type="button" className="vo-btn-outline" onClick={handleApplyDraft} disabled={!canApply}>
          {isApplying ? "Applying..." : "Apply Draft (Founder Only)"}
        </button>
      </div>

      <label htmlFor="apply-confirmed">Type CONFIRMED to apply</label>
      <input
        id="apply-confirmed"
        value={confirmText}
        onChange={(event) => setConfirmText(event.target.value)}
        className="vo-input"
      />

      {errorMessage ? (
        <div className="vo-surface ui-card">
          <p className="vo-title" style={{ fontSize: "0.95rem" }}>
            Brainstorm loading / retry
          </p>
          <p className="vo-meta">{errorMessage}</p>
        </div>
      ) : null}

      {successMessage ? <p className="vo-meta">{successMessage}</p> : null}

      {draftIdeas.length === 0 ? (
        <p className="vo-meta">No AI draft yet.</p>
      ) : (
        <div className="brainstorm-preview">{renderedIdeas}</div>
      )}
    </section>
  );
}
