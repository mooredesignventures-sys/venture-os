import crypto from "node:crypto";
import { NextResponse } from "next/server";

const ALLOWED_MODES = new Set(["requirements", "decisions", "business"]);
const MOCK_BASE_TIME = Date.UTC(2026, 0, 1, 0, 0, 0);
const DEFAULT_OWNER = "founder";
const DEFAULT_RISK = "medium";
const DEFAULT_RELATIONSHIP_TYPE = "relates_to";
const CREATED_BY = "ai";

function normalizeMode(mode) {
  const value = typeof mode === "string" ? mode.toLowerCase().trim() : "";
  return ALLOWED_MODES.has(value) ? value : "requirements";
}

function normalizePrompt(prompt) {
  return typeof prompt === "string" ? prompt.trim().replace(/\s+/g, " ") : "";
}

function toIdPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSeed(prompt, mode) {
  return crypto
    .createHash("sha256")
    .update(`${normalizePrompt(prompt)}|${mode}`)
    .digest("hex");
}

function seedKey(seed) {
  return seed.slice(0, 10);
}

function seedOffsetMinutes(seed) {
  const value = Number.parseInt(seed.slice(0, 8), 16);
  return Number.isFinite(value) ? value % (365 * 24 * 60) : 0;
}

function deterministicIso(seed, offsetMinutes) {
  const minutes = seedOffsetMinutes(seed) + offsetMinutes;
  return new Date(MOCK_BASE_TIME + minutes * 60_000).toISOString();
}

