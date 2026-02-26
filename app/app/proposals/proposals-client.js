"use client";

import { useEffect, useState } from "react";

const NODE_STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];
const ACTOR_PLACEHOLDER = "founder";
const EMPTY_GRAPH = {
  committedNodes: [],
  committedEdges: [],
  committedNodeById: new Map(),
  nodeById: new Map(),
};

const TEMPLATES = {
  decision: `Proposal Type: Decision
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
  requirement: `Proposal Type: Requirement
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
  kpi: `Proposal Type: KPI
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
};

function normalizeNodeStage(node) {
  if (node?.stage === "committed" || node?.status === "committed") {
    return "committed";
  }

  if (node?.stage === "archived" || node?.status === "archived" || node?.archived) {
    return "archived";
  }

  return "proposed";
}

function loadNodes() {
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

function buildEdgesFromRelationships(nodes) {
  return nodes.flatMap((node) => {
    if (!Array.isArray(node.relationships)) {
      return [];
    }

    return node.relationships
      .filter(
        (rel) =>
          rel &&
          typeof rel === "object" &&
          typeof rel.targetId === "string" &&
          RELATIONSHIP_TYPES.includes(rel.type)
      )
      .map((rel) => ({
        id: `fallback_${node.id}_${rel.targetId}_${rel.type}`,
        from: node.id,
        to: rel.targetId,
        relationshipType: rel.type,
        stage: normalizeNodeStage(node) === "committed" ? "committed" : "proposed",
      }));
  });
}

function loadEdges(nodes) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(EDGE_STORAGE_KEY);
    if (!raw) {
      return buildEdgesFromRelationships(nodes);
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return buildEdgesFromRelationships(nodes);
    }

    return parsed;
  } catch {
    return buildEdgesFromRelationships(nodes);
  }
}

function getCommittedGraph() {
  const nodes = loadNodes().filter(
    (node) =>
      node &&
      typeof node.id === "string" &&
      typeof node.title === "string" &&
      typeof node.type === "string"
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges = loadEdges(nodes).filter(
    (edge) =>
      edge &&
      typeof edge.from === "string" &&
      typeof edge.to === "string" &&
      RELATIONSHIP_TYPES.includes(edge.relationshipType) &&
      edge.stage !== "archived"
  );

  const committedNodes = nodes.filter((node) => normalizeNodeStage(node) === "committed");
  const committedNodeIds = new Set(committedNodes.map((node) => node.id));

  const committedEdges = edges.filter(
    (edge) => committedNodeIds.has(edge.from) && committedNodeIds.has(edge.to)
  );

  const committedNodeById = new Map(committedNodes.map((node) => [node.id, node]));

  return { committedNodes, committedEdges, committedNodeById, nodeById };
}

function formatDate(value) {
  if (Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return "unknown";
}

function uniqueById(nodes) {
  const seen = new Set();
  return nodes.filter((node) => {
    if (!node || seen.has(node.id)) {
      return false;
    }
    seen.add(node.id);
    return true;
  });
}

function buildDecisionMemo(graph, decisionId) {
  const decision = graph.committedNodeById.get(decisionId);
  if (!decision) {
    return "No committed Decision selected.";
  }

  const linkedRequirements = uniqueById(
    graph.committedEdges
      .filter((edge) => edge.to === decision.id)
      .map((edge) => graph.committedNodeById.get(edge.from))
      .filter((node) => node?.type === "Requirement")
  );

  const relatedEdges = graph.committedEdges.filter(
    (edge) => edge.from === decision.id || edge.to === decision.id
  );
  const relatedByType = relatedEdges.reduce((grouped, edge) => {
    const otherId = edge.from === decision.id ? edge.to : edge.from;
    const otherNode = graph.committedNodeById.get(otherId);
    if (!otherNode) {
      return grouped;
    }

    if (!grouped.has(edge.relationshipType)) {
      grouped.set(edge.relationshipType, []);
    }
    grouped.get(edge.relationshipType).push(otherNode);
    return grouped;
  }, new Map());

  const lines = [
    "# Decision Memo",
    "",
    `GeneratedAt: ${new Date().toISOString()}`,
    `Actor: ${ACTOR_PLACEHOLDER}`,
    `DecisionId: ${decision.id}`,
    `DecisionTitle: ${decision.title}`,
    `DecisionType: ${decision.type}`,
    `DecisionCreatedAt: ${formatDate(decision.createdAt)}`,
    "",
    "## Linked Requirements",
  ];

  if (linkedRequirements.length === 0) {
    lines.push("- None");
  } else {
    for (const req of linkedRequirements) {
      lines.push(`- ${req.title} (${req.id})`);
    }
  }

  lines.push("", "## Related Nodes By Relationship Type");

  if (relatedByType.size === 0) {
    lines.push("- None");
  } else {
    for (const [type, nodes] of relatedByType.entries()) {
      lines.push(`- ${type}:`);
      for (const node of uniqueById(nodes)) {
        lines.push(`  - ${node.title} (${node.type}, ${node.id})`);
      }
    }
  }

  return lines.join("\n");
}

function buildExecutionPack(graph) {
  const decisions = graph.committedNodes.filter((node) => node.type === "Decision");
  const lines = [
    "# Release/Execution Pack",
    "",
    `GeneratedAt: ${new Date().toISOString()}`,
    `Actor: ${ACTOR_PLACEHOLDER}`,
    `CommittedDecisions: ${decisions.length}`,
    "",
  ];

  if (decisions.length === 0) {
    lines.push("No committed Decisions found.");
    return lines.join("\n");
  }

  for (const decision of decisions) {
    const reqs = uniqueById(
      graph.committedEdges
        .filter((edge) => edge.to === decision.id)
        .map((edge) => graph.committedNodeById.get(edge.from))
        .filter((node) => node?.type === "Requirement")
    );
    const executionNodes = uniqueById(
      graph.committedEdges
        .filter((edge) => edge.from === decision.id || edge.to === decision.id)
        .map((edge) =>
          graph.committedNodeById.get(edge.from === decision.id ? edge.to : edge.from)
        )
        .filter((node) => ["KPI", "Risk", "Task"].includes(node?.type))
    );

    lines.push(`## Decision: ${decision.title} (${decision.id})`);
    lines.push(`CreatedAt: ${formatDate(decision.createdAt)}`);
    lines.push("Requirements:");
    if (reqs.length === 0) {
      lines.push("- None");
    } else {
      for (const req of reqs) {
        lines.push(`- ${req.title} (${req.id})`);
      }
    }
    lines.push("KPIs/Risks/Tasks:");
    if (executionNodes.length === 0) {
      lines.push("- None");
    } else {
      for (const node of executionNodes) {
        lines.push(`- ${node.title} (${node.type}, ${node.id})`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export default function ProposalsClient() {
  const [mounted, setMounted] = useState(false);
  const [graph, setGraph] = useState(EMPTY_GRAPH);
  const [text, setText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [selectedDecisionId, setSelectedDecisionId] = useState("");
  const committedDecisions = graph.committedNodes.filter(
    (node) => node.type === "Decision"
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setGraph(getCommittedGraph());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  function generate(templateKey) {
    setText(TEMPLATES[templateKey]);
    setCopyMessage("");
  }

  function generateDecisionMemo() {
    setText(buildDecisionMemo(graph, selectedDecisionId));
    setCopyMessage("");
  }

  function generateExecutionPack() {
    setText(buildExecutionPack(graph));
    setCopyMessage("");
  }

  async function copyText() {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied.");
    } catch {
      setCopyMessage("Copy failed.");
    }
  }

  function clearText() {
    setText("");
    setCopyMessage("");
  }

  function downloadText() {
    if (!text) {
      return;
    }

    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "proposal-pack.md";
    link.click();
    URL.revokeObjectURL(url);
    setCopyMessage("Downloaded.");
  }

  if (!mounted) {
    return (
      <section>
        <p>Loading proposals...</p>
      </section>
    );
  }

  return (
    <section>
      <p>
        <button type="button" onClick={() => generate("decision")}>
          Propose a Decision
        </button>{" "}
        <button type="button" onClick={() => generate("requirement")}>
          Propose a Requirement
        </button>{" "}
        <button type="button" onClick={() => generate("kpi")}>
          Propose a KPI
        </button>
      </p>
      <h3>Proposal Pack (Committed Graph)</h3>
      {committedDecisions.length === 0 ? (
        <p>No committed Decisions found. Commit at least one Decision in Nodes first.</p>
      ) : (
        <p>
          <label htmlFor="decision-select">Committed Decision</label>
          <br />
          <select
            id="decision-select"
            value={selectedDecisionId}
            onChange={(event) => setSelectedDecisionId(event.target.value)}
          >
            <option value="">Select Decision...</option>
            {committedDecisions.map((decision) => (
              <option key={decision.id} value={decision.id}>
                {decision.title} ({decision.id})
              </option>
            ))}
          </select>{" "}
          <button
            type="button"
            onClick={generateDecisionMemo}
            disabled={!selectedDecisionId}
          >
            Generate Decision Memo
          </button>{" "}
          <button type="button" onClick={generateExecutionPack}>
            Generate Release/Execution Pack
          </button>
        </p>
      )}

      <textarea value={text} readOnly rows={12} cols={70} />
      <br />
      <button type="button" onClick={copyText}>
        Copy to clipboard
      </button>{" "}
      <button type="button" onClick={downloadText}>
        Download .md
      </button>{" "}
      <button type="button" onClick={clearText}>
        Clear
      </button>
      {copyMessage ? <p>{copyMessage}</p> : null}
    </section>
  );
}
