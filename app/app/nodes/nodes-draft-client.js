"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "draft_nodes";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const ALLOWED_TYPES = ["Decision", "Requirement", "Other"];
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];
const STATUS_TYPES = ["proposed", "committed", "archived"];

function createNodeId() {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRelationships(rawNode) {
  const typedRelationships = Array.isArray(rawNode.relationships)
    ? rawNode.relationships
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          targetId: typeof item.targetId === "string" ? item.targetId : "",
          type: RELATIONSHIP_TYPES.includes(item.type)
            ? item.type
            : "relates_to",
        }))
        .filter((item) => item.targetId)
    : [];

  if (typedRelationships.length > 0) {
    return typedRelationships;
  }

  const relatedIds = Array.isArray(rawNode.relatedIds)
    ? rawNode.relatedIds.filter((value) => typeof value === "string")
    : [];

  return relatedIds.map((targetId) => ({ targetId, type: "relates_to" }));
}

function normalizeStatus(rawNode) {
  if (STATUS_TYPES.includes(rawNode.status)) {
    return rawNode.status;
  }

  if (rawNode.archived) {
    return "archived";
  }

  return "proposed";
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

  return {
    id,
    title,
    type,
    createdAt,
    status: normalizeStatus(rawNode),
    relationships: normalizeRelationships(rawNode),
  };
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

function loadAuditEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
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
  const currentEntries = loadAuditEntries();
  const nextEntries = [...currentEntries, entry];
  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(nextEntries));
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

    if (item.status !== undefined && !STATUS_TYPES.includes(item.status)) {
      return "status must be proposed, committed, or archived.";
    }

    if (item.relationships !== undefined) {
      if (!Array.isArray(item.relationships)) {
        return "relationships must be an array when present.";
      }

      const invalidRelationship = item.relationships.some(
        (rel) =>
          !rel ||
          typeof rel !== "object" ||
          typeof rel.targetId !== "string" ||
          !RELATIONSHIP_TYPES.includes(rel.type)
      );

      if (invalidRelationship) {
        return "Each relationship needs targetId and a valid type.";
      }
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
  const [showArchived, setShowArchived] = useState(false);
  const [draftNodes, setDraftNodes] = useState(loadDraftNodes);
  const [selectedId, setSelectedId] = useState(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [relationshipTargetId, setRelationshipTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("relates_to");

  const selectedNode = draftNodes.find((node) => node.id === selectedId) || null;
  const selectedIsCommitted = selectedNode?.status === "committed";

  const nodeById = useMemo(
    () => new Map(draftNodes.map((node) => [node.id, node])),
    [draftNodes]
  );

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = draftNodes.filter((node) => {
      if (!showArchived && node.status === "archived") {
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
  }, [draftNodes, search, sortMode, showArchived]);

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
      status: "proposed",
      relationships: [],
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

  function handleCommitSelected() {
    if (!selectedNode || selectedNode.status !== "proposed") {
      return;
    }

    updateSelectedNode({ status: "committed" });
    appendAuditEntry({
      timestamp: new Date().toISOString(),
      action: "NODE_COMMITTED",
      nodeId: selectedNode.id,
      nodeTitle: selectedNode.title,
    });
  }

  function handleArchiveSelected() {
    if (!selectedNode || selectedNode.status === "archived") {
      return;
    }

    updateSelectedNode({ status: "archived" });
    setSelectedId(null);
  }

  function handleAddRelationship() {
    if (!selectedNode || !relationshipTargetId || selectedIsCommitted) {
      return;
    }

    const existing = Array.isArray(selectedNode.relationships)
      ? selectedNode.relationships
      : [];

    const duplicate = existing.some(
      (rel) =>
        rel.targetId === relationshipTargetId && rel.type === relationshipType
    );

    if (duplicate) {
      return;
    }

    updateSelectedNode({
      relationships: [
        ...existing,
        { targetId: relationshipTargetId, type: relationshipType },
      ],
    });

    setRelationshipTargetId("");
    setRelationshipType("relates_to");
  }

  function handleRemoveRelationship(indexToRemove) {
    if (!selectedNode || selectedIsCommitted) {
      return;
    }

    updateSelectedNode({
      relationships: (selectedNode.relationships || []).filter(
        (_, index) => index !== indexToRemove
      ),
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
    setImportError("");

    try {
      const parsed = JSON.parse(importText);
      const validationError = validateImportPayload(parsed);

      if (validationError) {
        setImportError(validationError);
        return;
      }

      const normalized = parsed
        .map((node) => normalizeNode(node))
        .filter((node) => node !== null);

      saveDraftNodes(normalized);
      setSelectedId(null);
    } catch {
      setImportError("Invalid JSON.");
    }
  }

  const relationshipTargetOptions = draftNodes.filter(
    (node) => node.status !== "archived" && node.id !== selectedId
  );

  const selectedRelationships = selectedNode
    ? Array.isArray(selectedNode.relationships)
      ? selectedNode.relationships
      : []
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
        onChange={(event) => {
          setImportText(event.target.value);
          setImportError("");
        }}
        rows={6}
        cols={50}
      />
      <br />
      <button type="button" onClick={handleImportJson}>
        Import JSON
      </button>
      {importError ? <p>{importError}</p> : null}

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
      <br />
      <label>
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(event) => setShowArchived(event.target.checked)}
        />{" "}
        Show archived
      </label>

      {visibleNodes.length === 0 ? (
        <p>No draft nodes found.</p>
      ) : (
        <ul>
          {visibleNodes.map((node) => (
            <li key={node.id}>
              <button type="button" onClick={() => setSelectedId(node.id)}>
                {node.title} ({node.type}) [{node.status}]
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
          <p>
            Status: <strong>{selectedNode.status}</strong>{" "}
            {selectedNode.status === "committed" ? <span>Committed</span> : null}
          </p>

          <label htmlFor="detail-title">Title</label>
          <br />
          <input
            id="detail-title"
            value={selectedNode.title}
            disabled={selectedIsCommitted}
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
            disabled={selectedIsCommitted}
            onChange={(event) => updateSelectedNode({ type: event.target.value })}
          >
            <option>Decision</option>
            <option>Requirement</option>
            <option>Other</option>
          </select>

          <p>
            <button
              type="button"
              onClick={handleCommitSelected}
              disabled={selectedNode.status !== "proposed"}
            >
              Commit
            </button>{" "}
            <button
              type="button"
              onClick={handleArchiveSelected}
              disabled={selectedNode.status === "archived"}
            >
              Archive
            </button>
          </p>

          <h3>Relationships</h3>
          {selectedRelationships.length === 0 ? (
            <p>No relationships yet.</p>
          ) : (
            <ul>
              {selectedRelationships.map((relationship, index) => {
                const targetNode = nodeById.get(relationship.targetId);
                if (!targetNode) {
                  return null;
                }

                return (
                  <li key={`${selectedNode.id}-${relationship.targetId}-${index}`}>
                    {relationship.type}: {targetNode.title} ({targetNode.type}){" "}
                    <button
                      type="button"
                      disabled={selectedIsCommitted}
                      onClick={() => handleRemoveRelationship(index)}
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {relationshipTargetOptions.length > 0 ? (
            <p>
              <label htmlFor="relationship-target">Add relationship</label>
              <br />
              <select
                id="relationship-target"
                value={relationshipTargetId}
                disabled={selectedIsCommitted}
                onChange={(event) => setRelationshipTargetId(event.target.value)}
              >
                <option value="">Select node...</option>
                {relationshipTargetOptions.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.title} ({node.type})
                  </option>
                ))}
              </select>{" "}
              <select
                value={relationshipType}
                disabled={selectedIsCommitted}
                onChange={(event) => setRelationshipType(event.target.value)}
              >
                <option value="depends_on">depends_on</option>
                <option value="enables">enables</option>
                <option value="relates_to">relates_to</option>
              </select>{" "}
              <button
                type="button"
                disabled={selectedIsCommitted}
                onClick={handleAddRelationship}
              >
                Add relationship
              </button>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
