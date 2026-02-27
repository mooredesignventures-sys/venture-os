const MOCK_SEED = 42;
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];

function hashMode(mode) {
  return String(mode || "default")
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), MOCK_SEED);
}

function seededPosition(mode, index) {
  const modeHash = hashMode(mode);
  const x = 120 + ((modeHash + index * 97) % 640);
  const y = 80 + ((modeHash * 3 + index * 71) % 360);
  return { x, y };
}

function createNode(mode, scope, index, type, title) {
  const position = seededPosition(mode, index);
  const stage = scope === "committed" ? "committed" : "draft";
  return {
    id: `mock-${mode}-${index + 1}`,
    title,
    type,
    stage,
    status: stage,
    relationships: [],
    position,
  };
}

function createEdge(mode, scope, index, from, to, relationshipType) {
  return {
    id: `mock-edge-${mode}-${index + 1}`,
    from,
    to,
    relationshipType,
    stage: scope === "committed" ? "committed" : "draft",
  };
}

function buildRequirementsGraph(scope) {
  const titles = [
    "Stability Guardrails",
    "Route Reliability",
    "Founder Confirmation Gate",
    "Audit Append-Only Integrity",
    "Deterministic View Rendering",
    "Windows Toolchain Predictability",
  ];

  const nodes = titles.map((title, index) =>
    createNode("requirements", scope, index, "Requirement", title),
  );

  const edges = [
    [0, 1, "depends_on"],
    [1, 2, "enables"],
    [2, 3, "relates_to"],
    [3, 4, "depends_on"],
    [4, 5, "enables"],
  ].map(([fromIndex, toIndex, type], index) =>
    createEdge("requirements", scope, index, nodes[fromIndex].id, nodes[toIndex].id, type),
  );

  return { nodes, edges };
}

function buildDecisionsGraph(scope) {
  const titles = [
    "Lock Node Runtime",
    "Preserve Founder Boundary",
    "Adopt Mock-First AI Drafts",
    "Enforce Archive-Only Deletes",
    "Keep Proposal-First Workflow",
  ];

  const nodes = titles.map((title, index) =>
    createNode("decisions", scope, index, "Decision", title),
  );

  const edges = [
    [0, 1, "depends_on"],
    [1, 2, "enables"],
    [2, 3, "relates_to"],
    [3, 4, "depends_on"],
  ].map(([fromIndex, toIndex, type], index) =>
    createEdge("decisions", scope, index, nodes[fromIndex].id, nodes[toIndex].id, type),
  );

  return { nodes, edges };
}

function buildBusinessGraph(scope) {
  const entries = [
    ["Decision", "War Room Prioritization"],
    ["Requirement", "Proposal Quality Baseline"],
    ["Task", "Weekly Stability Drill"],
    ["Project", "MVP Launch Track"],
    ["Risk", "Execution Drift Watch"],
    ["Metric", "Conversion Confidence"],
  ];

  const nodes = entries.map(([type, title], index) =>
    createNode("business", scope, index, type, title),
  );

  const edges = [
    [0, 1, "enables"],
    [1, 2, "depends_on"],
    [2, 3, "enables"],
    [3, 4, "relates_to"],
    [4, 5, "depends_on"],
  ].map(([fromIndex, toIndex, type], index) =>
    createEdge("business", scope, index, nodes[fromIndex].id, nodes[toIndex].id, type),
  );

  return { nodes, edges };
}

export function getMockGraph(mode, scope = "draft") {
  const normalizedScope = scope === "committed" ? "committed" : "draft";

  if (mode === "requirements") {
    return buildRequirementsGraph(normalizedScope);
  }

  if (mode === "decisions") {
    return buildDecisionsGraph(normalizedScope);
  }

  if (mode === "business") {
    return buildBusinessGraph(normalizedScope);
  }

  const fallback = buildBusinessGraph(normalizedScope);
  return {
    nodes: fallback.nodes.map((node, index) => ({
      ...node,
      id: `mock-${mode || "default"}-${index + 1}`,
    })),
    edges: fallback.edges.map((edge, index) => ({
      ...edge,
      id: `mock-edge-${mode || "default"}-${index + 1}`,
      relationshipType: RELATIONSHIP_TYPES[index % RELATIONSHIP_TYPES.length],
    })),
  };
}

export { MOCK_SEED };
