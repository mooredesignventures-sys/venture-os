"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "draft_nodes";
const ALLOWED_TYPES = ["Decision", "Requirement", "Other"];

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNode(rawNode) {
  if (!rawNode || typeof rawNode !== "object") {
    return null;
  }

  const title = typeof rawNode.title === "string" ? rawNode.title.trim() : "";
  const type = ALLOWED_TYPES.includes(rawNode.type) ? rawNode.type : "Other";

  if (!title) {
    return null;
  }

  const id =
    typeof rawNode.id === "string" && rawNode.id.trim()
      ? rawNode.id
      : createNodeId();

  const createdAt = Number.isFinite(rawNode.createdAt)
    ? rawNode.createdAt
    : Date.now();

  const archived = Boolean(rawNode.archived);

  const relatedIds = Array.isArray(rawNode.relatedIds)
    ? rawNode.relatedIds.filter((value) => typeof value === "string")
    : [];

  return { id, title, type, createdAt, archived, relatedIds };
}

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
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((node) => normalizeNode(node))
      .filter((node) => node !== null);
  } catch {
    return [];
  }
}

function validateImportPayload(payload) {
  if (!Array.isArray(payload)) {
    return "JSON must be an array of nodes.";
  }

  for (const item of payload) {
    if (!item || typeof item !== "object") {
      return "Each node must be an object.";
    }

    if (typeof item.title !== "string" || !item.title.trim()) {
      return "Each node needs a non-empty title.";
    }

    if (!ALLOWED_TYPES.includes(item.type)) {
      return "Each node type must be Decision, Requirement, or Other.";
    }

    if (
      item.relatedIds !== undefined &&
      (!Array.isArray(item.relatedIds) ||
        item.relatedIds.some((value) => typeof value !== "string"))
    ) {
      return "relatedIds must be an array of string IDs when present.";
    }
  }

  return null;
}

