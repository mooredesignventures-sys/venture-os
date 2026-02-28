"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../../../src/components/ui/card";

const WIZARD_RUNS_STORAGE_KEY = "wizard_runs";
const RECRUITED_EXPERTS_STORAGE_KEY = "recruited_experts";
const BASELINE_SNAPSHOTS_STORAGE_KEY = "baseline_snapshots";
const DRAFT_NODE_STORAGE_KEY = "draft_nodes";
const DRAFT_EDGE_STORAGE_KEY = "draft_edges";
const COMMITTED_NODE_STORAGE_KEY = "committed_nodes";
const COMMITTED_EDGE_STORAGE_KEY = "committed_edges";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";
const MIN_STEP = 1;
const MAX_STEP = 7;
const COMMIT_CONFIRM_TEXT = "CONFIRMED";

const STEP_TITLES = {
  1: "Recruit Experts",
  2: "Brainstorm Q&A",
  3: "Baseline",
  4: "Basic Requirements",
  5: "Detailed Requirements",
  6: "Projects/Tasks",
  7: "Commit",
};

function renderAiModeBadge(source, fallbackReason) {
  const isLive = source === "ai";
  return (
    <div className="text-[11px]">
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 ${
          isLive
            ? "border-emerald-600/70 bg-emerald-900/30 text-emerald-200"
            : "border-amber-600/70 bg-amber-900/30 text-amber-100"
        }`}
      >
        {isLive ? "AI: LIVE" : "AI: FALLBACK (mock)"}
      </span>
      {!isLive && fallbackReason === "missing_api_key" ? (
        <div className="mt-1 text-amber-200">Set OPENAI_API_KEY to enable LIVE AI.</div>
      ) : null}
    </div>
  );
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

function writeStoredArray(key, value) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
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
    actor: "ai",
  };

  const key = resolveAuditStorageKey();
  const existing = loadStoredArray(key);
  window.localStorage.setItem(key, JSON.stringify([...existing, event]));
}

function toIdPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowIso() {
  return new Date().toISOString();
}

function graphKeys(storage) {
  return storage === "committed"
    ? { nodeKey: COMMITTED_NODE_STORAGE_KEY, edgeKey: COMMITTED_EDGE_STORAGE_KEY }
    : { nodeKey: DRAFT_NODE_STORAGE_KEY, edgeKey: DRAFT_EDGE_STORAGE_KEY };
}

function mergeGraph(storage, incomingNodes, incomingEdges) {
  const { nodeKey, edgeKey } = graphKeys(storage);
  const existingNodes = loadStoredArray(nodeKey);
  const existingEdges = loadStoredArray(edgeKey);
  const nodeIds = new Set(existingNodes.map((node) => node?.id).filter((id) => typeof id === "string"));
  const edgeIds = new Set(existingEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"));

  const nextNodes = [...existingNodes];
  const nextEdges = [...existingEdges];
  let addedNodes = 0;
  let addedEdges = 0;
  const addedNodeIds = [];
  const addedEdgeIds = [];
  const sampleTitles = [];

  for (const node of Array.isArray(incomingNodes) ? incomingNodes : []) {
    if (!node || typeof node.id !== "string" || nodeIds.has(node.id)) {
      continue;
    }
    nodeIds.add(node.id);
    nextNodes.push(node);
    addedNodes += 1;
    addedNodeIds.push(node.id);
    if (typeof node.title === "string" && node.title && sampleTitles.length < 5) {
      sampleTitles.push(node.title);
    }
  }

  for (const edge of Array.isArray(incomingEdges) ? incomingEdges : []) {
    if (
      !edge ||
      typeof edge.id !== "string" ||
      edgeIds.has(edge.id) ||
      typeof edge.from !== "string" ||
      typeof edge.to !== "string"
    ) {
      continue;
    }
    edgeIds.add(edge.id);
    nextEdges.push(edge);
    addedEdges += 1;
    addedEdgeIds.push(edge.id);
  }

  writeStoredArray(nodeKey, nextNodes);
  writeStoredArray(edgeKey, nextEdges);

  return {
    addedNodes,
    addedEdges,
    totalNodes: nextNodes.length,
    totalEdges: nextEdges.length,
    sampleTitles,
    storage,
    lastSaved: {
      nodeIds: addedNodeIds,
      edgeIds: addedEdgeIds,
    },
    lastSavedCounts: {
      nodes: addedNodes,
      edges: addedEdges,
    },
  };
}

function createNode({ id, type, title, parentId = null, risk = "medium" }) {
  return {
    id,
    type,
    title,
    stage: "proposed",
    status: "queued",
    version: 1,
    createdAt: nowIso(),
    createdBy: "ai",
    owner: "founder",
    risk,
    parentId,
    archived: false,
  };
}

function createEdge({ id, from, to, relationshipType = "relates_to" }) {
  return {
    id,
    from,
    to,
    relationshipType,
    stage: "proposed",
    createdAt: nowIso(),
    createdBy: "ai",
    archived: false,
  };
}

function fallbackExpertTitles(idea) {
  const lower = String(idea || "").toLowerCase();
  if (lower.includes("land") || lower.includes("registry") || lower.includes("property")) {
    return [
      "Land Registry Lawyer",
      "Property Data Engineer",
      "Title Risk Analyst",
      "Conveyancing Workflow Designer",
      "Planning Policy Specialist",
      "Investor Due Diligence Lead",
      "Governance Architect",
      "Revenue Operations Strategist",
    ];
  }

  return [
    "Domain Strategy Lead",
    "Governance Architect",
    "Risk Modeling Specialist",
    "Workflow Automation Engineer",
    "Data Integrity Analyst",
    "Market Operations Strategist",
    "Regulatory Compliance Advisor",
    "Revenue Systems Planner",
  ];
}

function deriveFocusAreas(idea, title) {
  const focus = [];
  const cleanedIdea = String(idea || "").trim();
  if (cleanedIdea) {
    focus.push(cleanedIdea.slice(0, 72));
  }
  const words = String(title || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  if (words) {
    focus.push(words);
  }
  return focus;
}

function mapExpertsFromBundle(nodes, idea, runId) {
  const aiTitles = (Array.isArray(nodes) ? nodes : [])
    .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
    .filter(Boolean);

  const all = [...aiTitles, ...fallbackExpertTitles(idea)];
  const unique = [];
  for (const title of all) {
    if (!unique.includes(title)) {
      unique.push(title);
    }
    if (unique.length >= 8) {
      break;
    }
  }
  while (unique.length < 6) {
    unique.push(`Council Expert ${unique.length + 1}`);
  }

  const runKey = toIdPart(runId).slice(0, 24) || "run";
  return unique.slice(0, 8).map((title, index) => ({
    ...createNode({
      id: `expert:${runKey}:${toIdPart(title) || `role-${index + 1}`}`,
      type: "Expert",
      title,
      parentId: null,
      risk: "medium",
    }),
    focusAreas: deriveFocusAreas(idea, title),
  }));
}

function mapQuestionsFromBundle(nodes, idea, experts) {
  const ai = (Array.isArray(nodes) ? nodes : [])
    .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  const fallback = [
    `What is the core outcome expected from "${idea}" within 90 days?`,
    "Which user segment is highest priority in phase one?",
    "What governance boundary must remain strict in this workflow?",
    `What key risk should ${(experts[0]?.title || "the lead expert")} monitor first?`,
    "What source of truth is mandatory before launch?",
    "What should never be automated in this flow?",
  ];

  const merged = [...ai, ...fallback].slice(0, 8);
  while (merged.length < 5) {
    merged.push(`Clarify priority #${merged.length + 1} for this idea.`);
  }

  return merged.map((text, index) => ({ questionId: `q:${index + 1}`, text }));
}

