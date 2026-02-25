"use client";

import { useState } from "react";

const STORAGE_KEY = "draft_nodes";

function loadDraftNodes() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function NodesDraftClient() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Decision");
  const [draftNodes, setDraftNodes] = useState(loadDraftNodes);

  function saveDraftNodes(nextNodes) {
    setDraftNodes(nextNodes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNodes));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const nextNodes = [...draftNodes, { title: trimmedTitle, type }];
    saveDraftNodes(nextNodes);
    setTitle("");
    setType("Decision");
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <label htmlFor="node-title">Title</label>
        <br />
        <input
          id="node-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <br />
        <label htmlFor="node-type">Type</label>
        <br />
        <select
          id="node-type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option>Decision</option>
          <option>Requirement</option>
          <option>Other</option>
        </select>
        <br />
        <button type="submit">Add draft node</button>
      </form>

      <h2>Draft nodes</h2>
      {draftNodes.length === 0 ? (
        <p>No draft nodes yet.</p>
      ) : (
        <ul>
          {draftNodes.map((node, index) => (
            <li key={`${node.title}-${node.type}-${index}`}>
              {node.title} ({node.type})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
