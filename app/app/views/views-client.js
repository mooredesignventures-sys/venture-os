"use client";

import { Fragment, useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
const REQUIREMENTS_DRAFT_NODE_STORAGE_KEY = "requirements_draft_nodes";
const REQUIREMENTS_DRAFT_EDGE_STORAGE_KEY = "requirements_draft_edges";
const BASELINE_SNAPSHOT_STORAGE_KEY = "baseline_snapshots";
const RECRUITED_EXPERTS_STORAGE_KEY = "recruited_experts";
const COMMITTED_NODE_STORAGE_KEY = "committed_nodes";
const COMMITTED_EDGE_STORAGE_KEY = "committed_edges";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";
const COMMIT_CONFIRM_TEXT = "CONFIRMED";
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];
const RISK_LEVELS = ["low", "medium", "high"];
const EDITABLE_STATUSES = ["queued", "in_progress", "review", "complete"];

function renderAiModeBadge(source, fallbackReason) {
  const isLive = source === "ai";
  return (
    <div className="text-xs">
      <span className="status-badge">
        {isLive ? "AI: LIVE" : "AI: FALLBACK (mock)"}
      </span>
      {!isLive && fallbackReason === "missing_api_key" ? (
        <div>Set OPENAI_API_KEY to enable LIVE AI.</div>
      ) : null}
    </div>
  );
}

function renderLifecycleBadge(stage) {
  const normalized = typeof stage === "string" ? stage.toLowerCase() : "proposed";
  const isCommitted = normalized === "committed";
  return (
    <span className={`status-badge${isCommitted ? " status-badge--committed" : ""}`}>
      {isCommitted ? "COMMITTED" : "PROPOSED"}
    </span>
  );
}

function normalizeRelationships(node) {
  if (Array.isArray(node.relationships)) {
    return node.relationships
      .filter((rel) => rel && typeof rel === "object")
      .map((rel) => ({
        targetId: typeof rel.targetId === "string" ? rel.targetId : "",
        type: RELATIONSHIP_TYPES.includes(rel.type) ? rel.type : "relates_to",
      }))
      .filter((rel) => rel.targetId);
  }

  if (Array.isArray(node.relatedIds)) {
    return node.relatedIds
      .filter((id) => typeof id === "string")
      .map((id) => ({ targetId: id, type: "relates_to" }));
  }

  return [];
}

function normalizeStatus(node) {
  if (node.stage === "committed") {
    return "committed";
  }

  if (node.stage === "archived") {
    return "archived";
  }

  if (node.status === "committed") {
    return "committed";
  }

  if (node.status === "archived") {
    return "archived";
  }

  if (node.archived) {
    return "archived";
  }

  return "active";
}