function summarizeAnswers(idea, experts, answers) {
  const lines = [];
  lines.push(`- Core idea focus: ${idea || "Untitled"}`);
  lines.push(`- Expert panel size: ${experts.length}`);
  const answerLines = answers
    .map((entry) => String(entry?.answer || "").trim())
    .filter(Boolean)
    .slice(0, 2);
  lines.push(
    answerLines.length
      ? `- Key answer highlights: ${answerLines.join(" | ")}`
      : "- Key answer highlights: pending clarifications",
  );
  const expertNames = experts.slice(0, 2).map((expert) => expert.title).filter(Boolean);
  lines.push(`- Expert anchors: ${expertNames.length ? expertNames.join(", ") : "none"}`);
  lines.push("- Governance boundary: proposed-only workflow with append-only audit.");
  return lines.slice(0, 5).join("\n");
}

function createRun() {
  const createdAt = nowIso();
  return {
    id: `wizard:${Date.now()}`,
    createdAt,
    stage: "in_progress",
    currentStep: 1,
    idea: "",
    experts: [],
    questions: [],
    answers: [],
    brainstormSummary: "",
    baseline: null,
    basicRequirementsPreview: null,
    detailedRequirementsPreview: null,
    projectPreview: null,
    lastSaved: { nodeIds: [], edgeIds: [] },
    lastSavedStep: null,
    lastSavedAt: null,
    lastSavedStorage: "draft",
    savedAt: null,
    graphSaveStatus: {},
    history: [{ id: `hist:${Date.now()}:created`, createdAt, step: 1, action: "WIZARD_RUN_CREATED" }],
  };
}

function withHistory(run, patch) {
  if (!patch) {
    return run;
  }
  return {
    ...run,
    history: [
      ...(Array.isArray(run.history) ? run.history : []),
      {
        id: `hist:${Date.now()}:${patch.action || "update"}`,
        createdAt: nowIso(),
        ...patch,
      },
    ],
  };
}

function resolveMiniMapData(status, run) {
  if (!run || run.lastSavedStep !== status?.step) {
    return { nodes: [], edges: [], highlightIds: [] };
  }

  const sourceLastSaved = run.lastSaved;
  const sourceNodeIds = Array.isArray(sourceLastSaved?.nodeIds) ? sourceLastSaved.nodeIds : [];
  const sourceEdgeIds = Array.isArray(sourceLastSaved?.edgeIds) ? sourceLastSaved.edgeIds : [];

  if (!sourceNodeIds.length && !sourceEdgeIds.length) {
    return { nodes: [], edges: [], highlightIds: [] };
  }

  const storage = run.lastSavedStorage || status?.storage || "draft";
  const { nodeKey, edgeKey } = graphKeys(storage);
  const allNodes = loadStoredArray(nodeKey);
  const allEdges = loadStoredArray(edgeKey);
  const nodeById = new Map(
    allNodes
      .filter((node) => node && typeof node.id === "string")
      .map((node) => [node.id, node]),
  );

  const highlightIds = [...sourceNodeIds];
  const selectedNodeIds = new Set(highlightIds);
  const selectedEdgeIds = new Set(sourceEdgeIds);

  for (const nodeId of highlightIds) {
    const node = nodeById.get(nodeId);
    if (node && typeof node.parentId === "string" && node.parentId) {
      selectedNodeIds.add(node.parentId);
    }
  }

  const edges = allEdges.filter((edge) => {
    if (!edge || typeof edge.from !== "string" || typeof edge.to !== "string") {
      return false;
    }
    if (selectedEdgeIds.has(edge.id)) {
      selectedNodeIds.add(edge.from);
      selectedNodeIds.add(edge.to);
      return true;
    }
    return selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to);
  });

  const nodes = [...selectedNodeIds]
    .sort()
    .map((id) => nodeById.get(id))
    .filter(Boolean);

  return { nodes, edges, highlightIds };
}

