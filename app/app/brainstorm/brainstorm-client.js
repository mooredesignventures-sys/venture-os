"use client";

import { useState } from "react";

export default function BrainstormClient() {
  const [idea, setIdea] = useState("");
  const [preview, setPreview] = useState([]);

  function handleGeneratePreview() {
    const text = idea.trim();
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
    <section>
      <label htmlFor="brainstorm-idea">Brainstorm idea</label>
      <br />
      <textarea
        id="brainstorm-idea"
        rows={6}
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        className="vo-input"
        style={{ width: "100%" }}
      />
      <p>
        <button type="button" className="vo-btn-primary" onClick={handleGeneratePreview}>
          Generate Draft
        </button>{" "}
        <button type="button" className="vo-btn-outline" disabled>
          Apply to Draft Graph
        </button>
      </p>
      {preview.length === 0 ? (
        <p className="vo-meta">No generated draft yet.</p>
      ) : (
        <ul>
          {preview.map((item, index) => (
            <li key={`${item.type}-${index}`}>
              {item.type}: {item.title}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
