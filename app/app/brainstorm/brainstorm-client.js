"use client";

import { useState } from "react";

export default function BrainstormClient() {
  const [idea, setIdea] = useState("");
  const [preview, setPreview] = useState([]);
  const trimmedIdea = idea.trim();

  function handleGeneratePreview() {
    const text = trimmedIdea;
    if (!text) {
      setPreview([]);
      return;
    }

    setPreview([
      { type: "Decision", title: `Define objective: ${text.slice(0, 80)}` },
      { type: "Requirement", title: "Capture scope and acceptance criteria" },
      { type: "Task", title: "Break draft into implementation tasks" },
    ]);
  }

  return (
    <section className="brainstorm-command">
      <div className="brainstorm-command__meta">
        <span className="status-badge">Idea chars: {idea.length}</span>
        <span className="status-badge">Preview items: {preview.length}</span>
      </div>
      <label htmlFor="brainstorm-idea">Brainstorm idea</label>
      <textarea
        id="brainstorm-idea"
        rows={6}
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        className="vo-input"
        placeholder="Example: Build a lightweight founder dashboard for proposal triage."
      />
      <div className="brainstorm-actions">
        <button type="button" className="vo-btn-primary" onClick={handleGeneratePreview}>
          Generate Draft
        </button>
        <button type="button" className="vo-btn-outline" disabled>
          Apply to Draft Graph
        </button>
      </div>
      {preview.length === 0 ? (
        <p className="vo-meta">No generated draft yet.</p>
      ) : (
        <div className="brainstorm-preview">
          {preview.map((item, index) => (
            <article key={`${item.type}-${index}`} className="brainstorm-preview__item">
              <p className="vo-meta">{item.type}</p>
              <p>{item.title}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
