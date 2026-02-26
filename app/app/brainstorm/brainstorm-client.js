"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const AUDIT_ACTOR = "founder";
const ALLOWED_TYPES = [
  "Decision",
  "Requirement",
  "Product",
  "Revenue",
  "Asset",
  "Task",
  "KPI",
  "Risk",
  "Other",
];
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];

function hashIdea(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadJsonArray(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStage(raw) {
  if (raw?.stage === "committed") {
    return "committed";
  }
  if (raw?.stage === "archived") {
    return "archived";
  }
  if (raw?.stage === "proposed") {
    return "proposed";
  }
  if (raw?.status === "committed" || raw?.status === "archived") {
    return raw.status;
  }
  return "proposed";
}

function normalizeStatus(raw) {
  if (raw?.status === "in_progress") {
    return "in_progress";
  }
  if (raw?.status === "review") {
    return "review";
  }
  if (raw?.status === "complete") {
    return "complete";
  }
  return "queued";
}

function normalizeNode(rawNode) {
  if (!rawNode || typeof rawNode !== "object") {
    return null;
  }
  const title = typeof rawNode.title === "string" ? rawNode.title.trim() : "";
  if (!title) {
    return null;
  }

  return {
    id:
      typeof rawNode.id === "string" && rawNode.id.trim()
        ? rawNode.id.trim()
        : createId("node"),
    title,
    type: ALLOWED_TYPES.includes(rawNode.type) ? rawNode.type : "Other",
    createdAt: Number.isFinite(rawNode.createdAt) ? rawNode.createdAt : Date.now(),
    createdBy:
      typeof rawNode.createdBy === "string" && rawNode.createdBy.trim()
        ? rawNode.createdBy
        : AUDIT_ACTOR,
    stage: normalizeStage(rawNode),
    status: normalizeStatus(rawNode),
    version:
      Number.isFinite(rawNode.version) && rawNode.version > 0
        ? Math.floor(rawNode.version)
        : 1,
    relationships: Array.isArray(rawNode.relationships)
      ? rawNode.relationships
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            targetId: typeof item.targetId === "string" ? item.targetId : "",
            type: RELATIONSHIP_TYPES.includes(item.type) ? item.type : "relates_to",
          }))
          .filter((item) => item.targetId)
      : [],
  };
}

function normalizeEdge(rawEdge, nodeById) {
  if (!rawEdge || typeof rawEdge !== "object") {
    return null;
  }
  const from = typeof rawEdge.from === "string" ? rawEdge.from : rawEdge.sourceId;
  const to = typeof rawEdge.to === "string" ? rawEdge.to : rawEdge.targetId;
  const relationshipType =
    typeof rawEdge.relationshipType === "string" ? rawEdge.relationshipType : rawEdge.type;

  if (!from || !to || from === to) {
    return null;
  }
  if (!nodeById.has(from) || !nodeById.has(to)) {
    return null;
  }
  if (!RELATIONSHIP_TYPES.includes(relationshipType)) {
    return null;
  }

  return {
    id:
      typeof rawEdge.id === "string" && rawEdge.id.trim()
        ? rawEdge.id.trim()
        : createId("edge"),
    from,
    to,
    relationshipType,
    stage: rawEdge.stage === "archived" ? "archived" : rawEdge.stage === "committed" ? "committed" : "proposed",
    version:
      Number.isFinite(rawEdge.version) && rawEdge.version > 0
        ? Math.floor(rawEdge.version)
        : 1,
    createdAt: Number.isFinite(rawEdge.createdAt) ? rawEdge.createdAt : Date.now(),
    createdBy:
      typeof rawEdge.createdBy === "string" && rawEdge.createdBy.trim()
        ? rawEdge.createdBy
        : AUDIT_ACTOR,
  };
}

function loadDraftNodes() {
  return loadJsonArray(STORAGE_KEY)
    .map((node) => normalizeNode(node))
    .filter((node) => node !== null);
}

function loadDraftEdges(nodes) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  return loadJsonArray(EDGE_STORAGE_KEY)
    .map((edge) => normalizeEdge(edge, nodeById))
    .filter((edge) => edge !== null);
}

function appendAuditEvent(event) {
  const entries = loadJsonArray(AUDIT_STORAGE_KEY);
  const timestamp =
    typeof event?.timestamp === "string" && event.timestamp
      ? event.timestamp
      : new Date().toISOString();
  const actor =
    typeof event?.actor === "string" && event.actor.trim()
      ? event.actor
      : AUDIT_ACTOR;
  const action =
    typeof event?.action === "string" && event.action
      ? event.action
      : typeof event?.eventType === "string" && event.eventType
        ? event.eventType
        : "UNKNOWN_EVENT";

  const next = [
    ...entries,
    {
      ...event,
      timestamp,
      actor,
      action,
      eventType:
        typeof event?.eventType === "string" && event.eventType
          ? event.eventType
          : action,
    },
  ];

  window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
}

function normalizeGeneratedNodes(rawNodes, existingNodes) {
  const takenIds = new Set(existingNodes.map((node) => node.id));
  const idMap = new Map();

  const nodes = rawNodes
    .map((item) => {
      const node = normalizeNode(item);
      if (!node) {
        return null;
      }

      const sourceId = node.id;
      let nextId = sourceId;
      if (takenIds.has(nextId)) {
        do {
          nextId = createId("ai_node");
        } while (takenIds.has(nextId));
      }

      takenIds.add(nextId);
      idMap.set(sourceId, nextId);

      return {
        ...node,
        id: nextId,
        stage: "proposed",
        status: "queued",
        createdAt: Date.now(),
        createdBy: AUDIT_ACTOR,
        version: 1,
        relationships: [],
      };
    })
    .filter((node) => node !== null);

  return { nodes, idMap };
}