function coerceString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function coerceNumber(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function coerceIso(value, seed, index) {
  const candidate = coerceString(value);
  if (candidate) {
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return deterministicIso(seed, index);
}

function promptSnippet(prompt) {
  const clean = normalizePrompt(prompt);
  if (!clean) {
    return "founder governance os";
  }
  return clean.slice(0, 44);
}

function createProposedNode({
  id,
  type,
  title,
  seed,
  index,
  version = 1,
  owner = DEFAULT_OWNER,
  risk = DEFAULT_RISK,
  parentId = null,
  createdAt,
}) {
  return {
    id,
    type,
    title,
    stage: "proposed",
    status: "queued",
    version,
    createdAt: coerceIso(createdAt, seed, index),
    createdBy: CREATED_BY,
    owner,
    risk,
    parentId,
    archived: false,
  };
}

function createProposedEdge({
  id,
  from,
  to,
  seed,
  index,
  relationshipType = DEFAULT_RELATIONSHIP_TYPE,
  createdAt,
}) {
  return {
    id,
    from,
    to,
    relationshipType,
    stage: "proposed",
    createdAt: coerceIso(createdAt, seed, 100 + index),
    createdBy: CREATED_BY,
    archived: false,
  };
}

function buildChainEdges(nodes, seed, key) {
  const edges = [];
  for (let index = 0; index < Math.min(nodes.length - 1, 5); index += 1) {
    edges.push(
      createProposedEdge({
        id: `edge:${key}:chain:${index + 1}`,
        from: nodes[index].id,
        to: nodes[index + 1].id,
        seed,
        index: index + 1,
      }),
    );
  }
  return edges;
}

function getMockTemplates(mode, snippet) {
  if (mode === "decisions") {
    return [
      { type: "Decision", title: `Decision lane for: ${snippet}` },
      { type: "Decision", title: "Founder review cadence definition" },
      { type: "Requirement", title: "Decision confidence tracking fields" },
      { type: "Task", title: "Draft weekly council brief" },
      { type: "Task", title: "Review dependency impacts" },
      { type: "Risk", title: "Monitor drift before commit" },
    ];
  }

  if (mode === "business") {
    return [
      { type: "Project", title: `Business graph for: ${snippet}` },
      { type: "Requirement", title: "Maintain founder-confirmed commits" },
      { type: "Decision", title: "Adopt mock-first AI drafting" },
      { type: "Task", title: "Publish council status snapshots" },
      { type: "Metric", title: "Proposal throughput per week" },
      { type: "Risk", title: "Unreviewed proposal backlog" },
    ];
  }

  return [
    { type: "Requirement", title: `Requirements draft for: ${snippet}` },
    { type: "Requirement", title: "Founder-only commit at boundary" },
    { type: "Requirement", title: "Require exact CONFIRMED for commit" },
    { type: "Task", title: "Validate audit append-only integrity" },
    { type: "Task", title: "Verify archive-only deletion path" },
    { type: "Risk", title: "Detect unauthorized commit attempts" },
  ];
}

function getDeterministicMockBundle(mode, prompt) {
  const seed = toSeed(prompt, mode);
  const key = seedKey(seed);
  const snippet = promptSnippet(prompt);
  const templates = getMockTemplates(mode, snippet);

  const nodes = templates.map((template, index) =>
    createProposedNode({
      id: `${toIdPart(template.type)}:${key}:${index + 1}`,
      type: template.type,
      title: template.title,
      seed,
      index: index + 1,
      version: 1,
      owner: DEFAULT_OWNER,
      risk: template.risk || DEFAULT_RISK,
      parentId: null,
    }),
  );

  const edges = buildChainEdges(nodes, seed, key);
  return { nodes, edges };
}

function sanitizeAIBundle(bundle, mode, prompt) {
  const seed = toSeed(prompt, mode);
  const key = seedKey(seed);
  const fallback = getDeterministicMockBundle(mode, prompt);
  const sourceNodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
  const sourceEdges = Array.isArray(bundle?.edges) ? bundle.edges : [];

  const nodeIdsSeen = new Set();
  const nodes = sourceNodes.slice(0, 10).map((node, index) => {
    const baseId =
      coerceString(node?.id) ||
      `${toIdPart(node?.type || mode)}:${key}:ai:${index + 1}`;

    let id = baseId;
    let dedupeIndex = 2;
    while (nodeIdsSeen.has(id)) {
      id = `${baseId}:${dedupeIndex}`;
      dedupeIndex += 1;
    }
    nodeIdsSeen.add(id);

    return createProposedNode({
      id,
      type:
        coerceString(node?.type) ||
        (mode === "decisions"
          ? "Decision"
          : mode === "business"
            ? "Project"
            : "Requirement"),
      title:
        coerceString(node?.title) ||
        `AI Draft ${index + 1}: ${promptSnippet(prompt)}`,
      seed,
      index: index + 1,
      version: coerceNumber(node?.version, 1),
      owner: coerceString(node?.owner) || DEFAULT_OWNER,
      risk: coerceString(node?.risk) || DEFAULT_RISK,
      parentId: coerceString(node?.parentId) || null,
      createdAt: coerceString(node?.createdAt) || undefined,
    });
  });

  if (nodes.length === 0) {
    return fallback;
  }

  const validNodeIds = new Set(nodes.map((node) => node.id));
  const edgeIdsSeen = new Set();
  const edges = sourceEdges
    .slice(0, 10)
    .map((edge, index) => {
      const from = coerceString(edge?.from);
      const to = coerceString(edge?.to);
      if (!validNodeIds.has(from) || !validNodeIds.has(to)) {
        return null;
      }

      const baseId = coerceString(edge?.id) || `edge:${key}:ai:${index + 1}`;
      let id = baseId;
      let dedupeIndex = 2;
      while (edgeIdsSeen.has(id)) {
        id = `${baseId}:${dedupeIndex}`;
        dedupeIndex += 1;
      }
      edgeIdsSeen.add(id);

      return createProposedEdge({
        id,
        from,
        to,
        seed,
        index: index + 1,
        relationshipType: coerceString(edge?.relationshipType) || DEFAULT_RELATIONSHIP_TYPE,
        createdAt: coerceString(edge?.createdAt) || undefined,
      });
    })
    .filter(Boolean);

  return {
    nodes,
    edges: edges.length > 0 ? edges : buildChainEdges(nodes, seed, key),
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

  const prompt = normalizePrompt(body?.prompt);
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
      bundle: getDeterministicMockBundle(mode, prompt),
    });
  }

  try {
    const aiBundle = await generateAIBundle(prompt, mode);
    return NextResponse.json({
      ok: true,
      source: "ai",
      bundle: sanitizeAIBundle(aiBundle, mode, prompt),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      source: "mock",
      bundle: getDeterministicMockBundle(mode, prompt),
    });
  }
}
