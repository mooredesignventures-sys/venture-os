import { NextResponse } from "next/server";

const ALLOWED_NODE_TYPES = [
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
const ALLOWED_REL_TYPES = ["depends_on", "enables", "relates_to"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 12;
const rateLimitByKey = new Map();

function rateLimitKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "local";
}

function isRateLimited(key) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const existing = rateLimitByKey.get(key) || [];
  const next = existing.filter((value) => value >= windowStart);
  next.push(now);
  rateLimitByKey.set(key, next);
  return next.length > RATE_LIMIT_MAX;
}

function sanitizeType(value, fallback = "Requirement") {
  return ALLOWED_NODE_TYPES.includes(value) ? value : fallback;
}

function sanitizeRelationshipType(value) {
  return ALLOWED_REL_TYPES.includes(value) ? value : "relates_to";
}

function normalizeAiNode(raw, index) {
  const title =
    typeof raw?.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 160)
      : `AI Item ${index + 1}`;
  const id =
    typeof raw?.id === "string" && raw.id.trim()
      ? raw.id.trim()
      : `ai_node_${index + 1}`;
  return {
    id,
    title,
    type: sanitizeType(raw?.type),
    stage: "proposed",
    status: "queued",
    relationships: [],
  };
}

function normalizeAiEdge(raw, nodeIds, index) {
  const from = typeof raw?.from === "string" ? raw.from : "";
  const to = typeof raw?.to === "string" ? raw.to : "";
  if (!nodeIds.has(from) || !nodeIds.has(to) || from === to) {
    return null;
  }
  return {
    id:
      typeof raw?.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `ai_edge_${index + 1}`,
    from,
    to,
    relationshipType: sanitizeRelationshipType(raw?.relationshipType),
    stage: "proposed",
    version: 1,
  };
}

function enforceSchema(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "AI response must be an object." };
  }
  if (!Array.isArray(payload.nodes)) {
    return { ok: false, error: "AI response missing nodes array." };
  }
  if (!Array.isArray(payload.edges)) {
    return { ok: false, error: "AI response missing edges array." };
  }
  const nodes = payload.nodes.map((node, index) => normalizeAiNode(node, index));
  const uniqueById = new Map();
  for (const node of nodes) {
    if (uniqueById.has(node.id)) {
      node.id = `${node.id}_${Math.random().toString(36).slice(2, 6)}`;
    }
    uniqueById.set(node.id, node);
  }
  const nodeIds = new Set([...uniqueById.keys()]);
  const edges = payload.edges
    .map((edge, index) => normalizeAiEdge(edge, nodeIds, index))
    .filter((edge) => edge !== null);
  const relationshipsBySource = new Map();
  for (const edge of edges) {
    if (!relationshipsBySource.has(edge.from)) {
      relationshipsBySource.set(edge.from, []);
    }
    relationshipsBySource.get(edge.from).push({
      targetId: edge.to,
      type: edge.relationshipType,
    });
  }
  const finalizedNodes = [...uniqueById.values()].map((node) => ({
    ...node,
    relationships: relationshipsBySource.get(node.id) || [],
  }));
  return {
    ok: true,
    nodes: finalizedNodes,
    edges,
    summary:
      typeof payload.summary === "string" && payload.summary.trim()
        ? payload.summary.trim()
        : "AI generated a proposed requirement/task draft.",
  };
}

function mockDraft(idea, mode, constraints) {
  const trimmedIdea = idea.trim();
  const subject = trimmedIdea.split(/\s+/).slice(0, 5).join(" ");
  const scopeSuffix = mode === "requirements" ? "requirements" : "draft";
  const constraintLine =
    constraints && constraints.trim() ? `Constraints: ${constraints.trim().slice(0, 100)}.` : "";
  const nodes = [
    {
      id: "ai_decision_1",
      title: `Define success criteria for ${subject}`,
      type: "Decision",
    },
    {
      id: "ai_requirement_1",
      title: `Document user outcomes for ${scopeSuffix}`,
      type: "Requirement",
    },
    {
      id: "ai_requirement_2",
      title: "Map dependencies and acceptance checks",
      type: "Requirement",
    },
    {
      id: "ai_task_1",
      title: "Break work into first implementation tasks",
      type: "Task",
    },
  ];
  const edges = [
    { from: "ai_decision_1", to: "ai_requirement_1", relationshipType: "enables" },
    { from: "ai_requirement_1", to: "ai_requirement_2", relationshipType: "depends_on" },
    { from: "ai_requirement_2", to: "ai_task_1", relationshipType: "enables" },
  ];
  return {
    nodes,
    edges,
    summary: `Mock AI draft generated for "${trimmedIdea.slice(0, 120)}". ${constraintLine}`.trim(),
  };
}

async function openAiDraft(idea, mode, constraints) {
  const body = {
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Return ONLY valid JSON with keys: summary(string), nodes(array), edges(array). Nodes: id,title,type. Edges: from,to,relationshipType. All items must be proposed-only planning artifacts.",
      },
      {
        role: "user",
        content: JSON.stringify({ idea, mode, constraints }),
      },
    ],
  };
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }
  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("OpenAI response content missing.");
  }
  return JSON.parse(content);
}

export async function POST(request) {
  try {
    const key = rateLimitKey(request);
    if (isRateLimited(key)) {
      return NextResponse.json(
        { ok: false, error: "Rate limit exceeded. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const payload = await request.json();
    const idea = typeof payload?.idea === "string" ? payload.idea.trim() : "";
    const mode = payload?.mode === "requirements" ? "requirements" : "requirements";
    const constraints =
      typeof payload?.constraints === "string" ? payload.constraints.trim() : "";

    if (!idea) {
      return NextResponse.json({ ok: false, error: "idea is required." }, { status: 400 });
    }
    if (idea.length > 1000) {
      return NextResponse.json(
        { ok: false, error: "idea is too long (max 1000 chars)." },
        { status: 400 }
      );
    }

    const aiOutput = process.env.OPENAI_API_KEY
      ? await openAiDraft(idea, mode, constraints)
      : mockDraft(idea, mode, constraints);
    const validated = enforceSchema(aiOutput);
    if (!validated.ok) {
      return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      nodes: validated.nodes.map((node) => ({
        ...node,
        stage: "proposed",
        status: "queued",
      })),
      edges: validated.edges.map((edge) => ({
        ...edge,
        stage: "proposed",
      })),
      summary: validated.summary,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to generate draft." },
      { status: 500 }
    );
  }
}