function normalizeGeneratedEdges(rawEdges, idMap, allNodes) {
  const nodeById = new Map(allNodes.map((node) => [node.id, node]));

  return rawEdges
    .map((item) => {
      const from = idMap.get(item?.from) || item?.from;
      const to = idMap.get(item?.to) || item?.to;

      const edge = normalizeEdge(
        {
          ...item,
          id: createId("ai_edge"),
          from,
          to,
          stage: "proposed",
          version: 1,
          createdAt: Date.now(),
          createdBy: AUDIT_ACTOR,
        },
        nodeById
      );

      if (!edge) {
        return null;
      }

      return {
        ...edge,
        stage: "proposed",
      };
    })
    .filter((edge) => edge !== null);
}

function syncRelationships(nodes, edges) {
  const grouped = new Map();

  for (const edge of edges) {
    if (edge.stage === "archived") {
      continue;
    }

    if (!grouped.has(edge.from)) {
      grouped.set(edge.from, []);
    }

    grouped.get(edge.from).push({
      targetId: edge.to,
      type: edge.relationshipType,
    });
  }

  return nodes.map((node) => ({
    ...node,
    relationships: grouped.get(node.id) || [],
  }));
}

export default function BrainstormClient() {
  const [idea, setIdea] = useState("");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [generatedNodes, setGeneratedNodes] = useState([]);
  const [generatedEdges, setGeneratedEdges] = useState([]);
  const [applyMessage, setApplyMessage] = useState("");

  const relationshipCount = useMemo(() => generatedEdges.length, [generatedEdges]);

  async function handleGenerateDraft() {
    setLoading(true);
    setError("");
    setApplyMessage("");

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          mode: "requirements",
          constraints,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setError(data?.error || "Failed to generate draft.");
        setGeneratedNodes([]);
        setGeneratedEdges([]);
        setSummary("");
        return;
      }

      const existingNodes = loadDraftNodes();
      const { nodes, idMap } = normalizeGeneratedNodes(
        Array.isArray(data.nodes) ? data.nodes : [],
        existingNodes
      );
      const edges = normalizeGeneratedEdges(
        Array.isArray(data.edges) ? data.edges : [],
        idMap,
        [...existingNodes, ...nodes]
      );

      setGeneratedNodes(nodes);
      setGeneratedEdges(edges);
      setSummary(typeof data.summary === "string" ? data.summary : "");

      appendAuditEvent({
        timestamp: new Date().toISOString(),
        action: "AI_DRAFT_GENERATED",
        eventType: "AI_DRAFT_GENERATED",
        actor: AUDIT_ACTOR,
        ideaHash: hashIdea(idea.trim()),
        generatedNodeCount: nodes.length,
        generatedEdgeCount: edges.length,
      });
    } catch {
      setError("Failed to generate draft.");
    } finally {
      setLoading(false);
    }
  }

  function handleSendToDraftGraph() {
    if (generatedNodes.length === 0) {
      setApplyMessage("Generate a draft first.");
      return;
    }

    const existingNodes = loadDraftNodes();
    const existingEdges = loadDraftEdges(existingNodes);
    const mergedNodes = [...existingNodes, ...generatedNodes];
    const mergedEdges = [...existingEdges, ...generatedEdges];
    const nodesWithRelationships = syncRelationships(mergedNodes, mergedEdges);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodesWithRelationships));
    window.localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(mergedEdges));

    appendAuditEvent({
      timestamp: new Date().toISOString(),
      action: "AI_DRAFT_APPLIED",
      eventType: "AI_DRAFT_APPLIED",
      actor: AUDIT_ACTOR,
      ideaHash: hashIdea(idea.trim()),
      appliedNodeCount: generatedNodes.length,
      appliedEdgeCount: generatedEdges.length,
    });

    setApplyMessage(
      `Applied ${generatedNodes.length} nodes and ${generatedEdges.length} edges to Draft Graph.`
    );
  }

  return (
    <section className="vo-surface">
      <p className="vo-meta">
        Generate PROPOSED requirements/tasks only. Founder confirmation is still required in Nodes
        for commit/archive/import/reset.
      </p>
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
      <br />
      <label htmlFor="brainstorm-constraints">Constraints (optional)</label>
      <br />
      <input
        id="brainstorm-constraints"
        value={constraints}
        onChange={(event) => setConstraints(event.target.value)}
        className="vo-input"
        style={{ width: "100%" }}
      />
      <p>
        <button
          type="button"
          className="vo-btn-primary"
          disabled={loading || !idea.trim()}
          onClick={handleGenerateDraft}
        >
          {loading ? "Generating..." : "Generate Draft"}
        </button>{" "}
        <button
          type="button"
          className="vo-btn-outline"
          disabled={generatedNodes.length === 0}
          onClick={handleSendToDraftGraph}
        >
          Send to Draft Graph
        </button>
      </p>
      {error ? <p>{error}</p> : null}
      {applyMessage ? <p>{applyMessage}</p> : null}

      {generatedNodes.length === 0 ? (
        <p className="vo-meta">No generated draft yet.</p>
      ) : (
        <section>
          <p>{summary}</p>
          <p className="vo-meta">
            Proposed nodes: {generatedNodes.length} | Relationships: {relationshipCount}
          </p>
          <ul>
            {generatedNodes.map((node) => (
              <li key={node.id}>
                {node.title} ({node.type}) - {node.stage}
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
