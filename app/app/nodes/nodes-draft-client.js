"use client";

import { useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const STORAGE_KEY = "draft_nodes";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const APP_VERSION = "local-draft-v1";
const AUDIT_ACTOR = "founder";
const ALLOWED_TYPES = ["Decision", "Requirement", "Other"];
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];
const STATUS_TYPES = ["proposed", "committed", "archived"];
const DEMO_NODES = [
  {
    id: "demo_decision_1",
    title: "Adopt Quarterly Planning Cycle",
    type: "Decision",
    status: "committed",
    createdAt: 1704067200000,
    relationships: [
      { targetId: "demo_req_1", type: "depends_on" },
      { targetId: "demo_other_1", type: "enables" },
    ],
  },
  {
    id: "demo_decision_2",
    title: "Launch SMB Pilot Program",
    type: "Decision",
    status: "proposed",
    createdAt: 1704153600000,
    relationships: [
      { targetId: "demo_req_2", type: "depends_on" },
      { targetId: "demo_other_2", type: "enables" },
    ],
  },
  {
    id: "demo_decision_3",
    title: "Prioritize Churn Reduction",
    type: "Decision",
    status: "proposed",
    createdAt: 1704240000000,
    relationships: [{ targetId: "demo_req_3", type: "depends_on" }],
  },
  {
    id: "demo_req_1",
    title: "Document planning inputs",
    type: "Requirement",
    status: "proposed",
    createdAt: 1704326400000,
    relationships: [{ targetId: "demo_other_3", type: "relates_to" }],
  },
  {
    id: "demo_req_2",
    title: "Define pilot success metrics",
    type: "Requirement",
    status: "proposed",
    createdAt: 1704412800000,
    relationships: [{ targetId: "demo_other_4", type: "depends_on" }],
  },
  {
    id: "demo_req_3",
    title: "Set retention baseline dashboard",
    type: "Requirement",
    status: "proposed",
    createdAt: 1704499200000,
    relationships: [{ targetId: "demo_other_2", type: "enables" }],
  },
  {
    id: "demo_other_1",
    title: "Planning review ritual",
    type: "Other",
    status: "proposed",
    createdAt: 1704585600000,
    relationships: [{ targetId: "demo_other_3", type: "relates_to" }],
  },
  {
    id: "demo_other_2",
    title: "Pilot customer segment list",
    type: "Other",
    status: "proposed",
    createdAt: 1704672000000,
    relationships: [{ targetId: "demo_other_4", type: "relates_to" }],
  },
  {
    id: "demo_other_3",
    title: "Cross-team dependency map",
    type: "Other",
    status: "proposed",
    createdAt: 1704758400000,
    relationships: [],
  },
  {
    id: "demo_other_4",
    title: "Retention dashboard checklist",
    type: "Other",
    status: "proposed",
    createdAt: 1704844800000,
    relationships: [],
  },
];

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
  if (STATUS_TYPES.includes(rawNode.stage)) {
    return rawNode.stage;
  }

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
  const stage = normalizeStatus(rawNode);

  return {
    id,
    title,
    type,
    createdAt,
    stage,
    status: stage,
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

function clearAuditEntries() {
  window.localStorage.removeItem(AUDIT_STORAGE_KEY);
}

function saveAuditEntries(entries) {
  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
}

function buildRelationshipList(nodes) {
  return nodes.flatMap((node) => {
    const relationships = Array.isArray(node.relationships)
      ? node.relationships
      : [];

    return relationships
      .filter((rel) => rel && typeof rel.targetId === "string")
      .map((rel) => ({
        sourceId: node.id,
        targetId: rel.targetId,
        type: RELATIONSHIP_TYPES.includes(rel.type) ? rel.type : "relates_to",
      }));
  });
}

function validateBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    return "Bundle must be a JSON object.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "metadata")) {
    return "Missing field: metadata";
  }

  if (!bundle.metadata || typeof bundle.metadata !== "object") {
    return "Invalid field: metadata must be an object.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "schemaVersion")) {
    return "Missing field: metadata.schemaVersion";
  }

  if (bundle.metadata.schemaVersion !== "1") {
    return "Unsupported bundle version";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "exportedAt")) {
    return "Missing field: metadata.exportedAt";
  }

  if (typeof bundle.metadata.exportedAt !== "string") {
    return "Invalid field: metadata.exportedAt must be a string.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "appVersion")) {
    return "Missing field: metadata.appVersion";
  }

  if (typeof bundle.metadata.appVersion !== "string") {
    return "Invalid field: metadata.appVersion must be a string.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "nodes")) {
    return "Missing field: nodes";
  }

  const nodeValidationError = validateImportPayload(bundle.nodes);
  if (nodeValidationError) {
    return `nodes: ${nodeValidationError}`;
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "relationships")) {
    return "Missing field: relationships";
  }

  if (!Array.isArray(bundle.relationships)) {
    return "Invalid field: relationships must be an array.";
  }

  const invalidRelationship = bundle.relationships.some(
    (rel) =>
      !rel ||
      typeof rel !== "object" ||
      typeof rel.sourceId !== "string" ||
      typeof rel.targetId !== "string" ||
      !RELATIONSHIP_TYPES.includes(rel.type)
  );

  if (invalidRelationship) {
    return "Each relationship must include sourceId, targetId, and a valid type.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "auditEvents")) {
    return "Missing field: auditEvents";
  }

  if (!Array.isArray(bundle.auditEvents)) {
    return "Invalid field: auditEvents must be an array.";
  }

  const invalidAuditEvent = bundle.auditEvents.some(
    (event) =>
      !event ||
      typeof event !== "object" ||
      typeof event.timestamp !== "string" ||
      typeof event.action !== "string" ||
      (event.actor !== undefined && typeof event.actor !== "string")
  );

  if (invalidAuditEvent) {
    return "Each audit event needs timestamp/action strings, and actor must be a string when present.";
  }

  return null;
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

    if (item.stage !== undefined && !STATUS_TYPES.includes(item.stage)) {
      return "stage must be proposed, committed, or archived.";
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

  const normalizedNodes = payload
    .map((node) => normalizeNode(node))
    .filter((node) => node !== null);

  const nodeById = new Map(normalizedNodes.map((node) => [node.id, node]));

  for (const node of normalizedNodes) {
    const nodeStage = normalizeStatus(node);

    if (nodeStage === "archived" && node.relationships.length > 0) {
      return "Archived nodes cannot accept new children or relationships.";
    }

    for (const relationship of node.relationships) {
      const target = nodeById.get(relationship.targetId);

      if (!target) {
        continue;
      }

      const targetStage = normalizeStatus(target);
      if (nodeStage === "committed" && targetStage === "proposed") {
        return "Committed nodes cannot link to proposed nodes.";
      }
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
  const [bundleText, setBundleText] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [relationshipTargetId, setRelationshipTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("relates_to");
  const [relationshipError, setRelationshipError] = useState("");

  const selectedNode = draftNodes.find((node) => node.id === selectedId) || null;
  const selectedStage = selectedNode ? normalizeStatus(selectedNode) : null;
  const selectedIsCommitted = selectedStage === "committed";
  const selectedIsArchived = selectedStage === "archived";

  const nodeById = useMemo(
    () => new Map(draftNodes.map((node) => [node.id, node])),
    [draftNodes]
  );

  const visibleNodes = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = draftNodes.filter((node) => {
      if (!showArchived && normalizeStatus(node) === "archived") {
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
      stage: "proposed",
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
    const nextChanges = { ...changes };

    if (nextChanges.status && !nextChanges.stage) {
      nextChanges.stage = nextChanges.status;
    }

    if (nextChanges.stage && !nextChanges.status) {
      nextChanges.status = nextChanges.stage;
    }

    const nextNodes = draftNodes.map((node) => {
      if (node.id !== selectedNode.id) {
        return node;
      }

      return { ...node, ...nextChanges };
    });

    saveDraftNodes(nextNodes);
  }

  function handleCommitSelected() {
    if (!selectedNode || selectedNode.status !== "proposed") {
      return;
    }

    updateSelectedNode({ status: "committed", stage: "committed" });
    appendAuditEntry({
      timestamp: new Date().toISOString(),
      action: "NODE_COMMITTED",
      nodeId: selectedNode.id,
      nodeTitle: selectedNode.title,
      actor: AUDIT_ACTOR,
    });
  }

  function handleArchiveSelected() {
    if (!selectedNode || selectedNode.status === "archived") {
      return;
    }

    updateSelectedNode({ status: "archived", stage: "archived" });
    setSelectedId(null);
  }

  function handleAddRelationship() {
    if (!selectedNode || !relationshipTargetId) {
      return;
    }

    if (selectedIsCommitted) {
      setRelationshipError("Committed nodes cannot link to proposed nodes.");
      return;
    }

    if (selectedIsArchived) {
      setRelationshipError("Archived nodes cannot accept new children or relationships.");
      return;
    }

    const targetNode = nodeById.get(relationshipTargetId);
    if (!targetNode) {
      setRelationshipError("Selected relationship target no longer exists.");
      return;
    }

    const targetStage = normalizeStatus(targetNode);
    if (targetStage === "proposed" && selectedStage === "committed") {
      setRelationshipError("Committed nodes cannot link to proposed nodes.");
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
      setRelationshipError("This relationship already exists.");
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
    setRelationshipError("");
  }

  function handleRemoveRelationship(indexToRemove) {
    if (!selectedNode || selectedIsCommitted || selectedIsArchived) {
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

  function handleLoadDemoData() {
    const demoNodes = DEMO_NODES.map((node) => normalizeNode(node)).filter(
      (node) => node !== null
    );
    saveDraftNodes(demoNodes);
    clearAuditEntries();
    setSelectedId(null);
    setBundleMessage("");
    setImportText("");
    setImportError("");
    setRelationshipError("");
  }

  function handleResetDemoData() {
    saveDraftNodes([]);
    clearAuditEntries();
    setSelectedId(null);
    setBundleMessage("");
    setImportText("");
    setImportError("");
    setRelationshipError("");
  }

  function handleExportBundle() {
    const bundle = {
      metadata: {
        schemaVersion: "1",
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
      },
      nodes: draftNodes,
      relationships: buildRelationshipList(draftNodes),
      auditEvents: loadAuditEntries(),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "venture-os-bundle.json";
    link.click();
    URL.revokeObjectURL(url);
    setBundleMessage("Bundle exported.");
  }

  function handleImportBundle() {
    setBundleMessage("");

    try {
      const parsed = JSON.parse(bundleText);
      const validationError = validateBundle(parsed);

      if (validationError) {
        setBundleMessage(`Import failed: ${validationError}`);
        return;
      }

      const normalizedNodes = parsed.nodes
        .map((node) => normalizeNode(node))
        .filter((node) => node !== null)
        .map((node) => ({ ...node, relationships: [] }));

      const nodesById = new Map(normalizedNodes.map((node) => [node.id, node]));

      for (const rel of parsed.relationships) {
        const sourceNode = nodesById.get(rel.sourceId);
        const targetExists = nodesById.has(rel.targetId);

        if (!sourceNode || !targetExists) {
          continue;
        }

        sourceNode.relationships.push({
          targetId: rel.targetId,
          type: rel.type,
        });
      }

      saveDraftNodes(normalizedNodes);
      saveAuditEntries(
        parsed.auditEvents.map((event) => ({
          ...event,
          actor: typeof event.actor === "string" ? event.actor : "unknown",
        }))
      );
      setSelectedId(null);
      setImportText("");
      setImportError("");
      setRelationshipError("");
      setBundleMessage("Bundle imported successfully.");
    } catch {
      setBundleMessage("Import failed: Invalid JSON.");
    }
  }

  const relationshipTargetOptions = draftNodes.filter(
    (node) => normalizeStatus(node) !== "archived" && node.id !== selectedId
  );

  const selectedRelationships = selectedNode
    ? Array.isArray(selectedNode.relationships)
      ? selectedNode.relationships
      : []
    : [];

  return (
    <section>
      <p>
        <button type="button" onClick={handleLoadDemoData}>
          Load Demo Data
        </button>{" "}
        <button type="button" onClick={handleResetDemoData}>
          Reset (clear all local data)
        </button>
      </p>
      <p>
        <button type="button" onClick={handleExportBundle}>
          Export Bundle (JSON)
        </button>{" "}
        <button type="button" onClick={handleImportBundle}>
          Import Bundle
        </button>
      </p>
      <label htmlFor="bundle-json">Bundle JSON</label>
      <br />
      <textarea
        id="bundle-json"
        value={bundleText}
        onChange={(event) => {
          setBundleText(event.target.value);
          setBundleMessage("");
        }}
        rows={6}
        cols={50}
      />
      {bundleMessage ? <p>{bundleMessage}</p> : null}

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

      <SearchBox
        id="search-title"
        label="Search title"
        value={search}
        onChange={setSearch}
      />
      <br />
      <SelectFilter
        id="sort-mode"
        label="Sort"
        value={sortMode}
        onChange={setSortMode}
        options={[
          { value: "newest", label: "Newest" },
          { value: "az", label: "A-Z" },
        ]}
      />
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
        <EmptyState
          title="No draft nodes found."
          message="Load demo data or add your first draft node to get started."
          action={
            <button type="button" onClick={handleLoadDemoData}>
              Load Demo Data
            </button>
          }
        />
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
            Status: <strong>{selectedStage}</strong>{" "}
            {selectedIsCommitted ? <span>Committed</span> : null}
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
              disabled={selectedIsArchived}
            >
              Archive
            </button>
          </p>
          {selectedIsCommitted ? (
            <p>Committed nodes are locked. Committed nodes cannot link to proposed nodes.</p>
          ) : null}
          {selectedIsArchived ? (
            <p>Archived nodes cannot accept new children or relationships.</p>
          ) : null}

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
                      disabled={selectedIsCommitted || selectedIsArchived}
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
                disabled={selectedIsCommitted || selectedIsArchived}
                onChange={(event) => {
                  setRelationshipTargetId(event.target.value);
                  setRelationshipError("");
                }}
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
                disabled={selectedIsCommitted || selectedIsArchived}
                onChange={(event) => {
                  setRelationshipType(event.target.value);
                  setRelationshipError("");
                }}
              >
                <option value="depends_on">depends_on</option>
                <option value="enables">enables</option>
                <option value="relates_to">relates_to</option>
              </select>{" "}
              <button
                type="button"
                disabled={selectedIsCommitted || selectedIsArchived}
                onClick={handleAddRelationship}
              >
                Add relationship
              </button>
              {relationshipError ? <br /> : null}
              {relationshipError ? <span>{relationshipError}</span> : null}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
