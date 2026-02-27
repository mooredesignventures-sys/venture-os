import { NextResponse } from "next/server";

const ALLOWED_MODES = new Set(["requirements", "decisions", "business"]);
const MOCK_BASE_TIME = Date.UTC(2026, 0, 1, 0, 0, 0);

function normalizeMode(mode) {
  const value = typeof mode === "string" ? mode.toLowerCase().trim() : "";
  return ALLOWED_MODES.has(value) ? value : "requirements";
}

function deterministicIso(offsetMinutes) {
  return new Date(MOCK_BASE_TIME + offsetMinutes * 60_000).toISOString();
}

function createProposedNode({ id, type, title, index }) {
  return {
    id,
    type,
    title,
    stage: "proposed",
    status: "queued",
    risk: "medium",
    createdAt: deterministicIso(index),
    createdBy: "AI",
  };
}

function createProposedEdge({ id, from, to, index }) {
  return {
    id,
    from,
    to,
    relationshipType: "relates_to",
    stage: "proposed",
    createdAt: deterministicIso(100 + index),
    createdBy: "AI",
  };
}

function getDeterministicMockBundle(mode) {
  if (mode === "decisions") {
    const nodes = [
      createProposedNode({ id: "decision:mock:1", type: "Decision", title: "Set founder review cadence", index: 1 }),
      createProposedNode({ id: "decision:mock:2", type: "Decision", title: "Adopt proposed-first workflow", index: 2 }),
      createProposedNode({ id: "requirement:mock:1", type: "Requirement", title: "Track decision confidence bands", index: 3 }),
      createProposedNode({ id: "task:mock:1", type: "Task", title: "Draft weekly council memo", index: 4 }),
      createProposedNode({ id: "task:mock:2", type: "Task", title: "Review dependency impacts", index: 5 }),
      createProposedNode({ id: "risk:mock:1", type: "Risk", title: "Monitor drift before commit", index: 6 }),
    ];

    const edges = [
      createProposedEdge({ id: "edge:mock:1", from: nodes[0].id, to: nodes[2].id, index: 1 }),
      createProposedEdge({ id: "edge:mock:2", from: nodes[1].id, to: nodes[2].id, index: 2 }),
      createProposedEdge({ id: "edge:mock:3", from: nodes[2].id, to: nodes[3].id, index: 3 }),
      createProposedEdge({ id: "edge:mock:4", from: nodes[2].id, to: nodes[4].id, index: 4 }),
      createProposedEdge({ id: "edge:mock:5", from: nodes[5].id, to: nodes[0].id, index: 5 }),
    ];

    return { nodes, edges };
  }

  if (mode === "business") {
    const nodes = [
      createProposedNode({ id: "project:mock:1", type: "Project", title: "Founder Venture Governance OS", index: 1 }),
      createProposedNode({ id: "requirement:mock:1", type: "Requirement", title: "Keep commits founder-confirmed", index: 2 }),
      createProposedNode({ id: "decision:mock:1", type: "Decision", title: "Mock-first AI drafting enabled", index: 3 }),
      createProposedNode({ id: "task:mock:1", type: "Task", title: "Publish council status snapshots", index: 4 }),
      createProposedNode({ id: "metric:mock:1", type: "Metric", title: "Proposal throughput per week", index: 5 }),
      createProposedNode({ id: "risk:mock:1", type: "Risk", title: "Unreviewed proposal backlog", index: 6 }),
    ];

    const edges = [
      createProposedEdge({ id: "edge:mock:1", from: nodes[0].id, to: nodes[1].id, index: 1 }),
      createProposedEdge({ id: "edge:mock:2", from: nodes[0].id, to: nodes[2].id, index: 2 }),
      createProposedEdge({ id: "edge:mock:3", from: nodes[2].id, to: nodes[3].id, index: 3 }),
      createProposedEdge({ id: "edge:mock:4", from: nodes[3].id, to: nodes[4].id, index: 4 }),
      createProposedEdge({ id: "edge:mock:5", from: nodes[5].id, to: nodes[0].id, index: 5 }),
    ];

    return { nodes, edges };
  }

  const nodes = [
    createProposedNode({ id: "requirement:mock:1", type: "Requirement", title: "Founder-only commit at boundary", index: 1 }),
    createProposedNode({ id: "requirement:mock:2", type: "Requirement", title: "Require exact CONFIRMED for commit", index: 2 }),
    createProposedNode({ id: "requirement:mock:3", type: "Requirement", title: "AI draft must remain proposed-only", index: 3 }),
    createProposedNode({ id: "task:mock:1", type: "Task", title: "Validate audit append-only integrity", index: 4 }),
    createProposedNode({ id: "task:mock:2", type: "Task", title: "Verify archive-only deletion path", index: 5 }),
    createProposedNode({ id: "risk:mock:1", type: "Risk", title: "Detect unauthorized commit attempts", index: 6 }),
  ];

  const edges = [
    createProposedEdge({ id: "edge:mock:1", from: nodes[0].id, to: nodes[1].id, index: 1 }),
    createProposedEdge({ id: "edge:mock:2", from: nodes[1].id, to: nodes[2].id, index: 2 }),
    createProposedEdge({ id: "edge:mock:3", from: nodes[2].id, to: nodes[3].id, index: 3 }),
    createProposedEdge({ id: "edge:mock:4", from: nodes[3].id, to: nodes[4].id, index: 4 }),
    createProposedEdge({ id: "edge:mock:5", from: nodes[5].id, to: nodes[0].id, index: 5 }),
  ];

  return { nodes, edges };
}

