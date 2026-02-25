"use client";

import { useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const APP_VERSION = "local-draft-v1";
const CURRENT_BUNDLE_SCHEMA_VERSION = "2";
const AUDIT_ACTOR = "founder";
const ALLOWED_TYPES = ["Decision", "Requirement", "Other"];
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];
const STAGE_TYPES = ["proposed", "committed", "archived"];
const WORK_STATUS_TYPES = ["queued", "in_progress", "review", "complete"];
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

function createEdgeId() {
  return `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  if (STAGE_TYPES.includes(rawNode.stage)) {
    return rawNode.stage;
  }

  if (STAGE_TYPES.includes(rawNode.status)) {
    return rawNode.status;
  }

  if (rawNode.archived) {
    return "archived";
  }

  return "proposed";
}

function normalizeWorkflowStatus(rawNode) {
  if (WORK_STATUS_TYPES.includes(rawNode.status)) {
    return rawNode.status;
  }

  if (WORK_STATUS_TYPES.includes(rawNode.workflowStatus)) {
    return rawNode.workflowStatus;
  }

  return "queued";
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
  const status = normalizeWorkflowStatus(rawNode);
  const version =
    Number.isFinite(rawNode.version) && rawNode.version > 0
      ? Math.floor(rawNode.version)
      : 1;
  const createdBy =
    typeof rawNode.createdBy === "string" && rawNode.createdBy.trim()
      ? rawNode.createdBy
      : AUDIT_ACTOR;

  return {
    id,
    title,
    type,
    createdAt,
    stage,
    status,
    version,
    createdBy,
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

function normalizeEdge(rawEdge, nodeById) {
  if (!rawEdge || typeof rawEdge !== "object") {
    return null;
  }

  const from = typeof rawEdge.from === "string" ? rawEdge.from : rawEdge.sourceId;
  const to = typeof rawEdge.to === "string" ? rawEdge.to : rawEdge.targetId;
  const relationshipType =
    typeof rawEdge.relationshipType === "string" ? rawEdge.relationshipType : rawEdge.type;

  if (typeof from !== "string" || !from || typeof to !== "string" || !to) {
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
        ? rawEdge.id
        : createEdgeId(),
    from,
    to,
    relationshipType,
    stage: STAGE_TYPES.includes(rawEdge.stage) ? rawEdge.stage : "proposed",
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

function createEdgeFromRelationship(sourceNode, relationship) {
  return {
    id: createEdgeId(),
    from: sourceNode.id,
    to: relationship.targetId,
    relationshipType: relationship.type,
    stage: sourceNode.stage === "committed" ? "committed" : "proposed",
    version: 1,
    createdAt: Date.now(),
    createdBy: sourceNode.createdBy || AUDIT_ACTOR,
  };
}

function buildEdgesFromNodes(nodes) {
  return nodes.flatMap((node) => {
    const relationships = Array.isArray(node.relationships) ? node.relationships : [];
    return relationships
      .filter((rel) => rel && typeof rel.targetId === "string")
      .map((relationship) => createEdgeFromRelationship(node, relationship));
  });
}

function applyEdgesToNodes(nodes, edges) {
  const relationshipMap = new Map();

  for (const edge of edges) {
    if (edge.stage === "archived") {
      continue;
    }

    if (!relationshipMap.has(edge.from)) {
      relationshipMap.set(edge.from, []);
    }

    relationshipMap.get(edge.from).push({
      targetId: edge.to,
      type: edge.relationshipType,
    });
  }

  return nodes.map((node) => ({
    ...node,
    relationships: relationshipMap.get(node.id) || [],
  }));
}

function loadDraftEdges(nodes) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(EDGE_STORAGE_KEY);
    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    if (!raw) {
      const migrated = buildEdgesFromNodes(nodes);
      window.localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const migrated = buildEdgesFromNodes(nodes);
      window.localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return parsed
      .map((edge) => normalizeEdge(edge, nodeById))
      .filter((edge) => edge !== null);
  } catch {
    return buildEdgesFromNodes(nodes);
  }
}

function validateBundle(bundle) {
  if (!bundle || typeof bundle !== "object") {
    return "Bundle must be a JSON object. Paste the full exported JSON bundle.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "metadata")) {
    return "Missing field: metadata. Use an exported Venture OS bundle.";
  }

  if (!bundle.metadata || typeof bundle.metadata !== "object") {
    return "Invalid field: metadata must be an object.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "schemaVersion")) {
    return "Missing field: metadata.schemaVersion.";
  }

  if (
    bundle.metadata.schemaVersion !== "1" &&
    bundle.metadata.schemaVersion !== "2"
  ) {
    return `Unsupported bundle version: ${bundle.metadata.schemaVersion}. Supported: 1, 2.`;
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "exportedAt")) {
    return "Missing field: metadata.exportedAt.";
  }

  if (typeof bundle.metadata.exportedAt !== "string") {
    return "Invalid field: metadata.exportedAt must be an ISO date string.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle.metadata, "appVersion")) {
    return "Missing field: metadata.appVersion.";
  }

  if (typeof bundle.metadata.appVersion !== "string") {
    return "Invalid field: metadata.appVersion must be a string.";
  }

  if (
    bundle.metadata.upgradeNotes !== undefined &&
    typeof bundle.metadata.upgradeNotes !== "string"
  ) {
    return "Invalid field: metadata.upgradeNotes must be a string when present.";
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "nodes")) {
    return "Missing field: nodes.";
  }

  const nodeValidationError = validateImportPayload(bundle.nodes);
  if (nodeValidationError) {
    return `nodes: ${nodeValidationError}`;
  }

  const schemaVersion = bundle.metadata.schemaVersion;
  const hasLegacyRelationships = Object.prototype.hasOwnProperty.call(
    bundle,
    "relationships"
  );
  const hasEdges = Object.prototype.hasOwnProperty.call(bundle, "edges");

  if (schemaVersion === "2" && !hasEdges) {
    return "Missing field: edges. Version 2 bundles require canonical edges.";
  }

  if (schemaVersion === "1" && !hasLegacyRelationships && !hasEdges) {
    return "Missing field: relationships or edges. Version 1 import requires one of them.";
  }

  if (hasLegacyRelationships) {
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
  }

  if (hasEdges) {
    if (!Array.isArray(bundle.edges)) {
      return "Invalid field: edges must be an array.";
    }

    const invalidEdge = bundle.edges.some(
      (edge) =>
        !edge ||
        typeof edge !== "object" ||
        typeof edge.from !== "string" ||
        typeof edge.to !== "string" ||
        !RELATIONSHIP_TYPES.includes(edge.relationshipType)
    );

    if (invalidEdge) {
      return "Each edge must include from, to, and a valid relationshipType.";
    }
  }

  if (!Object.prototype.hasOwnProperty.call(bundle, "auditEvents")) {
    return "Missing field: auditEvents.";
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

function buildCanonicalEdgesForImport(bundle, nodesById) {
  const schemaVersion = bundle.metadata.schemaVersion;
  const rawEdges =
    schemaVersion === "2"
      ? bundle.edges
      : Array.isArray(bundle.edges)
        ? bundle.edges
        : Array.isArray(bundle.relationships)
          ? bundle.relationships.map((rel) => ({
              from: rel.sourceId,
              to: rel.targetId,
              relationshipType: rel.type,
            }))
          : [];

  return rawEdges
    .map((edge) => normalizeEdge(edge, nodesById))
    .filter((edge) => edge !== null);
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
      item.status !== undefined &&
      !STAGE_TYPES.includes(item.status) &&
      !WORK_STATUS_TYPES.includes(item.status)
    ) {
      return "status must be lifecycle (legacy) or queued/in_progress/review/complete.";
    }

    if (item.stage !== undefined && !STAGE_TYPES.includes(item.stage)) {
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

    if (node.type === "Requirement" && nodeStage === "committed") {
      const decisionLinks = node.relationships.filter((relationship) => {
        const target = nodeById.get(relationship.targetId);
        return target?.type === "Decision";
      });

      if (decisionLinks.length !== 1) {
        return "Committed Requirement nodes must link to exactly one Decision.";
      }
    }
  }

  return null;
}

function getCommittedEdges(edges, nodeById) {
  return edges.filter((edge) => {
    if (!edge || edge.stage !== "committed") {
      return false;
    }

    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    return (
      fromNode &&
      toNode &&
      normalizeStatus(fromNode) === "committed" &&
      normalizeStatus(toNode) === "committed"
    );
  });
}

function validateCommittedGraphIntegrity(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const committedNodes = nodes.filter((node) => normalizeStatus(node) === "committed");
  const committedEdges = getCommittedEdges(edges, nodeById);

  const connectedCommittedNodeIds = new Set();
  for (const edge of committedEdges) {
    connectedCommittedNodeIds.add(edge.from);
    connectedCommittedNodeIds.add(edge.to);
  }

  const orphanCommittedNodes = committedNodes.filter(
    (node) => !connectedCommittedNodeIds.has(node.id)
  );
  if (committedNodes.length > 1 && orphanCommittedNodes.length > 0) {
    const orphanTitles = orphanCommittedNodes.map((node) => node.title).join(", ");
    return `Committed nodes cannot be orphaned. Missing committed edge connection: ${orphanTitles}.`;
  }

  for (const node of committedNodes) {
    if (node.type !== "Requirement") {
      continue;
    }

    const outgoingDecisionEdges = committedEdges.filter((edge) => {
      if (edge.from !== node.id) {
        return false;
      }

      const target = nodeById.get(edge.to);
      return target?.type === "Decision";
    });

    if (outgoingDecisionEdges.length !== 1) {
      return `Requirement "${node.title}" must link to exactly one Decision before commit/import.`;
    }
  }

  return null;
}

function validateCommittedEdgeVersioningOnImport(incomingEdges, existingEdges) {
  const existingCommittedById = new Map(
    existingEdges
      .filter((edge) => edge && edge.stage === "committed" && typeof edge.id === "string")
      .map((edge) => [edge.id, edge])
  );
  const incomingIds = new Set(
    incomingEdges
      .filter((edge) => edge && typeof edge.id === "string")
      .map((edge) => edge.id)
  );

  for (const existingCommitted of existingCommittedById.values()) {
    if (!incomingIds.has(existingCommitted.id)) {
      return "Import cannot remove committed edges. Add a new versioned edge instead.";
    }
  }

  for (const incoming of incomingEdges) {
    if (!incoming || typeof incoming.id !== "string") {
      continue;
    }

    const existingCommitted = existingCommittedById.get(incoming.id);
    if (!existingCommitted) {
      continue;
    }

    const changed =
      incoming.from !== existingCommitted.from ||
      incoming.to !== existingCommitted.to ||
      incoming.relationshipType !== existingCommitted.relationshipType;

    if (changed) {
      return "Committed edge changes must be added as a new versioned edge, not edited in place.";
    }
  }

  return null;
}

export default function NodesDraftClient() {
  const initialNodes = loadDraftNodes();
  const initialEdges = loadDraftEdges(initialNodes);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Decision");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState("newest");
  const [showArchived, setShowArchived] = useState(false);
  const [draftNodes, setDraftNodes] = useState(() =>
    applyEdgesToNodes(initialNodes, initialEdges)
  );
  const [draftEdges, setDraftEdges] = useState(initialEdges);
  const [selectedId, setSelectedId] = useState(null);
  const [bundleText, setBundleText] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [relationshipTargetId, setRelationshipTargetId] = useState("");
  const [relationshipType, setRelationshipType] = useState("relates_to");
  const [relationshipError, setRelationshipError] = useState("");
  const [commitConfirmText, setCommitConfirmText] = useState("");
  const [commitError, setCommitError] = useState("");

  const selectedNode = draftNodes.find((node) => node.id === selectedId) || null;
  const selectedStage = selectedNode ? normalizeStatus(selectedNode) : null;
  const selectedIsCommitted = selectedStage === "committed";
  const selectedIsArchived = selectedStage === "archived";

  const nodeById = useMemo(
    () => new Map(draftNodes.map((node) => [node.id, node])),
    [draftNodes]
  );

  function syncEdges(nextNodes, currentEdges) {
    const nextNodeById = new Map(nextNodes.map((node) => [node.id, node]));
    const existingByKey = new Map(
      currentEdges.map((edge) => [
        `${edge.from}|${edge.to}|${edge.relationshipType}`,
        edge,
      ])
    );

    return buildEdgesFromNodes(nextNodes).map((candidate) => {
      const key = `${candidate.from}|${candidate.to}|${candidate.relationshipType}`;
      const existing = existingByKey.get(key);
      return existing
        ? {
            ...existing,
            stage:
              normalizeStatus(nextNodeById.get(existing.from) || { stage: "proposed" }) ===
              "committed"
                ? "committed"
                : existing.stage,
          }
        : candidate;
    });
  }

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

  function saveDraftState(nextNodes, nextEdges) {
    const nodesWithEdges = applyEdgesToNodes(nextNodes, nextEdges);
    setDraftNodes(nodesWithEdges);
    setDraftEdges(nextEdges);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodesWithEdges));
    window.localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(nextEdges));
  }

  function saveDraftNodes(nextNodes) {
    const nextEdges = syncEdges(nextNodes, draftEdges);
    saveDraftState(nextNodes, nextEdges);
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
      version: 1,
      createdBy: AUDIT_ACTOR,
      stage: "proposed",
      status: "queued",
      relationships: [],
    };

    const nextNodes = [...draftNodes, nextNode];
    saveDraftNodes(nextNodes);
    setSelectedId(nextNode.id);
    setCommitConfirmText("");
    setCommitError("");
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

  function validateNodeForCommit(node, allNodes) {
    const allNodeById = new Map(allNodes.map((item) => [item.id, item]));
    const nodeStage = normalizeStatus(node);

    if (nodeStage === "archived") {
      return "Archived nodes cannot be committed.";
    }

    if (nodeStage === "committed") {
      return "Node is already committed.";
    }

    const nodeRelationships = Array.isArray(node.relationships) ? node.relationships : [];

    for (const relationship of nodeRelationships) {
      const target = allNodeById.get(relationship.targetId);
      if (!target) {
        continue;
      }

      if (normalizeStatus(target) === "proposed") {
        return "Committed nodes cannot link to proposed nodes.";
      }
    }

    if (node.type === "Requirement") {
      const decisionLinks = nodeRelationships.filter((relationship) => {
        const target = allNodeById.get(relationship.targetId);
        return target?.type === "Decision";
      });

      if (decisionLinks.length !== 1) {
        return "Requirement must link to exactly one Decision before commit.";
      }
    }

    return null;
  }

  function handleCommitSelected() {
    if (!selectedNode || selectedStage !== "proposed") {
      return;
    }

    if (commitConfirmText !== "CONFIRMED") {
      setCommitError("Type CONFIRMED before committing.");
      return;
    }

    const commitValidationError = validateNodeForCommit(selectedNode, draftNodes);
    if (commitValidationError) {
      setCommitError(commitValidationError);
      return;
    }
    const nextNodes = draftNodes.map((node) =>
      node.id === selectedNode.id
        ? { ...node, status: "committed", stage: "committed" }
        : node
    );
    const nextEdges = syncEdges(nextNodes, draftEdges);
    const graphValidationError = validateCommittedGraphIntegrity(nextNodes, nextEdges);
    if (graphValidationError) {
      setCommitError(graphValidationError);
      return;
    }

    saveDraftState(nextNodes, nextEdges);
    appendAuditEntry({
      timestamp: new Date().toISOString(),
      action: "NODE_COMMITTED",
      nodeId: selectedNode.id,
      nodeTitle: selectedNode.title,
      actor: AUDIT_ACTOR,
    });
    setCommitConfirmText("");
    setCommitError("");
  }

  function handleArchiveSelected() {
    if (!selectedNode || selectedStage === "archived") {
      return;
    }

    updateSelectedNode({ status: "archived", stage: "archived" });
    setSelectedId(null);
    setCommitConfirmText("");
    setCommitError("");
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
      setCommitConfirmText("");
      setCommitError("");
      setRelationshipError("");
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
    setCommitConfirmText("");
    setCommitError("");
  }

  function handleResetDemoData() {
    saveDraftNodes([]);
    clearAuditEntries();
    setSelectedId(null);
    setBundleMessage("");
    setImportText("");
    setImportError("");
    setRelationshipError("");
    setCommitConfirmText("");
    setCommitError("");
  }

  function handleExportBundle() {
    const canonicalEdges = syncEdges(draftNodes, draftEdges);
    const bundle = {
      metadata: {
        schemaVersion: CURRENT_BUNDLE_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        upgradeNotes:
          "Version 2 uses canonical edges as source of truth. relationships are included for backward compatibility.",
      },
      nodes: draftNodes,
      edges: canonicalEdges,
      relationships: canonicalEdges.map((edge) => ({
        sourceId: edge.from,
        targetId: edge.to,
        type: edge.relationshipType,
      })),
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
        .filter((node) => node !== null);

      const nodesById = new Map(normalizedNodes.map((node) => [node.id, node]));
      const normalizedEdges = buildCanonicalEdgesForImport(parsed, nodesById);

      const edgeVersioningError = validateCommittedEdgeVersioningOnImport(
        normalizedEdges,
        draftEdges
      );
      if (edgeVersioningError) {
        setBundleMessage(`Import failed: ${edgeVersioningError}`);
        return;
      }

      const nodesWithEdges = applyEdgesToNodes(normalizedNodes, normalizedEdges);
      const importValidationError = validateImportPayload(nodesWithEdges);
      if (importValidationError) {
        setBundleMessage(`Import failed: ${importValidationError}`);
        return;
      }

      const committedGraphError = validateCommittedGraphIntegrity(
        nodesWithEdges,
        normalizedEdges
      );
      if (committedGraphError) {
        setBundleMessage(`Import failed: ${committedGraphError}`);
        return;
      }

      saveDraftState(nodesWithEdges, normalizedEdges);
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
      setCommitConfirmText("");
      setCommitError("");
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
              <button
                type="button"
                onClick={() => {
                  setSelectedId(node.id);
                  setCommitConfirmText("");
                  setCommitError("");
                  setRelationshipError("");
                }}
              >
                {node.title} ({node.type}) [{node.stage || normalizeStatus(node)}]
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
          <p>
            Workflow status: <strong>{selectedNode.status}</strong> | Version:{" "}
            <strong>{selectedNode.version}</strong> | Created by:{" "}
            <strong>{selectedNode.createdBy}</strong>
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
              disabled={selectedStage !== "proposed"}
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
          {selectedStage === "proposed" ? (
            <p>
              <label htmlFor="commit-confirmed">Type CONFIRMED to commit</label>
              <br />
              <input
                id="commit-confirmed"
                value={commitConfirmText}
                onChange={(event) => {
                  setCommitConfirmText(event.target.value);
                  setCommitError("");
                }}
              />
            </p>
          ) : null}
          {commitError ? <p>{commitError}</p> : null}
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