function loadDraftEdges(key = EDGE_STORAGE_KEY) {
  if (typeof window === "undefined") {
    return [];
  }

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

function loadDraftNodes(key = STORAGE_KEY) {
  if (typeof window === "undefined") {
    return [];
  }

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

function loadStoredArray(key) {
  if (typeof window === "undefined") {
    return [];
  }

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

function resolveAuditStorageKey() {
  if (typeof window === "undefined") {
    return FALLBACK_AUDIT_STORAGE_KEY;
  }

  if (window.localStorage.getItem(AUDIT_STORAGE_KEY) !== null) {
    return AUDIT_STORAGE_KEY;
  }

  if (window.localStorage.getItem(FALLBACK_AUDIT_STORAGE_KEY) !== null) {
    return FALLBACK_AUDIT_STORAGE_KEY;
  }

  return FALLBACK_AUDIT_STORAGE_KEY;
}

function appendAuditEvent(type, payload) {
  if (typeof window === "undefined") {
    return;
  }

  const createdAt = new Date().toISOString();
  const event = {
    id: `${Date.now()}-${type}`,
    type,
    createdAt,
    payload,
    timestamp: createdAt,
    action: type,
    eventType: type,
    actor: "founder",
  };

  const key = resolveAuditStorageKey();
  const existing = loadStoredArray(key);
  window.localStorage.setItem(key, JSON.stringify([...existing, event]));
}

function getActiveNodes(nodes) {
  return nodes
    .filter(
      (node) =>
        node &&
        typeof node.id === "string" &&
        typeof node.title === "string" &&
        typeof node.type === "string" &&
        normalizeStatus(node) !== "archived"
    )
    .map((node) => ({
      ...node,
      relationships: normalizeRelationships(node),
    }));
}

function buildRelationships(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  if (edges.length > 0) {
    return edges
      .filter(
        (edge) =>
          edge &&
          typeof edge.from === "string" &&
          typeof edge.to === "string" &&
          RELATIONSHIP_TYPES.includes(edge.relationshipType) &&
          edge.stage !== "archived"
      )
      .map((edge) => {
        const source = nodeById.get(edge.from);
        const target = nodeById.get(edge.to);
        if (!source || !target) {
          return null;
        }

        return {
          sourceId: source.id,
          sourceTitle: source.title,
          sourceType: source.type,
          targetId: target.id,
          targetTitle: target.title,
          targetType: target.type,
          type: edge.relationshipType,
        };
      })
      .filter((item) => item !== null);
  }

  return nodes.flatMap((node) =>
    node.relationships
      .map((rel) => {
        const relatedNode = nodeById.get(rel.targetId);
        if (!relatedNode) {
          return null;
        }

        return {
          sourceId: node.id,
          sourceTitle: node.title,
          sourceType: node.type,
          targetId: relatedNode.id,
          targetTitle: relatedNode.title,
          targetType: relatedNode.type,
          type: rel.type,
        };
      })
      .filter((item) => item !== null)
  );
}

export default function ViewsClient({ mode, viewScope = "draft" }) {
  const isRequirementsMode = mode === "requirements";
  const draftNodeKey = isRequirementsMode ? REQUIREMENTS_DRAFT_NODE_STORAGE_KEY : STORAGE_KEY;
  const draftEdgeKey = isRequirementsMode ? REQUIREMENTS_DRAFT_EDGE_STORAGE_KEY : EDGE_STORAGE_KEY;
  const [search, setSearch] = useState("");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const [requirementsScope, setRequirementsScope] = useState("proposed");
  const [requirementsChatInput, setRequirementsChatInput] = useState("");
  const [requirementsChatMessages, setRequirementsChatMessages] = useState(() => [
    {
      id: "req-chat:init:founder",
      role: "founder",
      text: "Create initial requirements for a stable launch.",
    },
    {
      id: "req-chat:init:assistant",
      role: "assistant",
      text: "Share your requirement goal and I will draft proposed requirement nodes and links.",
    },
  ]);
  const [requirementsAiLoading, setRequirementsAiLoading] = useState(false);
  const [requirementsAiError, setRequirementsAiError] = useState("");
  const [requirementsAiPreview, setRequirementsAiPreview] = useState(null);
  const [requirementsAiApplyResult, setRequirementsAiApplyResult] = useState("");
  const [founderCommitText, setFounderCommitText] = useState("");
  const [commitError, setCommitError] = useState("");
  const [commitResult, setCommitResult] = useState(null);
  const [rowEdits, setRowEdits] = useState({});
  const [savedNodeId, setSavedNodeId] = useState("");
  const [snapshotError, setSnapshotError] = useState("");
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [snapshotResult, setSnapshotResult] = useState("");
  const [baselineError, setBaselineError] = useState("");
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselinePreview, setBaselinePreview] = useState(null);
  const [baselineApplyResult, setBaselineApplyResult] = useState("");
  const [childProposalState, setChildProposalState] = useState({});
  const activeNodes = useMemo(() => getActiveNodes(loadDraftNodes(draftNodeKey)), [draftNodeKey, refreshToken]);
  const committedNodes = useMemo(
    () => getActiveNodes(loadStoredArray(COMMITTED_NODE_STORAGE_KEY)),
    [refreshToken],
  );
  const activeEdges = useMemo(() => loadDraftEdges(draftEdgeKey), [draftEdgeKey, refreshToken]);
  const filteredNodes =
    viewScope === "committed"
      ? activeNodes.filter((node) => normalizeStatus(node) === "committed")
      : activeNodes;

  const nodeById = useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes]
  );

  const decisionNodes = filteredNodes.filter((node) => node.type === "Decision");
  const requirementNodes = filteredNodes.filter((node) => node.type === "Requirement");
  const proposedRequirementNodes = requirementNodes.filter((node) => {
    const stage = typeof node.stage === "string" ? node.stage.toLowerCase() : "";
    return stage === "proposed" && node.archived !== true;
  });
  const committedRequirementNodes = committedNodes.filter((node) => {
    const stage = typeof node.stage === "string" ? node.stage.toLowerCase() : "";
    return node.type === "Requirement" && stage === "committed" && node.archived !== true;
  });
  const latestBaseline = useMemo(() => {
    const snapshots = loadStoredArray(BASELINE_SNAPSHOT_STORAGE_KEY).filter((snapshot) => {
      const stage = typeof snapshot?.stage === "string" ? snapshot.stage.toLowerCase() : "";
      return snapshot?.type === "Baseline" && stage === "proposed" && snapshot?.archived !== true;
    });
    if (snapshots.length === 0) {
      return null;
    }
    return snapshots[snapshots.length - 1];
  }, [refreshToken]);

  const relationships = buildRelationships(filteredNodes, activeEdges);

  const relationshipsBySource = useMemo(() => {
    const grouped = new Map();

    for (const relationship of relationships) {
      if (!grouped.has(relationship.sourceId)) {
        grouped.set(relationship.sourceId, []);
      }

      grouped.get(relationship.sourceId).push(relationship);
    }

    return grouped;
  }, [relationships]);

  const filteredRelationships = relationships.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term ||
      item.sourceTitle.toLowerCase().includes(term) ||
      item.targetTitle.toLowerCase().includes(term);

    const matchesType =
      relationshipTypeFilter === "all" || item.type === relationshipTypeFilter;

    return matchesTerm && matchesType;
  });

  const relationshipsByType = useMemo(() => {
    const grouped = new Map();

    for (const relationship of filteredRelationships) {
      if (!grouped.has(relationship.type)) {
        grouped.set(relationship.type, []);
      }

      grouped.get(relationship.type).push(relationship);
    }

    return grouped;
  }, [filteredRelationships]);

  function isEditableProposedRequirement(node) {
    const stage = typeof node?.stage === "string" ? node.stage.toLowerCase() : "";
    return node?.type === "Requirement" && stage === "proposed" && node?.archived !== true;
  }

  function getRowValue(node, field) {
    if (rowEdits[node.id] && Object.prototype.hasOwnProperty.call(rowEdits[node.id], field)) {
      return rowEdits[node.id][field];
    }

    if (field === "risk") {
      return typeof node.risk === "string" && node.risk ? node.risk : "medium";
    }

    if (field === "status") {
      return typeof node.status === "string" && node.status ? node.status : "queued";
    }

    return typeof node[field] === "string" ? node[field] : "";
  }

  function updateRowEdit(nodeId, field, value) {
    setSavedNodeId("");
    setRowEdits((previous) => ({
      ...previous,
      [nodeId]: {
        ...(previous[nodeId] || {}),
        [field]: value,
      },
    }));
  }

  function isRowDirty(node) {
    const title = getRowValue(node, "title");
    const risk = getRowValue(node, "risk");
    const status = getRowValue(node, "status");
    return (
      title !== (typeof node.title === "string" ? node.title : "") ||
      risk !== (typeof node.risk === "string" && node.risk ? node.risk : "medium") ||
      status !== (typeof node.status === "string" && node.status ? node.status : "queued")
    );
  }

  function handleSaveProposedRow(node) {
    if (!isEditableProposedRequirement(node)) {
      return;
    }

    const nextTitle = getRowValue(node, "title").trim();
    const nextRisk = getRowValue(node, "risk");
    const nextStatus = getRowValue(node, "status");

    const fieldsChanged = {};
    if (nextTitle && nextTitle !== node.title) {
      fieldsChanged.title = nextTitle;
    }
    if (RISK_LEVELS.includes(nextRisk) && nextRisk !== (node.risk || "medium")) {
      fieldsChanged.risk = nextRisk;
    }
    if (EDITABLE_STATUSES.includes(nextStatus) && nextStatus !== (node.status || "queued")) {
      fieldsChanged.status = nextStatus;
    }

    if (Object.keys(fieldsChanged).length === 0) {
      return;
    }

    const draftNodes = loadStoredArray(draftNodeKey);
    const nextNodes = draftNodes.map((item) =>
      item?.id === node.id
        ? {
            ...item,
            ...fieldsChanged,
          }
        : item,
    );
    window.localStorage.setItem(draftNodeKey, JSON.stringify(nextNodes));

    appendAuditEvent("PROPOSED_NODE_EDITED", {
      nodeId: node.id,
      fieldsChanged,
    });

    setSavedNodeId(node.id);
    setRowEdits((previous) => {
      const next = { ...previous };
      delete next[node.id];
      return next;
    });
    setRefreshToken((value) => value + 1);
  }

  function handleFounderCommit() {
    if (founderCommitText !== COMMIT_CONFIRM_TEXT) {
      setCommitError("Type CONFIRMED exactly to commit proposed requirements.");
      return;
    }

    const draftNodes = loadStoredArray(draftNodeKey);
    const draftEdges = loadStoredArray(draftEdgeKey);
    const committedNodes = loadStoredArray(COMMITTED_NODE_STORAGE_KEY);
    const committedEdges = loadStoredArray(COMMITTED_EDGE_STORAGE_KEY);

    const proposedRequirements = draftNodes.filter((node) => {
      const stage = typeof node?.stage === "string" ? node.stage.toLowerCase() : "";
      return node?.type === "Requirement" && stage === "proposed" && node?.archived !== true;
    });

    if (proposedRequirements.length === 0) {
      setCommitError("No proposed requirements found to commit.");
      return;
    }

    const proposedIds = new Set(proposedRequirements.map((node) => node.id));
    let archivedProposedCount = 0;
    const nextDraftNodes = draftNodes.map((node) => {
      if (!proposedIds.has(node?.id)) {
        return node;
      }
      archivedProposedCount += 1;
      return {
        ...node,
        stage: "archived",
        archived: true,
      };
    });

    const committedNodeIds = new Set(
      committedNodes.map((node) => node?.id).filter((id) => typeof id === "string"),
    );
    const committedNodeAdds = proposedRequirements
      .filter((node) => !committedNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        stage: "committed",
        archived: false,
      }));
    const nextCommittedNodes = [...committedNodes, ...committedNodeAdds];

    const relatedEdges = draftEdges.filter(
      (edge) =>
        edge &&
        typeof edge.from === "string" &&
        typeof edge.to === "string" &&
        (proposedIds.has(edge.from) || proposedIds.has(edge.to)),
    );

    const relatedEdgeIds = new Set(
      relatedEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
    );
    let archivedEdgeCount = 0;
    const nextDraftEdges = draftEdges.map((edge) => {
      if (!relatedEdgeIds.has(edge?.id)) {
        return edge;
      }
      archivedEdgeCount += 1;
      return {
        ...edge,
        stage: "archived",
        archived: true,
      };
    });

    const committedEdgeIds = new Set(
      committedEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
    );
    const committedEdgeAdds = relatedEdges
      .filter((edge) => typeof edge?.id === "string" && !committedEdgeIds.has(edge.id))
      .map((edge) => ({
        ...edge,
        stage: "committed",
        archived: false,
      }));
    const nextCommittedEdges = [...committedEdges, ...committedEdgeAdds];

    window.localStorage.setItem(draftNodeKey, JSON.stringify(nextDraftNodes));
    window.localStorage.setItem(draftEdgeKey, JSON.stringify(nextDraftEdges));
    window.localStorage.setItem(COMMITTED_NODE_STORAGE_KEY, JSON.stringify(nextCommittedNodes));
    window.localStorage.setItem(COMMITTED_EDGE_STORAGE_KEY, JSON.stringify(nextCommittedEdges));

    const payload = {
      committedRequirementCount: committedNodeAdds.length,
      archivedProposedCount,
      committedEdgeCount: committedEdgeAdds.length,
      archivedEdgeCount,
      note: "Committed proposed requirements via exact CONFIRMED",
    };

    appendAuditEvent("FOUNDER_COMMIT_CONFIRMED", payload);
    setCommitResult(payload);
    setCommitError("");
    setFounderCommitText("");
    setRefreshToken((value) => value + 1);
  }

  function buildSnapshotFileName() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const stamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      "-",
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds()),
    ].join("");
    return `venture-os-draft-snapshot-${stamp}.json`;
  }

  function handleExportSnapshot() {
    const nodes = loadStoredArray(draftNodeKey);
    const edges = loadStoredArray(draftEdgeKey);
    const snapshot = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      nodes,
      edges,
    };

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildSnapshotFileName();
    link.click();
    URL.revokeObjectURL(url);

    appendAuditEvent("DRAFT_SNAPSHOT_EXPORTED", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
    });
    setSnapshotResult("Draft snapshot exported.");
    setSnapshotError("");
  }

  async function handleSnapshotFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setSnapshotError("");
    setSnapshotResult("");

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const fileNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : [];
      const fileEdges = Array.isArray(parsed?.edges) ? parsed.edges : [];

      const existingNodes = loadStoredArray(draftNodeKey);
      const existingEdges = loadStoredArray(draftEdgeKey);
      const existingNodeIds = new Set(
        existingNodes.map((node) => node?.id).filter((id) => typeof id === "string"),
      );
      const existingEdgeIds = new Set(
        existingEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
      );

      const addableNodes = fileNodes.filter(
        (node) => typeof node?.id === "string" && !existingNodeIds.has(node.id),
      );
      const addableEdges = fileEdges.filter(
        (edge) => typeof edge?.id === "string" && !existingEdgeIds.has(edge.id),
      );

      setSnapshotPreview({
        fileName: file.name,
        fileNodeCount: fileNodes.length,
        fileEdgeCount: fileEdges.length,
        addableNodes,
        addableEdges,
      });
    } catch {
      setSnapshotPreview(null);
      setSnapshotError("Invalid snapshot JSON.");
    }
  }

  function handleApplySnapshotImport() {
    if (!snapshotPreview) {
      return;
    }

    const existingNodes = loadStoredArray(draftNodeKey);
    const existingEdges = loadStoredArray(draftEdgeKey);
    const mergedNodes = [...existingNodes, ...snapshotPreview.addableNodes];
    const mergedEdges = [...existingEdges, ...snapshotPreview.addableEdges];

    window.localStorage.setItem(draftNodeKey, JSON.stringify(mergedNodes));
    window.localStorage.setItem(draftEdgeKey, JSON.stringify(mergedEdges));

    appendAuditEvent("DRAFT_SNAPSHOT_IMPORTED", {
      addedNodes: snapshotPreview.addableNodes.length,
      addedEdges: snapshotPreview.addableEdges.length,
      totalNodes: mergedNodes.length,
      totalEdges: mergedEdges.length,
    });

    setSnapshotResult(
      `Snapshot imported: addedNodes=${snapshotPreview.addableNodes.length}, addedEdges=${snapshotPreview.addableEdges.length}, totalNodes=${mergedNodes.length}, totalEdges=${mergedEdges.length}`,
    );
    setSnapshotError("");
    setRefreshToken((value) => value + 1);
  }

  function buildBaselinePrompt(baseline) {
    if (!baseline) {
      return "";
    }

    const expertLines = Array.isArray(baseline.experts)
      ? baseline.experts
          .map((expert) => {
            const focus = Array.isArray(expert?.focusAreas)
              ? expert.focusAreas.filter(Boolean).join(", ")
              : "";
            return `- ${expert?.title || "Expert"}${focus ? ` (focus: ${focus})` : ""}`;
          })
          .join("\n")
      : "";

    return [
      `Baseline idea: ${baseline.idea || baseline.title || "Untitled baseline"}`,
      expertLines ? `Experts:\n${expertLines}` : "Experts: none",
      `Brainstorm summary:\n${baseline.brainstormSummary || "No summary provided."}`,
      "Generate only baseline-safe requirements from this concept.",
    ].join("\n\n");
  }

  function normalizeRequirementsPreviewPayload(data) {
    const normalizeRequirementNodeType = (value) => {
      const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (normalized === "requirement") {
        return "Requirement";
      }
      if (normalized === "task") {
        return "Task";
      }
      if (normalized === "project") {
        return "Project";
      }
      if (normalized === "risk") {
        return "Risk";
      }
      return "Requirement";
    };
    const responseBundle = data?.bundle && typeof data.bundle === "object" ? data.bundle : {};
    const rawNodes = Array.isArray(data?.proposedNodes)
      ? data.proposedNodes
      : Array.isArray(responseBundle.nodes)
        ? responseBundle.nodes
        : [];
    const proposedEdges = Array.isArray(data?.proposedEdges)
      ? data.proposedEdges
      : Array.isArray(responseBundle.edges)
        ? responseBundle.edges
        : [];
    const proposedNodes = rawNodes
      .filter((node) => node && typeof node.id === "string")
      .map((node) => ({
        ...node,
        type: normalizeRequirementNodeType(node.type),
        stage: "proposed",
        status: typeof node.status === "string" && node.status ? node.status : "queued",
        archived: false,
      }));
    const titleById = new Map();
    for (const node of proposedNodes) {
      if (typeof node?.id === "string") {
        titleById.set(node.id, typeof node.title === "string" ? node.title : node.id);
      }
    }

    return {
      source: data?.source || "mock",
      fallbackReason: typeof data?.fallbackReason === "string" ? data.fallbackReason : "",
      assistantText: typeof data?.assistantText === "string" ? data.assistantText : "",
      nodes: proposedNodes,
      edges: proposedEdges,
      titleById,
    };
  }

  function mergeRequirementsDraftProposal(preview) {
    const draftNodes = loadStoredArray(draftNodeKey);
    const draftEdges = loadStoredArray(draftEdgeKey);
    const nodeIds = new Set(draftNodes.map((node) => node?.id).filter((id) => typeof id === "string"));
    const edgeIds = new Set(draftEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"));

    let addedNodes = 0;
    let addedEdges = 0;
    const nextNodes = [...draftNodes];
    const nextEdges = [...draftEdges];

    for (const node of preview.nodes) {
      if (!node?.id || nodeIds.has(node.id)) {
        continue;
      }
      nodeIds.add(node.id);
      nextNodes.push(node);
      addedNodes += 1;
    }

    for (const edge of preview.edges) {
      if (!edge?.id || edgeIds.has(edge.id)) {
        continue;
      }
      edgeIds.add(edge.id);
      nextEdges.push(edge);
      addedEdges += 1;
    }

    window.localStorage.setItem(draftNodeKey, JSON.stringify(nextNodes));
    window.localStorage.setItem(draftEdgeKey, JSON.stringify(nextEdges));

    return {
      addedNodes,
      addedEdges,
      totalNodes: nextNodes.length,
      totalEdges: nextEdges.length,
    };
  }

  function buildRequirementsChatPrompt(prompt) {
    const trimmed = typeof prompt === "string" ? prompt.trim() : "";
    const baselineSummary = latestBaseline?.brainstormSummary || "No baseline summary available.";
    const experts = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY);
    const expertLines = experts
      .map((expert) => {
        const focus = Array.isArray(expert?.focusAreas)
          ? expert.focusAreas.filter(Boolean).join(", ")
          : "";
        return `- ${expert?.title || "Expert"}${focus ? ` (focus: ${focus})` : ""}`;
      })
      .join("\n");

    return [
      `Founder prompt: ${trimmed || "Create requirements"}`,
      `Baseline summary:\n${baselineSummary}`,
      expertLines ? `Recruited experts:\n${expertLines}` : "Recruited experts: none",
      "Generate 5-10 requirement-first proposed nodes and helpful supporting tasks/projects.",
      "Keep outputs proposed-only and include edges.",
    ].join("\n\n");
  }

  async function handleSendRequirementsAi() {
    const prompt = requirementsChatInput.trim();
    if (!prompt) {
      setRequirementsAiError("Enter a requirement prompt before sending.");
      return;
    }

    setRequirementsAiLoading(true);
    setRequirementsAiError("");
    setRequirementsAiApplyResult("");
    setRequirementsChatMessages((previous) => [
      ...previous,
      { id: `req-chat:founder:${Date.now()}`, role: "founder", text: prompt },
    ]);
    setRequirementsChatInput("");

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildRequirementsChatPrompt(prompt),
          mode: "requirements",
          scope: "requirements",
          context: {
            baselineId: latestBaseline?.id || "",
            draftedRequirementCount: proposedRequirementNodes.length,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      const preview = normalizeRequirementsPreviewPayload(data);
      if (!response.ok || !data?.ok || (!preview.nodes.length && !preview.edges.length)) {
        throw new Error(data?.error || "Failed to generate requirements AI draft.");
      }
      const headerMode = response.headers.get("X-AI-Mode");
      preview.source = headerMode === "ai" ? "ai" : preview.source;
      setRequirementsAiPreview(preview);
      setRequirementsChatMessages((previous) => [
        ...previous,
        {
          id: `req-chat:assistant:${Date.now()}`,
          role: "assistant",
          text: preview.assistantText || "Draft prepared. Review and apply to the requirements graph.",
        },
      ]);

      appendAuditEvent("ai_generate", {
        scope: "requirements",
        source: preview.source,
        fallbackReason: preview.fallbackReason,
        nodeCount: preview.nodes.length,
        edgeCount: preview.edges.length,
        prompt,
      });
    } catch (error) {
      setRequirementsAiPreview(null);
      setRequirementsAiError(
        error instanceof Error ? error.message : "Failed to generate requirements AI draft.",
      );
    } finally {
      setRequirementsAiLoading(false);
    }
  }

  function handleApplyRequirementsAi() {
    if (!requirementsAiPreview) {
      setRequirementsAiError("Generate a requirements AI draft first.");
      return;
    }

    const merged = mergeRequirementsDraftProposal(requirementsAiPreview);
    setRequirementsAiApplyResult(
      `Applied requirements AI draft: addedNodes=${merged.addedNodes}, addedEdges=${merged.addedEdges}, totalNodes=${merged.totalNodes}, totalEdges=${merged.totalEdges}`,
    );
    setRequirementsAiError("");
    setRefreshToken((value) => value + 1);

    appendAuditEvent("ai_apply", {
      scope: "requirements",
      source: requirementsAiPreview.source || "mock",
      fallbackReason: requirementsAiPreview.fallbackReason || "",
      addedNodes: merged.addedNodes,
      addedEdges: merged.addedEdges,
      totalNodes: merged.totalNodes,
      totalEdges: merged.totalEdges,
    });
  }

  async function handleGenerateFromBaseline() {
    if (!latestBaseline) {
      setBaselineError("Create a baseline first in Brainstorm.");
      return;
    }

    setBaselineError("");
    setBaselineApplyResult("");
    setBaselineLoading(true);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildBaselinePrompt(latestBaseline),
          mode: "requirements",
          level: "baseline",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.bundle) {
        throw new Error(data?.error || "Failed to generate requirements from baseline.");
      }
      const headerMode = response.headers.get("X-AI-Mode");
      const source = headerMode === "ai" ? "ai" : (data.source || "mock");
      const fallbackReason = typeof data?.fallbackReason === "string" ? data.fallbackReason : "";

      const nodes = Array.isArray(data.bundle.nodes) ? data.bundle.nodes : [];
      const edges = Array.isArray(data.bundle.edges) ? data.bundle.edges : [];
      setBaselinePreview({
        baselineId: latestBaseline.id,
        source,
        fallbackReason,
        nodes,
        edges,
      });

      appendAuditEvent("REQUIREMENTS_GENERATED_FROM_BASELINE", {
        baselineId: latestBaseline.id,
        source,
        fallbackReason,
        nodeCount: nodes.length,
        edgeCount: edges.length,
      });
    } catch (error) {
      setBaselinePreview(null);
      setBaselineError(
        error instanceof Error
          ? error.message
          : "Failed to generate requirements from baseline.",
      );
    } finally {
      setBaselineLoading(false);
    }
  }

  function handleApplyBaselineRequirements() {
    if (!baselinePreview) {
      return;
    }

    const draftNodes = loadStoredArray(draftNodeKey);
    const draftEdges = loadStoredArray(draftEdgeKey);
    const nodeIds = new Set(draftNodes.map((node) => node?.id).filter((id) => typeof id === "string"));
    const edgeIds = new Set(draftEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"));

    let addedNodes = 0;
    let addedEdges = 0;
    const nextNodes = [...draftNodes];
    const nextEdges = [...draftEdges];

    for (const node of baselinePreview.nodes) {
      if (!node?.id || nodeIds.has(node.id)) {
        continue;
      }
      nodeIds.add(node.id);
      nextNodes.push(node);
      addedNodes += 1;
    }

    for (const edge of baselinePreview.edges) {
      if (!edge?.id || edgeIds.has(edge.id)) {
        continue;
      }
      edgeIds.add(edge.id);
      nextEdges.push(edge);
      addedEdges += 1;
    }

    window.localStorage.setItem(draftNodeKey, JSON.stringify(nextNodes));
    window.localStorage.setItem(draftEdgeKey, JSON.stringify(nextEdges));

    appendAuditEvent("REQUIREMENTS_APPLIED_FROM_BASELINE", {
      baselineId: baselinePreview.baselineId,
      addedNodes,
      addedEdges,
      totalNodes: nextNodes.length,
      totalEdges: nextEdges.length,
    });

    setBaselineApplyResult(
      `Baseline requirements applied: addedNodes=${addedNodes}, addedEdges=${addedEdges}, totalNodes=${nextNodes.length}, totalEdges=${nextEdges.length}`,
    );
    setRefreshToken((value) => value + 1);
  }

  function getChildProposalRowState(nodeId) {
    return childProposalState[nodeId] || {};
  }

  function updateChildProposalRowState(nodeId, patch) {
    setChildProposalState((previous) => ({
      ...previous,
      [nodeId]: {
        ...(previous[nodeId] || {}),
        ...patch,
      },
    }));
  }

  function buildChildProposalPrompt(node) {
    const recruitedExperts = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY);
    const expertLines = recruitedExperts
      .map((expert) => {
        const focus = Array.isArray(expert?.focusAreas)
          ? expert.focusAreas.filter(Boolean).join(", ")
          : "";
        return `- ${expert?.title || "Expert"}${focus ? ` (focus: ${focus})` : ""}`;
      })
      .join("\n");

    const baselineSummary = latestBaseline?.brainstormSummary || "No baseline summary available.";
    const parentTitle = typeof node?.title === "string" ? node.title : "Untitled requirement";
    const parentRisk = typeof node?.risk === "string" && node.risk ? node.risk : "medium";
    const parentStatus =
      typeof node?.status === "string" && node.status ? node.status : "queued";
    const parentOwner = typeof node?.owner === "string" && node.owner ? node.owner : "founder";
    const parentVersion = node?.version ?? 1;

    return [
      "Requirement-driven child proposal drafting task.",
      `Parent requirement id: ${node.id}`,
      `Parent requirement title: ${parentTitle}`,
      `Parent requirement risk: ${parentRisk}`,
      `Parent requirement status: ${parentStatus}`,
      `Parent requirement owner: ${parentOwner}`,
      `Parent requirement version: ${parentVersion}`,
      `Baseline summary:\n${baselineSummary}`,
      expertLines ? `Recruited experts:\n${expertLines}` : "Recruited experts: none",
      "Generate 3-6 child proposals that satisfy this requirement.",
      "Use node types Project and Task only. Keep all outputs proposed-only.",
      "Include edges linking child proposals to the parent requirement.",
    ].join("\n\n");
  }

  function normalizeChildProposalBundle(bundle, parentNode, nonce) {
    const parentId = parentNode.id;
    const rawNodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
    const rawEdges = Array.isArray(bundle?.edges) ? bundle.edges : [];
    const parentTitle =
      typeof parentNode?.title === "string" ? parentNode.title : "Parent Requirement";

    const nodes = rawNodes
      .filter((node) => node && typeof node.id === "string" && node.id !== parentId)
      .slice(0, 6)
      .map((node, index) => {
        const nextType =
          node.type === "Project" || node.type === "Task"
            ? node.type
            : index === 0
              ? "Project"
              : "Task";
        return {
          ...node,
          type: nextType,
          stage: "proposed",
          status:
            typeof node.status === "string" && node.status ? node.status : "queued",
          archived: false,
          parentId,
        };
      });

    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = rawEdges
      .filter(
        (edge) =>
          edge &&
          typeof edge.id === "string" &&
          typeof edge.from === "string" &&
          typeof edge.to === "string" &&
          (nodeIds.has(edge.from) || edge.from === parentId) &&
          (nodeIds.has(edge.to) || edge.to === parentId),
      )
      .map((edge) => ({
        ...edge,
        relationshipType:
          typeof edge.relationshipType === "string" && edge.relationshipType
            ? edge.relationshipType
            : "relates_to",
        stage: "proposed",
        archived: false,
      }));

    const parentLinked = new Set(
      edges
        .filter((edge) => edge.from && edge.to)
        .map((edge) => `${edge.from}->${edge.to}`),
    );

    for (const node of nodes) {
      const key = `${node.id}->${parentId}`;
      if (parentLinked.has(key)) {
        continue;
      }
      edges.push({
        id: `edge:child-parent:${nonce}:${parentId}:${node.id}`,
        from: node.id,
        to: parentId,
        relationshipType: "relates_to",
        stage: "proposed",
        createdAt: new Date().toISOString(),
        createdBy: "ai",
        archived: false,
      });
    }

    const titleById = new Map([[parentId, parentTitle]]);
    for (const node of nodes) {
      titleById.set(node.id, node.title || node.id);
    }

    return { nodes, edges, titleById };
  }

  async function handleGenerateChildProposals(node) {
    if (!isEditableProposedRequirement(node)) {
      return;
    }

    const nonce = `${Date.now()}`;
    updateChildProposalRowState(node.id, {
      loading: true,
      error: "",
      result: "",
    });

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildChildProposalPrompt(node),
          mode: "business",
          level: "detailed",
          nonce,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.bundle) {
        throw new Error(data?.error || "Failed to generate child proposals.");
      }
      const headerMode = response.headers.get("X-AI-Mode");
      const source = headerMode === "ai" ? "ai" : (data.source || "mock");
      const fallbackReason = typeof data?.fallbackReason === "string" ? data.fallbackReason : "";

      const normalized = normalizeChildProposalBundle(data.bundle, node, nonce);
      updateChildProposalRowState(node.id, {
        loading: false,
        error: "",
        preview: {
          source,
          fallbackReason,
          nonce,
          nodes: normalized.nodes,
          edges: normalized.edges,
          titleById: normalized.titleById,
        },
      });

      appendAuditEvent("CHILD_PROPOSALS_GENERATED", {
        parentRequirementId: node.id,
        parentTitle: node.title,
        source,
        fallbackReason,
        nodeCount: normalized.nodes.length,
        edgeCount: normalized.edges.length,
      });
    } catch (error) {
      updateChildProposalRowState(node.id, {
        loading: false,
        preview: null,
        error:
          error instanceof Error ? error.message : "Failed to generate child proposals.",
      });
    }
  }

  function handleApplyChildProposals(node) {
    const rowState = getChildProposalRowState(node.id);
    const preview = rowState.preview;
    if (!preview) {
      return;
    }

    const draftNodes = loadStoredArray(draftNodeKey);
    const draftEdges = loadStoredArray(draftEdgeKey);
    const nodeIds = new Set(
      draftNodes.map((item) => item?.id).filter((id) => typeof id === "string"),
    );
    const edgeIds = new Set(
      draftEdges.map((item) => item?.id).filter((id) => typeof id === "string"),
    );

    let addedNodes = 0;
    let addedEdges = 0;
    const nextNodes = [...draftNodes];
    const nextEdges = [...draftEdges];

    for (const child of preview.nodes) {
      if (!child?.id || nodeIds.has(child.id)) {
        continue;
      }
      nodeIds.add(child.id);
      nextNodes.push(child);
      addedNodes += 1;
    }

    const edgeCandidates = [...preview.edges];
    const parentLinked = new Set(
      edgeCandidates
        .filter((edge) => typeof edge?.from === "string" && typeof edge?.to === "string")
        .map((edge) => `${edge.from}->${edge.to}`),
    );
    for (const child of preview.nodes) {
      const parentLinkKey = `${child.id}->${node.id}`;
      if (parentLinked.has(parentLinkKey)) {
        continue;
      }
      edgeCandidates.push({
        id: `edge:child-parent:apply:${preview.nonce}:${node.id}:${child.id}`,
        from: child.id,
        to: node.id,
        relationshipType: "relates_to",
        stage: "proposed",
        createdAt: new Date().toISOString(),
        createdBy: "ai",
        archived: false,
      });
      parentLinked.add(parentLinkKey);
    }

    for (const edge of edgeCandidates) {
      if (!edge?.id || edgeIds.has(edge.id)) {
        continue;
      }
      edgeIds.add(edge.id);
      nextEdges.push(edge);
      addedEdges += 1;
    }

    window.localStorage.setItem(draftNodeKey, JSON.stringify(nextNodes));
    window.localStorage.setItem(draftEdgeKey, JSON.stringify(nextEdges));

    appendAuditEvent("CHILD_PROPOSALS_APPLIED", {
      parentRequirementId: node.id,
      addedNodes,
      addedEdges,
      totalNodes: nextNodes.length,
      totalEdges: nextEdges.length,
    });

    updateChildProposalRowState(node.id, {
      result: `Applied proposals: addedNodes=${addedNodes}, addedEdges=${addedEdges}, totalNodes=${nextNodes.length}, totalEdges=${nextEdges.length}`,
    });
    setRefreshToken((value) => value + 1);
  }

  function renderTree(nodes) {
    if (nodes.length === 0) {
      return (
        <EmptyState
          title={`No ${mode} nodes available.`}
          message={`Load demo data or add nodes to populate this ${viewScope} view.`}
        />
      );
    }

    const relationshipTotal = nodes.reduce((count, node) => {
      const related = relationshipsBySource.get(node.id) || [];
      return count + related.length;
    }, 0);

    return (
      <section>
        <p>
          Nodes: {nodes.length} | Relationships: {relationshipTotal}
        </p>
        <ul>
          {nodes.map((node) => {
            const related = relationshipsBySource.get(node.id) || [];
            const relatedByType = related.reduce((grouped, item) => {
              if (!grouped.has(item.type)) {
                grouped.set(item.type, []);
              }
              grouped.get(item.type).push(item);
              return grouped;
            }, new Map());

            return (
              <li key={node.id}>
                <strong>{node.title}</strong>
                {related.length === 0 ? (
                  <p>No related items</p>
                ) : (
                  <ul>
                    {[...relatedByType.entries()].map(([type, typedItems]) => (
                      <li key={`${node.id}-${type}`}>
                        <strong>{type}</strong> ({typedItems.length})
                        <ul>
                          {typedItems.map((item, index) => {
                            const targetNode = nodeById.get(item.targetId);
                            if (!targetNode) {
                              return null;
                            }

                            return (
                              <li key={`${node.id}-${item.targetId}-${item.type}-${index}`}>
                                {targetNode.title} ({targetNode.type})
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (mode === "decisions") {
    return renderTree(decisionNodes);
  }

  if (mode === "requirements") {
    const showingProposed = requirementsScope === "proposed";
    const visibleRequirementNodes = showingProposed
      ? proposedRequirementNodes
      : committedRequirementNodes;

    return (
      <section>
        <div>
          <h3>Requirements AI Chat (Proposed-only)</h3>
          <div>
            {requirementsChatMessages.map((entry) => (
              <p key={entry.id}>
                <strong>{entry.role === "founder" ? "Founder" : "AI"}:</strong> {entry.text}
              </p>
            ))}
            {requirementsAiLoading ? <p>AI is drafting requirements...</p> : null}
          </div>
          <p>
            <input
              value={requirementsChatInput}
              onChange={(event) => setRequirementsChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSendRequirementsAi();
                }
              }}
              placeholder="Create 5 requirements for X"
            />{" "}
            <button
              type="button"
              onClick={() => void handleSendRequirementsAi()}
              disabled={requirementsAiLoading || !requirementsChatInput.trim()}
            >
              Send
            </button>{" "}
            <button
              type="button"
              onClick={handleApplyRequirementsAi}
              disabled={!requirementsAiPreview}
            >
              Apply
            </button>
          </p>
          {requirementsAiError ? <p>{requirementsAiError}</p> : null}
          {requirementsAiApplyResult ? <p>{requirementsAiApplyResult}</p> : null}
          {requirementsAiPreview ? (
            <div>
              {renderAiModeBadge(requirementsAiPreview.source, requirementsAiPreview.fallbackReason)}
              <p>
                source={requirementsAiPreview.source}, nodes={requirementsAiPreview.nodes.length},
                edges={requirementsAiPreview.edges.length}
              </p>
              <ul>
                {requirementsAiPreview.nodes.map((node) => (
                  <li key={node.id}>
                    {renderLifecycleBadge(node.stage || "proposed")} [{node.type}] {node.title}
                  </li>
                ))}
              </ul>
              <ul>
                {requirementsAiPreview.edges.map((edge) => {
                  const fromLabel = requirementsAiPreview.titleById.get(edge.from) || edge.from;
                  const toLabel = requirementsAiPreview.titleById.get(edge.to) || edge.to;
                  return (
                    <li key={edge.id}>
                      {edge.relationshipType}: {fromLabel} -&gt; {toLabel}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div>
          <h3>Latest Baseline Concept</h3>
          {latestBaseline ? (
            <div>
              <p>
                {latestBaseline.title || "Baseline"} | createdAt={latestBaseline.createdAt || "-"}
              </p>
              <p>
                experts=
                {Array.isArray(latestBaseline.experts) ? latestBaseline.experts.length : 0}
              </p>
              <pre>{latestBaseline.brainstormSummary || "No baseline summary."}</pre>
            </div>
          ) : (
            <p>No baseline found. Close Brainstorm to create a baseline first.</p>
          )}
          <button
            type="button"
            onClick={handleGenerateFromBaseline}
            disabled={!latestBaseline || baselineLoading}
          >
            {baselineLoading
              ? "Generating from Baseline..."
              : "Generate Basic Requirements from Baseline"}
          </button>
          {baselinePreview ? (
            <div>
              {renderAiModeBadge(baselinePreview.source, baselinePreview.fallbackReason)}
              <p>
                source={baselinePreview.source}, nodes={baselinePreview.nodes.length}, edges=
                {baselinePreview.edges.length}
              </p>
              <button type="button" onClick={handleApplyBaselineRequirements}>
                Apply Baseline Requirements to Draft
              </button>
            </div>
          ) : null}
          {baselineError ? <p>{baselineError}</p> : null}
          {baselineApplyResult ? <p>{baselineApplyResult}</p> : null}
        </div>
        <p>
          Proposed requirements: {proposedRequirementNodes.length} | Committed requirements:{" "}
          {committedRequirementNodes.length}
        </p>
        <div>
          <button
            type="button"
            onClick={() => setRequirementsScope("proposed")}
            disabled={showingProposed}
          >
            Proposed
          </button>{" "}
          <button
            type="button"
            onClick={() => setRequirementsScope("committed")}
            disabled={!showingProposed}
          >
            Committed
          </button>
        </div>
        {visibleRequirementNodes.length === 0 ? (
          <EmptyState
            title={`No ${showingProposed ? "proposed" : "committed"} requirements found.`}
            message={
              showingProposed
                ? "Ask AI to generate requirements."
                : "Commit proposed requirements to populate the committed list."
            }
          />
        ) : showingProposed ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Version</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequirementNodes.map((node) => {
                const editable = isEditableProposedRequirement(node);
                const rowState = getChildProposalRowState(node.id);
                const preview = rowState.preview;
                return (
                  <Fragment key={node.id}>
                    <tr>
                      <td>
                        {renderLifecycleBadge(node.stage || "proposed")}{" "}
                        <input
                          value={getRowValue(node, "title")}
                          disabled={!editable}
                          onChange={(event) => updateRowEdit(node.id, "title", event.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          value={getRowValue(node, "risk")}
                          disabled={!editable}
                          onChange={(event) => updateRowEdit(node.id, "risk", event.target.value)}
                        >
                          {RISK_LEVELS.map((risk) => (
                            <option key={risk} value={risk}>
                              {risk}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={getRowValue(node, "status")}
                          disabled={!editable}
                          onChange={(event) => updateRowEdit(node.id, "status", event.target.value)}
                        >
                          {EDITABLE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{node.version ?? "-"}</td>
                      <td>{node.owner || "-"}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleSaveProposedRow(node)}
                          disabled={!editable || !isRowDirty(node)}
                        >
                          Save
                        </button>{" "}
                        <button
                          type="button"
                          onClick={() => handleGenerateChildProposals(node)}
                          disabled={!editable || rowState.loading}
                        >
                          {rowState.loading ? "Generating..." : "Propose Projects"}
                        </button>
                        {savedNodeId === node.id ? <span> Saved</span> : null}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6}>
                        {rowState.error ? <p>{rowState.error}</p> : null}
                        {preview ? (
                          <div>
                            {renderAiModeBadge(preview.source, preview.fallbackReason)}
                            <p>
                              source={preview.source}, nodeCount={preview.nodes.length}, edgeCount=
                              {preview.edges.length}
                            </p>
                            <ul>
                              {preview.nodes.map((child) => (
                                <li key={child.id}>
                                  {renderLifecycleBadge(child.stage || "proposed")} [{child.type}] {child.title}
                                </li>
                              ))}
                            </ul>
                            <ul>
                              {preview.edges.map((edge) => {
                                const fromLabel = preview.titleById.get(edge.from) || edge.from;
                                const toLabel = preview.titleById.get(edge.to) || edge.to;
                                return (
                                  <li key={edge.id}>
                                    {edge.relationshipType}: {fromLabel} -&gt; {toLabel}
                                  </li>
                                );
                              })}
                            </ul>
                            <button
                              type="button"
                              onClick={() => handleApplyChildProposals(node)}
                              disabled={!preview}
                            >
                              Apply Proposals
                            </button>
                          </div>
                        ) : null}
                        {rowState.result ? <p>{rowState.result}</p> : null}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Version</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {visibleRequirementNodes.map((node) => (
                <tr key={node.id}>
                  <td>
                    {renderLifecycleBadge(node.stage || "committed")} {node.title}
                  </td>
                  <td>{node.risk || "medium"}</td>
                  <td>{node.status || "queued"}</td>
                  <td>{node.version ?? "-"}</td>
                  <td>{node.owner || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div>
          <h3>Draft Snapshot</h3>
          <button type="button" onClick={handleExportSnapshot}>
            Export Draft Snapshot
          </button>
          <p>
            <label htmlFor="draft-snapshot-import">Import Snapshot</label>
            <br />
            <input
              id="draft-snapshot-import"
              type="file"
              accept=".json,application/json"
              onChange={handleSnapshotFileChange}
            />
          </p>
          {snapshotPreview ? (
            <div>
              <p>
                Preview ({snapshotPreview.fileName}): nodes={snapshotPreview.fileNodeCount},
                edges={snapshotPreview.fileEdgeCount}, addableNodes={snapshotPreview.addableNodes.length},
                addableEdges={snapshotPreview.addableEdges.length}
              </p>
              <button type="button" onClick={handleApplySnapshotImport}>
                Apply Import
              </button>
            </div>
          ) : null}
          {snapshotError ? <p>{snapshotError}</p> : null}
          {snapshotResult ? <p>{snapshotResult}</p> : null}
        </div>
        <div>
          <h3>Stability</h3>
          <p>Placeholder — freeze enforcement not enabled yet.</p>
          <p>Stability: 100 (placeholder)</p>
        </div>
        <div>
          <h3>Founder Commit</h3>
          <p>Only Founder commits. This moves proposed -&gt; committed.</p>
          <label htmlFor="founder-confirmed-input">
            Type CONFIRMED to commit proposed requirements
          </label>
          <br />
          <input
            id="founder-confirmed-input"
            value={founderCommitText}
            onChange={(event) => {
              setFounderCommitText(event.target.value);
              setCommitError("");
            }}
          />{" "}
          <button
            type="button"
            onClick={handleFounderCommit}
            disabled={founderCommitText !== COMMIT_CONFIRM_TEXT}
          >
            Commit
          </button>
          {commitError ? <p>{commitError}</p> : null}
          {commitResult ? (
            <p>
              Commit success: committedRequirements={commitResult.committedRequirementCount},
              archivedProposed={commitResult.archivedProposedCount}, committedEdges=
              {commitResult.committedEdgeCount}, archivedEdges={commitResult.archivedEdgeCount}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section>
      <p>
        Nodes: {filteredNodes.length} | Relationships: {relationships.length}
      </p>
      <SearchBox
        id="business-search"
        label="Filter by node"
        value={search}
        onChange={setSearch}
      />
      <br />
      <SelectFilter
        id="relationship-type-filter"
        label="Filter by relationship type"
        value={relationshipTypeFilter}
        onChange={setRelationshipTypeFilter}
        options={[
          { value: "all", label: "all" },
          { value: "depends_on", label: "depends_on" },
          { value: "enables", label: "enables" },
          { value: "relates_to", label: "relates_to" },
        ]}
      />

      {filteredRelationships.length === 0 ? (
        <EmptyState
          title="No relationships found."
          message={`No ${viewScope} relationships match this filter. Add relationships in Nodes or switch view mode.`}
        />
      ) : (
        <section>
          {[...relationshipsByType.entries()].map(([type, items]) => (
            <div key={type}>
              <h3>
                {type} ({items.length})
              </h3>
              <ul>
                {items.map((item, index) => (
                  <li key={`${item.sourceId}-${item.targetId}-${item.type}-${index}`}>
                    {item.sourceTitle} ({item.sourceType}) {"\u2014"}({item.type}){"\u2192"}{" "}
                    {item.targetTitle} ({item.targetType})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}