function sanitizeAIBundle(bundle, mode) {
  const fallback = getDeterministicMockBundle(mode);
  const sourceNodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
  const sourceEdges = Array.isArray(bundle?.edges) ? bundle.edges : [];

  const nodes = sourceNodes.slice(0, 10).map((node, index) =>
    createProposedNode({
      id:
        typeof node?.id === "string" && node.id.trim()
          ? node.id.trim()
          : `${mode}:ai:${index + 1}`,
      type:
        typeof node?.type === "string" && node.type.trim()
          ? node.type.trim()
          : mode === "decisions"
            ? "Decision"
            : "Requirement",
      title:
        typeof node?.title === "string" && node.title.trim()
          ? node.title.trim()
          : `AI Draft ${index + 1}`,
      index: index + 1,
    }),
  );

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = sourceEdges
    .slice(0, 10)
    .map((edge, index) => {
      const from = typeof edge?.from === "string" ? edge.from.trim() : "";
      const to = typeof edge?.to === "string" ? edge.to.trim() : "";
      if (!nodeIds.has(from) || !nodeIds.has(to)) {
        return null;
      }
      return createProposedEdge({
        id:
          typeof edge?.id === "string" && edge.id.trim()
            ? edge.id.trim()
            : `${mode}:ai:edge:${index + 1}`,
        from,
        to,
        index: index + 1,
      });
    })
    .filter(Boolean);

  if (nodes.length === 0) {
    return fallback;
  }

  return {
    nodes,
    edges: edges.length > 0 ? edges : fallback.edges.slice(0, 5),
  };
}

async function generateAIBundle(prompt, mode) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Return only JSON with shape {\"bundle\":{\"nodes\":[],\"edges\":[]}}. Draft bundle only. Do not include committed or archived stages.",
        },
        {
          role: "user",
          content: `Mode: ${mode}\nPrompt: ${prompt}\nGenerate 5-10 nodes and 5-10 edges.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI response did not include JSON content");
  }

  const parsed = JSON.parse(content);
  return parsed?.bundle || parsed;
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "prompt is required" },
      { status: 400 },
    );
  }

  const mode = normalizeMode(body?.mode);

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      ok: true,
      source: "mock",
      bundle: getDeterministicMockBundle(mode),
    });
  }

  try {
    const aiBundle = await generateAIBundle(prompt, mode);
    return NextResponse.json({
      ok: true,
      source: "ai",
      bundle: sanitizeAIBundle(aiBundle, mode),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "mock",
      bundle: getDeterministicMockBundle(mode),
    });
  }
}