function MiniMapReadOnly({ run, status }) {
  const { nodes, edges, highlightIds } = resolveMiniMapData(status, run);
  const highlightSet = new Set(highlightIds);

  if (!nodes.length) {
    return (
      <div className="rounded-lg border border-slate-700/70 bg-neutral-900/50 p-2 text-xs text-slate-400">
        Save to Graph to preview.
      </div>
    );
  }

  const width = 760;
  const height = 280;
  const padX = 80;
  const padY = 48;
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const xStep = cols > 1 ? (width - padX * 2) / (cols - 1) : 0;
  const yStep = rows > 1 ? (height - padY * 2) / (rows - 1) : 0;

  const posById = new Map();
  nodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = cols > 1 ? padX + col * xStep : width / 2;
    const y = rows > 1 ? padY + row * yStep : height / 2;
    posById.set(node.id, { x, y });
  });

  return (
    <div className="rounded-lg border border-slate-700/70 bg-neutral-900/50 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
        {edges.map((edge, index) => {
          const from = posById.get(edge.from);
          const to = posById.get(edge.to);
          if (!from || !to) {
            return null;
          }
          return (
            <line
              key={`${edge.id || "edge"}-${index}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="rgba(148, 163, 184, 0.55)"
              strokeWidth="1.5"
            />
          );
        })}

        {nodes.map((node, index) => {
          const pos = posById.get(node.id);
          if (!pos) {
            return null;
          }
          const highlighted = highlightSet.has(node.id);
          return (
            <g key={`${node.id}-${index}`}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r="14"
                fill={highlighted ? "rgba(239, 68, 68, 0.25)" : "rgba(30, 41, 59, 0.9)"}
                stroke={highlighted ? "rgba(251, 191, 36, 0.95)" : "rgba(148, 163, 184, 0.65)"}
                strokeWidth={highlighted ? "2.4" : "1.2"}
              />
              <text
                x={pos.x}
                y={pos.y + 24}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e2e8f0"
                fontSize="10"
              >
                {String(node.title || node.id).slice(0, 14)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
export default function WizardClient() {
  const [run, setRun] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingRun, setLoadingRun] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recruitLoading, setRecruitLoading] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [basicLoading, setBasicLoading] = useState(false);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [openMiniMapStep, setOpenMiniMapStep] = useState(null);

  function persistRun(nextRun, historyPatch) {
    if (!nextRun) {
      return;
    }
    const withPatch = withHistory(nextRun, historyPatch);
    const runs = loadStoredArray(WIZARD_RUNS_STORAGE_KEY);
    const idx = runs.findIndex((item) => item?.id === withPatch.id);
    const nextRuns = idx >= 0 ? runs.map((item, i) => (i === idx ? withPatch : item)) : [...runs, withPatch];
    writeStoredArray(WIZARD_RUNS_STORAGE_KEY, nextRuns);
    setRun(withPatch);
  }

  function updateRun(patch, historyPatch) {
    if (!run) {
      return;
    }
    persistRun({ ...run, ...patch }, historyPatch);
  }

  function setStepSaved(step, status, auditType, runPatch = null) {
    if (!run) {
      return;
    }
    const lastSavedAt = nowIso();
    const lastSaved = {
      nodeIds: Array.isArray(status?.lastSaved?.nodeIds) ? status.lastSaved.nodeIds : [],
      edgeIds: Array.isArray(status?.lastSaved?.edgeIds) ? status.lastSaved.edgeIds : [],
    };
    const lastSavedCounts = {
      nodes:
        status?.lastSavedCounts?.nodes ??
        (Array.isArray(lastSaved.nodeIds) ? lastSaved.nodeIds.length : 0),
      edges:
        status?.lastSavedCounts?.edges ??
        (Array.isArray(lastSaved.edgeIds) ? lastSaved.edgeIds.length : 0),
    };
    const graphSaveStatus = {
      ...(run.graphSaveStatus || {}),
      [step]: {
        saved: true,
        savedAt: lastSavedAt,
        lastSavedAt,
        step,
        lastSaved,
        lastSavedCounts,
        ...status,
      },
    };

    const next = {
      ...run,
      ...(runPatch || {}),
      graphSaveStatus,
      lastSaved,
      lastSavedStep: step,
      lastSavedAt,
      lastSavedStorage: status?.storage || "draft",
      savedAt: lastSavedAt,
    };
    persistRun(next, { step, action: auditType });
    appendAuditEvent(auditType, {
      wizardRunId: run.id,
      ...status,
      lastSavedCounts,
      lastSavedAt,
      savedAt: lastSavedAt,
    });
    setNotice(`Saved for Step ${step}: ${STEP_TITLES[step]}`);
    setError("");
  }

  function loadOrCreateRun() {
    const runs = loadStoredArray(WIZARD_RUNS_STORAGE_KEY);
    const active = [...runs].reverse().find((item) => item?.stage === "in_progress");
    if (active) {
      const normalized = {
        ...active,
        lastSaved:
          active?.lastSaved && Array.isArray(active.lastSaved.nodeIds) && Array.isArray(active.lastSaved.edgeIds)
            ? active.lastSaved
            : { nodeIds: [], edgeIds: [] },
        lastSavedStep: typeof active?.lastSavedStep === "number" ? active.lastSavedStep : null,
        lastSavedAt:
          typeof active?.lastSavedAt === "string"
            ? active.lastSavedAt
            : typeof active?.savedAt === "string"
              ? active.savedAt
              : null,
      };
      if (
        normalized.lastSaved !== active.lastSaved ||
        normalized.lastSavedStep !== active.lastSavedStep ||
        normalized.lastSavedAt !== active.lastSavedAt
      ) {
        const idx = runs.findIndex((item) => item?.id === active.id);
        if (idx >= 0) {
          const nextRuns = runs.map((item, index) => (index === idx ? normalized : item));
          writeStoredArray(WIZARD_RUNS_STORAGE_KEY, nextRuns);
        }
      }
      return normalized;
    }
    const created = createRun();
    writeStoredArray(WIZARD_RUNS_STORAGE_KEY, [...runs, created]);
    return created;
  }

  useEffect(() => {
    const active = loadOrCreateRun();
    setRun(active);
    setLoadingRun(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onEsc(event) {
      if (event.key !== "Escape") {
        return;
      }
      const hasProgress = Boolean(run && (run.currentStep > 1 || (run.idea || "").trim()));
      if (hasProgress && !window.confirm("Close wizard and keep progress saved?")) {
        return;
      }
      setIsOpen(false);
    }

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [isOpen, run]);

  useEffect(() => {
    if (!run || run.currentStep !== 2 || !run.questions?.length) {
      setAnswerInput("");
      return;
    }
    const question = run.questions[questionIndex];
    const existing = (run.answers || []).find((item) => item.questionId === question?.questionId);
    setAnswerInput(existing?.answer || "");
  }, [run, questionIndex]);

  useEffect(() => {
    if (!run || typeof run.lastSavedStep !== "number") {
      return;
    }
    setOpenMiniMapStep(run.lastSavedStep);
  }, [run?.lastSavedStep, run?.lastSavedAt]);

  const canProceed = useMemo(() => {
    if (!run) {
      return false;
    }
    return Boolean(run.graphSaveStatus?.[run.currentStep]?.saved);
  }, [run]);

  if (loadingRun || !run) {
    return (
      <Card title="Wizard Launcher">
        <p>Loading wizard...</p>
      </Card>
    );
  }

  async function requestDraftBundle(body) {
    const response = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.ok || !data?.bundle) {
      throw new Error(data?.error || "Draft generation failed.");
    }
    const headerMode = response.headers.get("X-AI-Mode");
    const source = headerMode === "ai" ? "ai" : (data.source || "mock");
    const fallbackReason = typeof data?.fallbackReason === "string" ? data.fallbackReason : "";
    return {
      ...data,
      source,
      fallbackReason,
    };
  }

  async function handleRecruitExperts() {
    const idea = String(run.idea || "").trim();
    if (!idea) {
      setError("Enter a high-level idea first.");
      return;
    }

    setError("");
    setNotice("");
    setRecruitLoading(true);
    try {
      const data = await requestDraftBundle({
        mode: "business",
        prompt: `${idea}\nGenerate 6-8 experts with focus areas.`,
      });
      const experts = mapExpertsFromBundle(data.bundle.nodes, idea, run.id);
      persistRun(
        { ...run, experts },
        { step: 1, action: "AI_EXPERTS_GENERATED", expertCount: experts.length },
      );
      appendAuditEvent("AI_EXPERTS_GENERATED", {
        wizardRunId: run.id,
        idea,
        expertCount: experts.length,
      });
      setNotice(`Generated ${experts.length} experts (source=${data.source || "mock"}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to recruit experts.");
    } finally {
      setRecruitLoading(false);
    }
  }

  function handleSaveExperts() {
    if (!run.experts?.length) {
      setError("Generate experts before saving.");
      return;
    }

    const existing = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY);
    const existingIds = new Set(existing.map((item) => item?.id).filter(Boolean));
    const additions = run.experts.filter((expert) => !existingIds.has(expert.id));
    const nextExperts = [...existing, ...additions];
    writeStoredArray(RECRUITED_EXPERTS_STORAGE_KEY, nextExperts);
    const merged = mergeGraph("draft", additions, []);

    setStepSaved(1, {
      ...merged,
      storage: "draft",
      expertsSavedCount: additions.length,
      totalExperts: nextExperts.length,
      sampleTitles: additions.slice(0, 5).map((item) => item.title),
    }, "WIZARD_EXPERTS_SAVED");
  }

  function saveCurrentAnswerToRun() {
    if (!run.questions?.length) {
      return run;
    }
    const question = run.questions[questionIndex];
    if (!question) {
      return run;
    }
    const answers = [...(run.answers || [])];
    const idx = answers.findIndex((item) => item.questionId === question.questionId);
    if (idx >= 0) {
      answers[idx] = { questionId: question.questionId, answer: answerInput.trim() };
    } else {
      answers.push({ questionId: question.questionId, answer: answerInput.trim() });
    }
    return { ...run, answers };
  }

  async function handleGenerateQuestions() {
    setQaLoading(true);
    setError("");
    setNotice("");
    try {
      const idea = run.idea || "Untitled idea";
      const expertText = (run.experts || []).map((item) => item.title).join(", ");
      const data = await requestDraftBundle({
        mode: "business",
        prompt: [
          `Idea: ${idea}`,
          expertText ? `Experts: ${expertText}` : "Experts: none",
          "Generate 5-8 clarifying questions.",
        ].join("\n\n"),
      });
      const questions = mapQuestionsFromBundle(data.bundle.nodes, idea, run.experts || []);
      persistRun(
        { ...run, questions, answers: [] },
        { step: 2, action: "AI_QUESTIONS_GENERATED", questionCount: questions.length },
      );
      appendAuditEvent("AI_QUESTIONS_GENERATED", {
        wizardRunId: run.id,
        questionCount: questions.length,
      });
      setQuestionIndex(0);
      setAnswerInput("");
      setNotice(`Generated ${questions.length} clarifying questions.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate questions.");
    } finally {
      setQaLoading(false);
    }
  }

  async function handleFinishBrainstorm() {
    if (!run.questions?.length) {
      setError("Generate questions first.");
      return;
    }

    setQaLoading(true);
    setError("");
    setNotice("");
    try {
      const answeredRun = saveCurrentAnswerToRun();
      const qaLines = (answeredRun.questions || []).map((question) => {
        const found = (answeredRun.answers || []).find((answer) => answer.questionId === question.questionId);
        return `Q: ${question.text}\nA: ${found?.answer || "(no answer)"}`;
      });

      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: [
          `Idea: ${answeredRun.idea || "Untitled"}`,
          "Create a concise 5-line brainstorm summary.",
          qaLines.join("\n\n"),
        ].join("\n\n"),
      });

      const summaryLines = (Array.isArray(data.bundle?.nodes) ? data.bundle.nodes : [])
        .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
        .map((line) => `- ${line}`);
      const summary = summaryLines.length
        ? summaryLines.join("\n")
        : summarizeAnswers(answeredRun.idea, answeredRun.experts || [], answeredRun.answers || []);

      persistRun(
        { ...answeredRun, brainstormSummary: summary },
        { step: 2, action: "BRAINSTORM_SUMMARY_CREATED", summaryLength: summary.length },
      );
      appendAuditEvent("BRAINSTORM_SUMMARY_CREATED", {
        wizardRunId: run.id,
        summaryLength: summary.length,
      });
      setNotice("Brainstorm summary prepared. Save to graph to continue.");
    } catch {
      const fallback = summarizeAnswers(run.idea, run.experts || [], run.answers || []);
      persistRun(
        { ...saveCurrentAnswerToRun(), brainstormSummary: fallback },
        { step: 2, action: "BRAINSTORM_SUMMARY_CREATED", summaryLength: fallback.length },
      );
      appendAuditEvent("BRAINSTORM_SUMMARY_CREATED", {
        wizardRunId: run.id,
        summaryLength: fallback.length,
      });
      setNotice("Summary fallback generated. Save to graph to continue.");
    } finally {
      setQaLoading(false);
    }
  }
  function handleSaveBrainstormToDraft() {
    if (!run.brainstormSummary) {
      setError("Finish brainstorm to create summary first.");
      return;
    }

    const conceptId = `wiz:summary:${toIdPart(run.id)}:${Date.now()}`;
    const concept = createNode({ id: conceptId, type: "Concept", title: "Brainstorm Summary" });
    const lines = run.brainstormSummary
      .split("\n")
      .map((line) => line.replace(/^-\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 4);

    const supportNodes = lines.map((line, index) =>
      createNode({
        id: `wiz:summary-item:${toIdPart(run.id)}:${Date.now()}:${index + 1}`,
        type: index % 2 === 0 ? "Requirement" : "Task",
        title: line,
        parentId: conceptId,
      }),
    );

    const edges = supportNodes.map((node, index) =>
      createEdge({ id: `wiz:summary-edge:${toIdPart(run.id)}:${Date.now()}:${index + 1}`, from: conceptId, to: node.id }),
    );

    const merged = mergeGraph("draft", [concept, ...supportNodes], edges);
    setStepSaved(2, merged, "WIZARD_BRAINSTORM_SAVED");
  }

  async function handleGenerateBaseline(revise = false) {
    if (!run.idea.trim()) {
      setError("Idea is required before baseline generation.");
      return;
    }

    setBaselineLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: [
          `Idea: ${run.idea}`,
          `Experts: ${(run.experts || []).map((item) => item.title).join(", ") || "none"}`,
          `Summary:\n${run.brainstormSummary || "No summary yet."}`,
          revise ? "Revise baseline." : "Generate baseline.",
        ].join("\n\n"),
      });

      const version = revise && run.baseline ? Number(run.baseline.version || 1) + 1 : 1;
      const titles = (Array.isArray(data.bundle?.nodes) ? data.bundle.nodes : [])
        .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
        .filter(Boolean)
        .slice(0, 6);

      const nextBaseline = {
        id: `wiz:baseline:${toIdPart(run.id)}:v${version}:${Date.now()}`,
        title: titles[0] || `Baseline Concept: ${run.idea.slice(0, 48)}`,
        summary: run.brainstormSummary || summarizeAnswers(run.idea, run.experts || [], run.answers || []),
        constraints: titles.slice(1, 4).length ? titles.slice(1, 4) : ["Keep governance boundaries explicit."],
        nonGoals: titles.slice(4, 6).length ? titles.slice(4, 6) : ["No automatic commit in wizard flow."],
        version,
        createdAt: nowIso(),
        archived: false,
      };

      const archivedPrevious = run.baseline
        ? [{ ...run.baseline, archived: true }].concat(Array.isArray(run.baselineHistory) ? run.baselineHistory : [])
        : (Array.isArray(run.baselineHistory) ? run.baselineHistory : []);

      persistRun(
        { ...run, baseline: nextBaseline, baselineHistory: archivedPrevious },
        { step: 3, action: revise ? "BASELINE_REVISED" : "BASELINE_GENERATED", baselineVersion: version },
      );
      appendAuditEvent("BASELINE_GENERATED", { wizardRunId: run.id, baselineVersion: version });
      setNotice(`Baseline ${revise ? "revised" : "generated"}. Save to graph to continue.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate baseline.");
    } finally {
      setBaselineLoading(false);
    }
  }

  function handleSaveBaseline() {
    if (!run.baseline) {
      setError("Generate baseline first.");
      return;
    }

    const baselineSnapshot = {
      id: run.baseline.id,
      type: "Baseline",
      title: run.baseline.title,
      stage: "proposed",
      status: "queued",
      version: run.baseline.version || 1,
      createdAt: run.baseline.createdAt || nowIso(),
      createdBy: "ai",
      owner: "founder",
      risk: "medium",
      parentId: null,
      archived: false,
      idea: run.idea || "Untitled baseline",
      experts: (run.experts || []).map((expert) => ({
        id: expert.id,
        title: expert.title,
        focusAreas: Array.isArray(expert.focusAreas) ? expert.focusAreas : [],
      })),
      brainstormSummary: run.baseline.summary,
      gravitySnapshot: {
        questionCount: Array.isArray(run.questions) ? run.questions.length : 0,
        answerCount: Array.isArray(run.answers) ? run.answers.length : 0,
      },
    };

    const existingSnapshots = loadStoredArray(BASELINE_SNAPSHOTS_STORAGE_KEY);
    writeStoredArray(BASELINE_SNAPSHOTS_STORAGE_KEY, [...existingSnapshots, baselineSnapshot]);

    const baselineNode = createNode({
      id: `wiz:baseline-node:${toIdPart(run.id)}:${Date.now()}`,
      type: "Concept",
      title: `Baseline Concept: ${run.baseline.title}`,
    });

    const merged = mergeGraph("draft", [baselineNode], []);
    setStepSaved(3, {
      ...merged,
      baselineSaved: true,
      baselineId: run.baseline.id,
    }, "WIZARD_BASELINE_SAVED");
  }

  function buildRequirementPreview(nodes, runId, prefix, countMin = 5, countMax = 10) {
    const titles = (Array.isArray(nodes) ? nodes : [])
      .filter((node) => node?.type === "Requirement")
      .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
      .filter(Boolean)
      .slice(0, countMax);

    while (titles.length < countMin) {
      titles.push(`${prefix} requirement ${titles.length + 1}`);
    }

    return titles.slice(0, countMax).map((title, index) =>
      createNode({
        id: `wiz:${prefix}:req:${toIdPart(runId)}:${Date.now()}:${index + 1}`,
        type: "Requirement",
        title,
      }),
    );
  }

  function createChainEdges(nodes, runId, prefix) {
    const edges = [];
    for (let i = 0; i < nodes.length - 1; i += 1) {
      edges.push(
        createEdge({
          id: `wiz:${prefix}:edge:${toIdPart(runId)}:${Date.now()}:${i + 1}`,
          from: nodes[i].id,
          to: nodes[i + 1].id,
          relationshipType: "relates_to",
        }),
      );
    }
    return edges;
  }

  async function handleGenerateBasicRequirements() {
    if (!run.baseline) {
      setError("Save baseline first.");
      return;
    }

    setBasicLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: [
          `Baseline: ${run.baseline.title}`,
          `Summary:\n${run.baseline.summary}`,
          `Constraints:\n${(run.baseline.constraints || []).join(" | ")}`,
          "Generate 5-10 basic requirements.",
        ].join("\n\n"),
      });
      const nodes = buildRequirementPreview(data.bundle.nodes, run.id, "basic");
      const edges = createChainEdges(nodes, run.id, "basic");
      persistRun(
        {
          ...run,
          basicRequirementsPreview: {
            source: data.source || "mock",
            fallbackReason: data.fallbackReason || "",
            nodes,
            edges,
          },
        },
        { step: 4, action: "BASIC_REQUIREMENTS_GENERATED", nodeCount: nodes.length },
      );
      setNotice(`Basic requirements preview ready (${nodes.length}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate basic requirements.");
    } finally {
      setBasicLoading(false);
    }
  }

  function handleSaveBasicRequirements() {
    if (!run.basicRequirementsPreview?.nodes?.length) {
      setError("Generate basic requirements first.");
      return;
    }

    const merged = mergeGraph(
      "draft",
      run.basicRequirementsPreview.nodes,
      run.basicRequirementsPreview.edges || [],
    );
    setStepSaved(4, merged, "WIZARD_BASIC_REQS_SAVED");
  }
  async function handleGenerateDetailedRequirements() {
    const sourceNodes = run.basicRequirementsPreview?.nodes || [];
    if (!sourceNodes.length) {
      setError("Save basic requirements before generating detailed set.");
      return;
    }

    setDetailedLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "detailed",
        prompt: [
          "Expand these requirements with more detail:",
          sourceNodes.slice(0, 6).map((node) => `- ${node.title}`).join("\n"),
        ].join("\n\n"),
      });
      const nodes = buildRequirementPreview(data.bundle.nodes, run.id, "detailed", 5, 10);
      const edges = createChainEdges(nodes, run.id, "detailed");
      persistRun(
        {
          ...run,
          detailedRequirementsPreview: {
            source: data.source || "mock",
            fallbackReason: data.fallbackReason || "",
            nodes,
            edges,
          },
        },
        { step: 5, action: "DETAILED_REQUIREMENTS_GENERATED", nodeCount: nodes.length },
      );
      setNotice(`Detailed requirements preview ready (${nodes.length}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate detailed requirements.");
    } finally {
      setDetailedLoading(false);
    }
  }

  function handleSaveDetailedRequirements() {
    if (!run.detailedRequirementsPreview?.nodes?.length) {
      setError("Generate detailed requirements first.");
      return;
    }

    const merged = mergeGraph(
      "draft",
      run.detailedRequirementsPreview.nodes,
      run.detailedRequirementsPreview.edges || [],
    );
    setStepSaved(5, merged, "WIZARD_DETAILED_REQS_SAVED");
  }

  async function handleGenerateProjects() {
    const sourceNodes = run.detailedRequirementsPreview?.nodes || run.basicRequirementsPreview?.nodes || [];
    if (!sourceNodes.length) {
      setError("Save requirements before generating projects/tasks.");
      return;
    }

    setProjectsLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await requestDraftBundle({
        mode: "business",
        level: "detailed",
        prompt: [
          "Generate 3-6 child Project/Task proposals for these requirements:",
          sourceNodes.slice(0, 6).map((node) => `- ${node.title}`).join("\n"),
        ].join("\n\n"),
      });

      const raw = Array.isArray(data.bundle?.nodes) ? data.bundle.nodes : [];
      const parentRequirement = sourceNodes[0];
      const parentId = parentRequirement?.id || null;
      const mappedNodes = raw
        .map((node, index) => {
          const type = node?.type === "Project" || node?.type === "Task"
            ? node.type
            : index % 2 === 0
              ? "Project"
              : "Task";
          const title = typeof node?.title === "string" && node.title.trim()
            ? node.title.trim()
            : `${type} proposal ${index + 1}`;
          return createNode({
            id: `wiz:project:${toIdPart(run.id)}:${Date.now()}:${index + 1}`,
            type,
            title,
            parentId,
          });
        })
        .slice(0, 6);

      const edges = mappedNodes.map((node, index) =>
        createEdge({
          id: `wiz:project-edge:${toIdPart(run.id)}:${Date.now()}:${index + 1}`,
          from: node.id,
          to: parentId || sourceNodes[0]?.id,
          relationshipType: "relates_to",
        }),
      );

      persistRun(
        {
          ...run,
          projectPreview: {
            source: data.source || "mock",
            fallbackReason: data.fallbackReason || "",
            nodes: mappedNodes,
            edges,
          },
        },
        { step: 6, action: "PROJECTS_GENERATED", nodeCount: mappedNodes.length },
      );
      setNotice(`Project/task preview ready (${mappedNodes.length}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate projects/tasks.");
    } finally {
      setProjectsLoading(false);
    }
  }

  function handleSaveProjects() {
    if (!run.projectPreview?.nodes?.length) {
      setError("Generate project/task proposals first.");
      return;
    }

    const merged = mergeGraph("draft", run.projectPreview.nodes, run.projectPreview.edges || []);
    setStepSaved(6, merged, "WIZARD_PROJECTS_SAVED");
  }

  function handleCommit() {
    if (confirmText !== COMMIT_CONFIRM_TEXT) {
      setError("Type CONFIRMED exactly to commit.");
      return;
    }

    setCommitLoading(true);
    setError("");
    setNotice("");

    try {
      const draftNodes = loadStoredArray(DRAFT_NODE_STORAGE_KEY);
      const draftEdges = loadStoredArray(DRAFT_EDGE_STORAGE_KEY);
      const committedNodes = loadStoredArray(COMMITTED_NODE_STORAGE_KEY);
      const committedEdges = loadStoredArray(COMMITTED_EDGE_STORAGE_KEY);

      const proposedRequirements = draftNodes.filter((node) => {
        const stage = typeof node?.stage === "string" ? node.stage.toLowerCase() : "";
        return node?.type === "Requirement" && stage === "proposed" && node?.archived !== true;
      });

      if (proposedRequirements.length === 0) {
        setError("No proposed requirements found to commit.");
        setCommitLoading(false);
        return;
      }

      const proposedIds = new Set(proposedRequirements.map((node) => node.id));

      let archivedProposedCount = 0;
      const nextDraftNodes = draftNodes.map((node) => {
        if (!proposedIds.has(node?.id)) {
          return node;
        }
        archivedProposedCount += 1;
        return { ...node, stage: "archived", archived: true };
      });

      const committedNodeIds = new Set(
        committedNodes.map((node) => node?.id).filter((id) => typeof id === "string"),
      );
      const committedAdds = proposedRequirements
        .filter((node) => !committedNodeIds.has(node.id))
        .map((node) => ({ ...node, stage: "committed", archived: false }));
      const nextCommittedNodes = [...committedNodes, ...committedAdds];

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
        return { ...edge, stage: "archived", archived: true };
      });

      const committedEdgeIds = new Set(
        committedEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
      );
      const committedEdgeAdds = relatedEdges
        .filter((edge) => edge?.id && !committedEdgeIds.has(edge.id))
        .map((edge) => ({ ...edge, stage: "committed", archived: false }));
      const nextCommittedEdges = [...committedEdges, ...committedEdgeAdds];

      writeStoredArray(DRAFT_NODE_STORAGE_KEY, nextDraftNodes);
      writeStoredArray(DRAFT_EDGE_STORAGE_KEY, nextDraftEdges);
      writeStoredArray(COMMITTED_NODE_STORAGE_KEY, nextCommittedNodes);
      writeStoredArray(COMMITTED_EDGE_STORAGE_KEY, nextCommittedEdges);

      setStepSaved(
        7,
        {
          storage: "committed",
          addedNodes: committedAdds.length,
          addedEdges: committedEdgeAdds.length,
          committedRequirementCount: committedAdds.length,
          committedEdgeCount: committedEdgeAdds.length,
          archivedProposedCount,
          archivedEdgeCount,
          totalNodes: nextCommittedNodes.length,
          totalEdges: nextCommittedEdges.length,
          sampleTitles: committedAdds.slice(0, 5).map((node) => node.title),
          lastSaved: {
            nodeIds: committedAdds.map((node) => node.id),
            edgeIds: committedEdgeAdds.map((edge) => edge.id),
          },
          lastSavedCounts: {
            nodes: committedAdds.length,
            edges: committedEdgeAdds.length,
          },
        },
        "WIZARD_COMMITTED",
        { stage: "complete" },
      );
      setConfirmText("");
    } finally {
      setCommitLoading(false);
    }
  }

  function handleBack() {
    if (!run || run.currentStep <= MIN_STEP) {
      return;
    }
    updateRun({ currentStep: run.currentStep - 1 }, { step: run.currentStep, action: "STEP_BACK" });
    setError("");
    setNotice("");
  }

  function handleNext() {
    if (!run || run.currentStep >= MAX_STEP) {
      return;
    }
    if (!canProceed) {
      return;
    }
    updateRun({ currentStep: run.currentStep + 1 }, { step: run.currentStep, action: "STEP_NEXT" });
    setError("");
    setNotice("");
  }

  function renderSaveStatus(step) {
    const status = run.graphSaveStatus?.[step];
    const statusWithStep = status ? { ...status, step } : { step };
    const isSaved = Boolean(status?.saved);

    return (
      <div
        className={`mt-3 rounded-lg border p-3 text-xs ${
          isSaved
            ? "border-emerald-700/60 bg-emerald-900/20 text-emerald-100"
            : "border-amber-800/60 bg-amber-950/25 text-amber-100"
        }`}
      >
        <div>Saved to Graph: {isSaved ? "Saved \u2713" : "pending"}</div>
        <div>storage={status?.storage || (step === 7 ? "committed" : "draft")}</div>
        <div>lastSavedAt={status?.lastSavedAt || run.lastSavedAt || "-"}</div>
        <div>
          addedNodes={status?.addedNodes ?? 0}, addedEdges={status?.addedEdges ?? 0}, totalNodes=
          {status?.totalNodes ?? 0}, totalEdges={status?.totalEdges ?? 0}
        </div>
        {typeof status?.expertsSavedCount === "number" ? (
          <div>expertsSavedCount={status.expertsSavedCount}, totalExperts={status.totalExperts ?? 0}</div>
        ) : null}
        {typeof status?.committedRequirementCount === "number" ? (
          <div>
            committedRequirementCount={status.committedRequirementCount}, committedEdgeCount=
            {status.committedEdgeCount ?? 0}, archivedProposedCount={status.archivedProposedCount ?? 0}
          </div>
        ) : null}
        {Array.isArray(status?.sampleTitles) && status.sampleTitles.length > 0 ? (
          <ul className="mt-2 list-disc pl-5">
            {status.sampleTitles.map((title, index) => (
              <li key={`${title}-${index}`}>{title}</li>
            ))}
          </ul>
        ) : null}

        <details
          className="mt-2"
          open={openMiniMapStep === step}
          onToggle={(event) => {
            setOpenMiniMapStep(event.currentTarget.open ? step : null);
          }}
        >
          <summary className="cursor-pointer text-slate-100">Mini Map (read-only)</summary>
          <div className="mt-2">
            <MiniMapReadOnly run={run} status={statusWithStep} />
          </div>
        </details>
      </div>
    );
  }

  const currentQuestion = run.questions?.[questionIndex] || null;

  return (
    <>
      <Card title="Wizard Launcher" description="Modal workflow for Recruit -> Brainstorm -> Baseline -> Requirements -> Commit.">
        <p>Current run: {run.id}</p>
        <p>Stage: {run.stage}</p>
        <button type="button" className="mt-3" onClick={() => setIsOpen(true)}>
          Start Wizard
        </button>
      </Card>

      {isOpen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-red-900/50 bg-neutral-950 p-4">
            <div className="flex items-center justify-between gap-3 border-b border-red-900/40 pb-3">
              <div>
                <div className="text-sm font-semibold text-red-300">Wizard v2 Modal</div>
                <div className="text-xs text-slate-400">Step {run.currentStep} of {MAX_STEP}: {STEP_TITLES[run.currentStep]}</div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            {run.currentStep === 1 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 1 - Recruit Experts</h3>
                <textarea
                  value={run.idea}
                  onChange={(event) => setRun((previous) => ({ ...previous, idea: event.target.value }))}
                  className="mt-2 h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                  placeholder="Enter generic idea..."
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={handleRecruitExperts} disabled={recruitLoading}>
                    {recruitLoading ? "Recruiting..." : "Recruit Experts"}
                  </button>
                  <button type="button" onClick={handleSaveExperts} disabled={!run.experts?.length}>
                    Save to Graph
                  </button>
                </div>
                {run.experts?.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-200">
                    {run.experts.map((expert) => (
                      <li key={expert.id}>{expert.title}</li>
                    ))}
                  </ul>
                ) : null}
                {renderSaveStatus(1)}
              </section>
            ) : null}

            {run.currentStep === 2 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 2 - Brainstorm Q&A</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleGenerateQuestions} disabled={qaLoading}>
                    {qaLoading ? "Generating..." : "Generate Questions"}
                  </button>
                </div>
                {currentQuestion ? (
                  <div className="mt-3">
                    <p className="text-sm text-slate-200">Q{questionIndex + 1}/{run.questions.length}: {currentQuestion.text}</p>
                    <textarea
                      value={answerInput}
                      onChange={(event) => setAnswerInput(event.target.value)}
                      className="mt-2 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => setQuestionIndex((value) => Math.max(0, value - 1))} disabled={questionIndex === 0}>Prev Question</button>
                      <button type="button" onClick={() => setQuestionIndex((value) => Math.min((run.questions.length || 1) - 1, value + 1))} disabled={questionIndex >= (run.questions.length - 1)}>Next Question</button>
                      <button type="button" onClick={handleFinishBrainstorm} disabled={qaLoading}>Finish Brainstorm</button>
                    </div>
                  </div>
                ) : null}
                {run.brainstormSummary ? <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-700 p-2 text-xs text-slate-200">{run.brainstormSummary}</pre> : null}
                <button type="button" className="mt-2" onClick={handleSaveBrainstormToDraft} disabled={!run.brainstormSummary}>Save to Graph</button>
                {renderSaveStatus(2)}
              </section>
            ) : null}

            {run.currentStep === 3 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 3 - Baseline</h3>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => handleGenerateBaseline(false)} disabled={baselineLoading}>{baselineLoading ? "Generating..." : "Generate Baseline"}</button>
                  <button type="button" onClick={() => handleGenerateBaseline(true)} disabled={baselineLoading || !run.baseline}>Revise Baseline</button>
                  <button type="button" onClick={handleSaveBaseline} disabled={!run.baseline}>Save to Graph</button>
                </div>
                {run.baseline ? (
                  <div className="mt-2 text-sm text-slate-200">
                    <p><strong>{run.baseline.title}</strong> (v{run.baseline.version})</p>
                    <pre className="whitespace-pre-wrap text-xs">{run.baseline.summary}</pre>
                  </div>
                ) : null}
                {renderSaveStatus(3)}
              </section>
            ) : null}

            {run.currentStep === 4 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 4 - Basic Requirements</h3>
                <button type="button" onClick={handleGenerateBasicRequirements} disabled={basicLoading}>{basicLoading ? "Generating..." : "Generate Basic Requirements"}</button>
                {run.basicRequirementsPreview?.nodes?.length ? (
                  <div className="mt-2 rounded-lg border border-slate-700/70 bg-neutral-900/40 p-2">
                    {renderAiModeBadge(
                      run.basicRequirementsPreview.source || "mock",
                      run.basicRequirementsPreview.fallbackReason || "",
                    )}
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200">
                      {run.basicRequirementsPreview.nodes.slice(0, 10).map((node) => <li key={node.id}>{node.title}</li>)}
                    </ul>
                  </div>
                ) : null}
                <button type="button" className="mt-2" onClick={handleSaveBasicRequirements} disabled={!run.basicRequirementsPreview?.nodes?.length}>Save Basic Requirements to Draft Graph</button>
                {renderSaveStatus(4)}
              </section>
            ) : null}

            {run.currentStep === 5 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 5 - Expand to Detailed Requirements</h3>
                <button type="button" onClick={handleGenerateDetailedRequirements} disabled={detailedLoading}>{detailedLoading ? "Generating..." : "Generate Detailed Requirements"}</button>
                {run.detailedRequirementsPreview?.nodes?.length ? (
                  <div className="mt-2 rounded-lg border border-slate-700/70 bg-neutral-900/40 p-2">
                    {renderAiModeBadge(
                      run.detailedRequirementsPreview.source || "mock",
                      run.detailedRequirementsPreview.fallbackReason || "",
                    )}
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200">
                      {run.detailedRequirementsPreview.nodes.slice(0, 10).map((node) => <li key={node.id}>{node.title}</li>)}
                    </ul>
                  </div>
                ) : null}
                <button type="button" className="mt-2" onClick={handleSaveDetailedRequirements} disabled={!run.detailedRequirementsPreview?.nodes?.length}>Save Expansion to Draft Graph</button>
                {renderSaveStatus(5)}
              </section>
            ) : null}

            {run.currentStep === 6 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 6 - Propose Projects/Tasks</h3>
                <button type="button" onClick={handleGenerateProjects} disabled={projectsLoading}>{projectsLoading ? "Generating..." : "Generate Projects/Tasks"}</button>
                {run.projectPreview?.nodes?.length ? (
                  <div className="mt-2 rounded-lg border border-slate-700/70 bg-neutral-900/40 p-2">
                    {renderAiModeBadge(
                      run.projectPreview.source || "mock",
                      run.projectPreview.fallbackReason || "",
                    )}
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-200">
                      {run.projectPreview.nodes.slice(0, 10).map((node) => <li key={node.id}>{node.type}: {node.title}</li>)}
                    </ul>
                  </div>
                ) : null}
                <button type="button" className="mt-2" onClick={handleSaveProjects} disabled={!run.projectPreview?.nodes?.length}>Save Proposals to Draft Graph</button>
                {renderSaveStatus(6)}
              </section>
            ) : null}

            {run.currentStep === 7 ? (
              <section className="mt-4">
                <h3 className="text-sm font-semibold text-slate-100">Step 7 - Commit (Founder Only)</h3>
                <label htmlFor="wizard-confirm-input" className="text-sm text-slate-200">Type CONFIRMED to commit proposed requirements</label>
                <input
                  id="wizard-confirm-input"
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1"
                />
                <button type="button" className="mt-2" onClick={handleCommit} disabled={commitLoading || confirmText !== COMMIT_CONFIRM_TEXT}>
                  {commitLoading ? "Committing..." : "Save to Committed Graph"}
                </button>
                {renderSaveStatus(7)}
              </section>
            ) : null}

            {error ? <div className="mt-3 rounded-lg border border-red-700/60 bg-red-900/25 p-2 text-xs text-red-100">{error}</div> : null}
            {notice ? <div className="mt-3 rounded-lg border border-emerald-700/60 bg-emerald-900/25 p-2 text-xs text-emerald-100">{notice}</div> : null}

            <div className="mt-4 flex items-center justify-between border-t border-red-900/40 pt-3">
              <button type="button" onClick={handleBack} disabled={run.currentStep <= MIN_STEP}>Back</button>
              {run.currentStep < MAX_STEP ? (
                <button type="button" onClick={handleNext} disabled={!canProceed}>Next</button>
              ) : (
                <button type="button" onClick={() => setIsOpen(false)} disabled={!canProceed}>Finish</button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