export default function NodesDraftClient() {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Decision");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [draftNodes, setDraftNodes] = useState(loadDraftNodes);
  const [selectedId, setSelectedId] = useState(null);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");

  const selectedNode = draftNodes.find((node) => node.id === selectedId) || null;

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = draftNodes.filter((node) => {
      if (node.archived) {
        return false;
      }

      if (!term) {
        return true;
      }

      return node.title.toLowerCase().includes(term);
    });

    const sorted = [...filtered];

    if (sortMode === "az") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => b.createdAt - a.createdAt);
    }

    return sorted;
  }, [draftNodes, search, sortMode]);

  function saveDraftNodes(nextNodes) {
    setDraftNodes(nextNodes);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNodes));
  }

  function handleAddNode(event) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    const nextNode = {
      id: createNodeId(),
      title: trimmedTitle,
      type,
      createdAt: Date.now(),
      archived: false,
      relatedIds: [],
    };

    const nextNodes = [...draftNodes, nextNode];
    saveDraftNodes(nextNodes);
    setSelectedId(nextNode.id);
    setTitle("");
    setType("Decision");
  }

  function updateSelectedNode(changes) {
    if (!selectedNode) {
      return;
    }

    const nextNodes = draftNodes.map((node) => {
      if (node.id !== selectedNode.id) {
        return node;
      }

      return { ...node, ...changes };
    });

    saveDraftNodes(nextNodes);
  }

  function handleArchiveSelected() {
    if (!selectedNode) {
      return;
    }

    updateSelectedNode({ archived: true });
    setSelectedId(null);
  }

  function handleRemoveSelected() {
    if (!selectedNode) {
      return;
    }

    const removedId = selectedNode.id;

    const nextNodes = draftNodes
      .filter((node) => node.id !== removedId)
      .map((node) => ({
        ...node,
        relatedIds: node.relatedIds.filter((relatedId) => relatedId !== removedId),
      }));

    saveDraftNodes(nextNodes);
    setSelectedId(null);
  }

  function handleAddRelated(relatedId) {
    if (!selectedNode || !relatedId) {
      return;
    }

    if (selectedNode.relatedIds.includes(relatedId)) {
      return;
    }

    updateSelectedNode({ relatedIds: [...selectedNode.relatedIds, relatedId] });
  }

  function handleRemoveRelated(relatedId) {
    if (!selectedNode) {
      return;
    }

    updateSelectedNode({
      relatedIds: selectedNode.relatedIds.filter((id) => id !== relatedId),
    });
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(draftNodes, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "draft-nodes.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleImportJson() {
    setImportMessage("");

    try {
      const parsed = JSON.parse(importText);
      const validationError = validateImportPayload(parsed);

      if (validationError) {
        setImportMessage(validationError);
        return;
      }

      const normalized = parsed
        .map((node) => normalizeNode(node))
        .filter((node) => node !== null);

      saveDraftNodes(normalized);
      setSelectedId(null);
      setImportMessage("Import successful.");
    } catch {
      setImportMessage("Invalid JSON.");
    }
  }

  const relatedNodeOptions = draftNodes.filter(
    (node) => !node.archived && node.id !== selectedId
  );

  const relatedNodes = selectedNode
    ? selectedNode.relatedIds
        .map((id) => draftNodes.find((node) => node.id === id))
        .filter((node) => Boolean(node))
    : [];

  return (
    <section>
      <form onSubmit={handleAddNode}>
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

      <p>
        <button type="button" onClick={handleExportJson}>
          Export JSON
        </button>
      </p>

      <label htmlFor="import-json">Import JSON</label>
      <br />
      <textarea
        id="import-json"
        value={importText}
        onChange={(event) => setImportText(event.target.value)}
        rows={6}
        cols={50}
      />
      <br />
      <button type="button" onClick={handleImportJson}>
        Import JSON
      </button>
      {importMessage ? <p>{importMessage}</p> : null}

      <h2>Draft nodes</h2>

      <label htmlFor="search-title">Search title</label>
      <br />
      <input
        id="search-title"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <br />

      <label htmlFor="sort-mode">Sort</label>
      <br />
      <select
        id="sort-mode"
        value={sortMode}
        onChange={(event) => setSortMode(event.target.value)}
      >
        <option value="newest">Newest</option>
        <option value="az">A-Z</option>
      </select>

      {visibleNodes.length === 0 ? (
        <p>No draft nodes found.</p>
      ) : (
        <ul>
          {visibleNodes.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => setSelectedId(node.id)}>
                {node.title} ({node.type})
              </button>
            </li>
          ))}
        </ul>
      )}

      <h2>Node detail</h2>
      {!selectedNode ? (
        <p>Select a node to view or edit details.</p>
      ) : (
        <div>
          <label htmlFor="detail-title">Title</label>
          <br />
          <input
            id="detail-title"
            value={selectedNode.title}
            onChange={(event) => {
              const nextTitle = event.target.value;
              updateSelectedNode({ title: nextTitle });
            }}
          />
          <br />
          <label htmlFor="detail-type">Type</label>
          <br />
          <select
            id="detail-type"
            value={selectedNode.type}
            onChange={(event) => updateSelectedNode({ type: event.target.value })}
          >
            <option>Decision</option>
            <option>Requirement</option>
            <option>Other</option>
          </select>

          <p>
            <button type="button" onClick={handleArchiveSelected}>
              Archive
            </button>{" "}
            <button type="button" onClick={handleRemoveSelected}>
              Remove
            </button>
          </p>

          <h3>Related nodes</h3>
          {relatedNodes.length === 0 ? (
            <p>No related nodes yet.</p>
          ) : (
            <ul>
              {relatedNodes.map((node) => (
                <li key={node.id}>
                  {node.title} ({node.type}){" "}
                  <button
                    type="button"
                    onClick={() => handleRemoveRelated(node.id)}
                  >
                    Unlink
                  </button>
                </li>
              ))}
            </ul>
          )}

          {relatedNodeOptions.length > 0 ? (
            <p>
              <select
                defaultValue=""
                onChange={(event) => {
                  handleAddRelated(event.target.value);
                  event.target.value = "";
                }}
              >
                <option value="">Link related node...</option>
                {relatedNodeOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title} ({node.type})
                  </option>
                ))}
              </select>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
