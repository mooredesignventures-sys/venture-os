import crypto from "node:crypto";
import { NextResponse } from "next/server";

const ALLOWED_MODES = new Set(["requirements", "decisions", "business"]);
const ALLOWED_LEVELS = new Set(["baseline", "detailed"]);
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

function normalizeLevel(level) {
  const value = typeof level === "string" ? level.toLowerCase().trim() : "";
  return ALLOWED_LEVELS.has(value) ? value : "detailed";
}

function normalizeNonce(nonce) {
  if (typeof nonce !== "string") {
    return "";
  }
  return nonce.trim().slice(0, 120);
}

function toIdPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSeed(prompt, mode, level = "detailed", nonce = "") {
  const normalizedNonce = normalizeNonce(nonce);
  const normalizedLevel = normalizeLevel(level);
  const seedInput = normalizedNonce
    ? `${normalizePrompt(prompt)}|${mode}|${normalizedLevel}|${normalizedNonce}`
    : `${normalizePrompt(prompt)}|${mode}|${normalizedLevel}`;
  return crypto
    .createHash("sha256")
    .update(seedInput)
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

function getBaselineMockBundle(seed, key, snippet) {
  const conceptNode = createProposedNode({
    id: `concept:${key}:1`,
    type: "Concept",
    title: `Baseline Concept: ${snippet}`,
    seed,
    index: 1,
    version: 1,
    owner: DEFAULT_OWNER,
    risk: DEFAULT_RISK,
    parentId: null,
  });

  const requirementTitles = [
    `Core requirement set for: ${snippet}`,
    "Baseline requirement: founder-confirmed commit boundary",
    "Baseline requirement: archive-only lifecycle handling",
    "Baseline requirement: append-only audit consistency",
    "Baseline requirement: deterministic draft generation inputs",
    "Baseline requirement: requirements traceability by baseline",
  ];

  const requirementNodes = requirementTitles.map((title, index) =>
    createProposedNode({
      id: `requirement:${key}:${index + 1}`,
      type: "Requirement",
      title,
      seed,
      index: index + 2,
      version: 1,
      owner: DEFAULT_OWNER,
      risk: DEFAULT_RISK,
      parentId: conceptNode.id,
    }),
  );

  const edges = [
    ...requirementNodes.map((node, index) =>
      createProposedEdge({
        id: `edge:${key}:baseline:concept:${index + 1}`,
        from: conceptNode.id,
        to: node.id,
        seed,
        index: index + 1,
      }),
    ),
    ...buildChainEdges(requirementNodes, seed, `${key}:baseline`),
  ];

  return { nodes: [conceptNode, ...requirementNodes], edges };
}

function getDeterministicMockBundle(mode, prompt, level = "detailed", nonce = "") {
  const normalizedLevel = normalizeLevel(level);
  const seed = toSeed(prompt, mode, normalizedLevel, nonce);
  const key = seedKey(seed);
  const snippet = promptSnippet(prompt);

  if (mode === "requirements" && normalizedLevel === "baseline") {
    return getBaselineMockBundle(seed, key, snippet);
  }

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

function sanitizeAIBundle(bundle, mode, prompt, level = "detailed", nonce = "") {
  const normalizedLevel = normalizeLevel(level);
  const seed = toSeed(prompt, mode, normalizedLevel, nonce);
  const key = seedKey(seed);
  const fallback = getDeterministicMockBundle(mode, prompt, normalizedLevel, nonce);
  const sourceNodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
  const sourceEdges = Array.isArray(bundle?.edges) ? bundle.edges : [];
  const nonceApplied = Boolean(normalizeNonce(nonce));
  const remappedIds = new Map();

  if (mode === "requirements" && normalizedLevel === "baseline") {
    const aiTitles = sourceNodes
      .map((node) => coerceString(node?.title))
      .filter(Boolean);

    const conceptTitle = aiTitles[0] || `Baseline Concept: ${promptSnippet(prompt)}`;
    const conceptNode = createProposedNode({
      id: `concept:${key}:1`,
      type: "Concept",
      title: conceptTitle,
      seed,
      index: 1,
      version: 1,
      owner: DEFAULT_OWNER,
      risk: DEFAULT_RISK,
      parentId: null,
    });

    const fallbackTitles = [
      `Core requirement set for: ${promptSnippet(prompt)}`,
      "Baseline requirement: founder-confirmed commit boundary",
      "Baseline requirement: archive-only lifecycle handling",
      "Baseline requirement: append-only audit consistency",
      "Baseline requirement: deterministic draft generation inputs",
      "Baseline requirement: requirements traceability by baseline",
    ];

    const requirementTitles = [
      ...aiTitles.slice(1).map((title) => title.replace(/^Baseline Concept:\s*/i, "").trim()),
      ...fallbackTitles,
    ]
      .filter(Boolean)
      .slice(0, 8);

    while (requirementTitles.length < 5) {
      requirementTitles.push(`Baseline requirement ${requirementTitles.length + 1}`);
    }

    const requirementNodes = requirementTitles.map((title, index) =>
      createProposedNode({
        id: `requirement:${key}:baseline:${index + 1}`,
        type: "Requirement",
        title,
        seed,
        index: index + 2,
        version: 1,
        owner: DEFAULT_OWNER,
        risk: DEFAULT_RISK,
        parentId: conceptNode.id,
      }),
    );

    const edges = [
      ...requirementNodes.map((node, index) =>
        createProposedEdge({
          id: `edge:${key}:baseline:concept:${index + 1}`,
          from: conceptNode.id,
          to: node.id,
          seed,
          index: index + 1,
        }),
      ),
      ...buildChainEdges(requirementNodes, seed, `${key}:baseline:chain`),
    ];

    return { nodes: [conceptNode, ...requirementNodes], edges };
  }

  const nodeIdsSeen = new Set();
  const nodes = sourceNodes.slice(0, 10).map((node, index) => {
    const rawId = coerceString(node?.id);
    const baseId = nonceApplied
      ? rawId
        ? `${rawId}:${key}`
        : `${toIdPart(node?.type || mode)}:${key}:ai:${index + 1}`
      : rawId || `${toIdPart(node?.type || mode)}:${key}:ai:${index + 1}`;

    let id = baseId;
    let dedupeIndex = 2;
    while (nodeIdsSeen.has(id)) {
      id = `${baseId}:${dedupeIndex}`;
      dedupeIndex += 1;
    }
    nodeIdsSeen.add(id);
    if (rawId) {
      remappedIds.set(rawId, id);
    }

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
      const rawFrom = coerceString(edge?.from);
      const rawTo = coerceString(edge?.to);
      const from = nonceApplied ? remappedIds.get(rawFrom) || rawFrom : rawFrom;
      const to = nonceApplied ? remappedIds.get(rawTo) || rawTo : rawTo;
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

function withAiHeaders(payload, aiMode, fallbackReason = "", fallbackFromFailure = false) {
  const headers = {
    "X-AI-Mode": aiMode,
  };
  if (aiMode === "mock" && fallbackFromFailure && fallbackReason) {
    headers["X-AI-Fallback-Reason"] = fallbackReason;
  }
  return NextResponse.json(payload, { headers });
}

function classifyFallbackReason(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/status\s+\d+/i.test(message)) {
    return "openai_request_failed";
  }
  if (/json/i.test(message) || /content/i.test(message)) {
    return "openai_response_invalid";
  }
  return "openai_runtime_error";
}

async function generateAIBundle(prompt, mode, level = "detailed") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const systemPrompt = [
    "Return JSON only. No markdown, no prose.",
    "Return one of these shapes:",
    '{"bundle":{"nodes":[],"edges":[]}}',
    '{"nodes":[],"edges":[]}',
    "All nodes and edges must be proposed-only: stage='proposed', archived=false.",
    "All node statuses must be 'queued'.",
    "Generate a small bundle: 3-10 nodes and 3-10 edges.",
  ].join(" ");
  const userPrompt =
    level === "baseline"
      ? [
          `Mode: ${mode}`,
          "Level: baseline",
          `Prompt: ${prompt}`,
          "Generate exactly one Concept node and 5-8 Requirement nodes.",
          "Include edges from concept to requirements and a light requirement chain.",
        ].join("\n")
      : [
          `Mode: ${mode}`,
          `Prompt: ${prompt}`,
          "Generate 5-10 nodes and 5-10 edges.",
        ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_output_tokens: 900,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const data = await response.json().catch(() => null);
    if (!data || typeof data !== "object") {
      throw new Error("OpenAI response invalid");
    }

    const directBundle =
      data?.bundle && typeof data.bundle === "object"
        ? data.bundle
        : Array.isArray(data?.nodes) || Array.isArray(data?.edges)
          ? data
          : null;
    if (directBundle) {
      return directBundle;
    }

    const textChunks = [];
    const topLevelText = coerceString(data?.output_text);
    if (topLevelText) {
      textChunks.push(topLevelText);
    }

    const outputs = Array.isArray(data?.output) ? data.output : [];
    for (const outputItem of outputs) {
      if (!outputItem || typeof outputItem !== "object") {
        continue;
      }

      const itemText = coerceString(outputItem?.text);
      if (itemText) {
        textChunks.push(itemText);
      }

      const contentItems = Array.isArray(outputItem?.content) ? outputItem.content : [];
      for (const contentItem of contentItems) {
        if (!contentItem || typeof contentItem !== "object") {
          continue;
        }
        const contentText =
          coerceString(contentItem?.text) ||
          coerceString(contentItem?.output_text) ||
          coerceString(contentItem?.value);
        if (contentText) {
          textChunks.push(contentText);
        }
      }
    }

    const rawText = textChunks.join("\n").trim();
    if (!rawText) {
      throw new Error("OpenAI response invalid");
    }

    const tryParse = (value) => {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const parsed = tryParse(rawText);
    if (parsed && typeof parsed === "object") {
      if (parsed?.bundle && typeof parsed.bundle === "object") {
        return parsed.bundle;
      }
      if (Array.isArray(parsed?.nodes) || Array.isArray(parsed?.edges)) {
        return parsed;
      }
    }

    const jsonStart = rawText.indexOf("{");
    const jsonEnd = rawText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("OpenAI response invalid");
    }

    const sliced = tryParse(rawText.slice(jsonStart, jsonEnd + 1));
    if (!sliced || typeof sliced !== "object") {
      throw new Error("OpenAI response invalid");
    }
    if (sliced?.bundle && typeof sliced.bundle === "object") {
      return sliced.bundle;
    }
    if (Array.isArray(sliced?.nodes) || Array.isArray(sliced?.edges)) {
      return sliced;
    }
    throw new Error("OpenAI response invalid");
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
  const level = normalizeLevel(body?.level);
  const nonce = normalizeNonce(body?.nonce);

  if (process.env.VOS_FORCE_MOCK === "true") {
    return withAiHeaders(
      {
        ok: true,
        source: "mock",
        fallbackReason: "forced_mock",
        bundle: getDeterministicMockBundle(mode, prompt, level, nonce),
      },
      "mock",
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return withAiHeaders(
      {
        ok: true,
        source: "mock",
        fallbackReason: "missing_api_key",
        bundle: getDeterministicMockBundle(mode, prompt, level, nonce),
      },
      "mock",
    );
  }

  try {
    const aiBundle = await generateAIBundle(prompt, mode, level);
    if (!aiBundle) {
      return withAiHeaders(
        {
          ok: true,
          source: "mock",
          fallbackReason: "openai_response_invalid",
          bundle: getDeterministicMockBundle(mode, prompt, level, nonce),
        },
        "mock",
        "openai_response_invalid",
        true,
      );
    }
    return withAiHeaders(
      {
        ok: true,
        source: "ai",
        bundle: sanitizeAIBundle(aiBundle, mode, prompt, level, nonce),
      },
      "ai",
    );
  } catch (error) {
    const fallbackReason = classifyFallbackReason(error);
    return withAiHeaders(
      {
        ok: true,
        source: "mock",
        fallbackReason,
        bundle: getDeterministicMockBundle(mode, prompt, level, nonce),
      },
      "mock",
      fallbackReason,
      true,
    );
  }
}
