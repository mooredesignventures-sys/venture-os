"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "../../../src/components/ui/card";

const WIZARD_RUNS_STORAGE_KEY = "wizard_runs";
const RECRUITED_EXPERTS_STORAGE_KEY = "recruited_experts";
const BASELINE_SNAPSHOTS_STORAGE_KEY = "baseline_snapshots";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";
const MIN_ACCEPTED_REQUIREMENTS = 3;

const STEP_LABELS = [
  "1. Recruit",
  "2. Brainstorm Q&A",
  "3. Baseline",
  "4. Basic Requirements",
];

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
  const areas = [];
  const trimmedIdea = String(idea || "").trim();
  if (trimmedIdea) {
    areas.push(trimmedIdea.slice(0, 72));
  }
  const titleWords = String(title || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  if (titleWords) {
    areas.push(titleWords);
  }
  return areas;
}

function mapNodesToExperts(nodes, idea, runId) {
  const aiTitles = (Array.isArray(nodes) ? nodes : [])
    .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
    .filter(Boolean);

  const candidates = [...aiTitles, ...fallbackExpertTitles(idea)];
  const uniqueTitles = [];
  for (const title of candidates) {
    if (!uniqueTitles.includes(title)) {
      uniqueTitles.push(title);
    }
    if (uniqueTitles.length >= 8) {
      break;
    }
  }

  while (uniqueTitles.length < 6) {
    uniqueTitles.push(`Council Expert ${uniqueTitles.length + 1}`);
  }

  const createdAt = new Date().toISOString();
  const runKey = toIdPart(runId).slice(0, 24) || "run";

  return uniqueTitles.slice(0, 8).map((title, index) => ({
    id: `expert:${runKey}:${toIdPart(title) || `role-${index + 1}`}`,
    type: "Expert",
    title,
    owner: "founder",
    stage: "proposed",
    status: "queued",
    version: 1,
    createdAt,
    createdBy: "ai",
    risk: "medium",
    parentId: null,
    archived: false,
    focusAreas: deriveFocusAreas(idea, title),
  }));
}

function fallbackQuestions(idea, experts) {
  const firstExpert = experts[0]?.title || "Domain expert";
  return [
    `What is the core outcome expected from "${idea}" in the next 90 days?`,
    "Which user group is highest priority in phase one?",
    "What is the strictest governance boundary for this workflow?",
    `What key risk should ${firstExpert} monitor first?`,
    "What data source is mandatory before launch?",
    "What should never be automated in this flow?",
  ];
}

function mapNodesToQuestions(nodes, idea, experts) {
  const aiQuestions = (Array.isArray(nodes) ? nodes : [])
    .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
    .filter(Boolean)
    .slice(0, 8);

  const questions = [...aiQuestions, ...fallbackQuestions(idea, experts)].slice(0, 8);
  while (questions.length < 5) {
    questions.push(`Clarify priority #${questions.length + 1} for this workflow.`);
  }

  return questions.map((text, index) => ({ questionId: `q:${index + 1}`, text }));
}

function upsertAnswer(answers, questionId, answer) {
  const clean = String(answer || "").trim();
  const next = Array.isArray(answers) ? [...answers] : [];
  const index = next.findIndex((item) => item?.questionId === questionId);
  if (index >= 0) {
    next[index] = { questionId, answer: clean };
    return next;
  }
  return [...next, { questionId, answer: clean }];
}

function answerForQuestion(run, questionId) {
  const item = (Array.isArray(run?.answers) ? run.answers : []).find(
    (entry) => entry?.questionId === questionId,
  );
  return typeof item?.answer === "string" ? item.answer : "";
}

function deterministicSummary(run) {
  const lines = [];
  const idea = String(run?.idea || "").trim();
  const experts = Array.isArray(run?.experts) ? run.experts : [];
  const answers = Array.isArray(run?.answers) ? run.answers : [];

  lines.push(`- Core idea focus: ${idea || "Untitled baseline idea"}`);
  lines.push(`- Recruited experts in scope: ${experts.length}`);
  const answerHighlights = answers
    .map((item) => (typeof item?.answer === "string" ? item.answer.trim() : ""))
    .filter(Boolean)
    .slice(0, 2);
  lines.push(
    answerHighlights.length > 0
      ? `- Key answer highlights: ${answerHighlights.join(" | ")}`
      : "- Key answer highlights: pending clarifications from founder",
  );

  const focus = experts.slice(0, 2).map((expert) => expert.title).filter(Boolean);
  lines.push(`- Expert focus anchors: ${focus.length ? focus.join(", ") : "none selected"}`);
  lines.push("- Boundaries: proposed-only, append-only audit, founder-confirmed commit only.");
  return lines.slice(0, 5).join("\n");
}
function buildBaselinePrompt(run, revise = false) {
  const experts = Array.isArray(run?.experts) ? run.experts : [];
  const expertLines = experts
    .map((expert) => {
      const focus = Array.isArray(expert.focusAreas)
        ? expert.focusAreas.filter(Boolean).join(", ")
        : "";
      return `- ${expert.title}${focus ? ` (focus: ${focus})` : ""}`;
    })
    .join("\n");

  return [
    `Idea: ${run.idea || "Untitled idea"}`,
    expertLines ? `Experts:\n${expertLines}` : "Experts: none",
    `Brainstorm summary:\n${run.brainstormSummary || "No summary yet."}`,
    revise
      ? "Revise the baseline concept and tighten constraints and non-goals."
      : "Generate a baseline concept with concise constraints and non-goals.",
  ].join("\n\n");
}

function parseBaselineFromBundle(bundle, run, version) {
  const nodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
  const concept =
    nodes.find((node) => node?.type === "Concept") || nodes.find((node) => node?.title);
  const requirementTitles = nodes
    .filter((node) => node?.type === "Requirement" && typeof node?.title === "string")
    .map((node) => node.title)
    .slice(0, 6);

  return {
    id: `wiz:baseline:${run.id}:v${version}:${Date.now()}`,
    title:
      (typeof concept?.title === "string" && concept.title) ||
      `Baseline Concept: ${(run.idea || "Untitled").slice(0, 48)}`,
    summary: run.brainstormSummary || deterministicSummary(run),
    constraints:
      requirementTitles.slice(0, 3).length > 0
        ? requirementTitles.slice(0, 3)
        : ["Keep governance boundaries strict and explicit."],
    nonGoals:
      requirementTitles.slice(3, 5).length > 0
        ? requirementTitles.slice(3, 5)
        : ["No automatic commit or deployment in wizard v1."],
    version,
    createdAt: new Date().toISOString(),
    archived: false,
  };
}

function parseRequirementsFromBundle(bundle, runId, baselineId) {
  const nodes = Array.isArray(bundle?.nodes) ? bundle.nodes : [];
  const reqNodes = nodes.filter((node) => node?.type === "Requirement");
  const titles = reqNodes
    .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);

  while (titles.length < 5) {
    titles.push(`Baseline requirement ${titles.length + 1}`);
  }

  return titles.slice(0, 10).map((title, index) => ({
    id: `wiz:req:${toIdPart(runId)}:${Date.now()}:${index + 1}`,
    type: "Requirement",
    title,
    stage: "proposed",
    status: "queued",
    version: 1,
    owner: "founder",
    createdAt: new Date().toISOString(),
    createdBy: "ai",
    risk: "medium",
    parentId: baselineId || null,
    archived: false,
  }));
}

function normalizeDraftError(error, fallback) {
  const message = error instanceof Error ? error.message : "";
  return message || fallback;
}

function createRun() {
  const createdAt = new Date().toISOString();
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
    basicRequirements: [],
    acceptState: {},
    history: [{ id: `hist:${Date.now()}:created`, createdAt, step: 1, action: "WIZARD_RUN_CREATED" }],
  };
}

export default function WizardClient() {
  const [run, setRun] = useState(null);
  const [loadingRun, setLoadingRun] = useState(true);
  const [wizardError, setWizardError] = useState("");
  const [wizardNotice, setWizardNotice] = useState("");
  const [auditRefreshToken, setAuditRefreshToken] = useState(0);
  const [recruiting, setRecruiting] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [requirementLoading, setRequirementLoading] = useState({});

  function recordAudit(type, payload) {
    appendAuditEvent(type, payload);
    setAuditRefreshToken((value) => value + 1);
  }

  function saveRun(nextRun, historyPatch) {
    if (typeof window === "undefined" || !nextRun) {
      return;
    }

    const historyEntry = historyPatch
      ? {
          id: `hist:${Date.now()}:${historyPatch.action || "update"}`,
          createdAt: new Date().toISOString(),
          ...historyPatch,
        }
      : null;
    const withHistory = historyEntry
      ? { ...nextRun, history: [...(Array.isArray(nextRun.history) ? nextRun.history : []), historyEntry] }
      : nextRun;

    const runs = loadStoredArray(WIZARD_RUNS_STORAGE_KEY);
    const existingIndex = runs.findIndex((item) => item?.id === withHistory.id);
    const nextRuns =
      existingIndex >= 0
        ? runs.map((item, index) => (index === existingIndex ? withHistory : item))
        : [...runs, withHistory];
    writeStoredArray(WIZARD_RUNS_STORAGE_KEY, nextRuns);
    setRun(withHistory);
  }

  function updateRun(patch, historyPatch) {
    if (!run) {
      return;
    }
    saveRun({ ...run, ...patch }, historyPatch);
  }

  useEffect(() => {
    const runs = loadStoredArray(WIZARD_RUNS_STORAGE_KEY);
    const active = [...runs]
      .reverse()
      .find((item) => item?.stage === "in_progress" && item?.archived !== true);

    if (active) {
      setRun(active);
      setLoadingRun(false);
      return;
    }

    const created = createRun();
    writeStoredArray(WIZARD_RUNS_STORAGE_KEY, [...runs, created]);
    setRun(created);
    setLoadingRun(false);
  }, []);

  useEffect(() => {
    if (!run || run.currentStep !== 2 || !Array.isArray(run.questions) || run.questions.length === 0) {
      setCurrentAnswer("");
      return;
    }
    const question = run.questions[activeQuestionIndex];
    if (!question) {
      setCurrentAnswer("");
      return;
    }
    setCurrentAnswer(answerForQuestion(run, question.questionId));
  }, [run, activeQuestionIndex]);

  const recentAuditEvents = useMemo(() => {
    const key = resolveAuditStorageKey();
    return loadStoredArray(key).slice(-12).reverse();
  }, [auditRefreshToken, run]);

  const acceptedRequirementCount = useMemo(() => {
    if (!run) {
      return 0;
    }
    return (Array.isArray(run.basicRequirements) ? run.basicRequirements : []).filter((req) => {
      if (req?.archived === true) {
        return false;
      }
      return run.acceptState?.[req.id] === "accepted";
    }).length;
  }, [run]);

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
    return data;
  }
  async function handleRecruitExperts() {
    if (!run) {
      return;
    }
    if (!run.idea.trim()) {
      setWizardError("Enter a high-level idea first.");
      return;
    }

    setWizardError("");
    setWizardNotice("");
    setRecruiting(true);
    try {
      const data = await requestDraftBundle({
        mode: "business",
        prompt: `${run.idea}\nReturn 6-8 expert roles with focus areas for recruitment.`,
      });
      const experts = mapNodesToExperts(data.bundle.nodes, run.idea, run.id);
      saveRun(
        { ...run, experts },
        { step: 1, action: "AI_EXPERTS_GENERATED", expertCount: experts.length },
      );
      recordAudit("AI_EXPERTS_GENERATED", {
        wizardRunId: run.id,
        idea: run.idea,
        expertCount: experts.length,
      });
      setWizardNotice(`Experts generated: ${experts.length} (source=${data.source || "mock"}).`);
    } catch (error) {
      setWizardError(normalizeDraftError(error, "Failed to recruit experts."));
    } finally {
      setRecruiting(false);
    }
  }

  function handleConfirmExpertPanel() {
    if (!run || !Array.isArray(run.experts) || run.experts.length === 0) {
      setWizardError("Generate experts before confirming.");
      return;
    }

    const existing = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY);
    const existingIds = new Set(existing.map((item) => item?.id).filter(Boolean));
    const additions = run.experts.filter((expert) => !existingIds.has(expert.id));
    writeStoredArray(RECRUITED_EXPERTS_STORAGE_KEY, [...existing, ...additions]);

    saveRun(
      { ...run, currentStep: 2 },
      { step: 1, action: "AI_EXPERTS_CONFIRMED", expertCount: run.experts.length },
    );
    recordAudit("AI_EXPERTS_CONFIRMED", {
      wizardRunId: run.id,
      expertCount: run.experts.length,
    });
    setActiveQuestionIndex(0);
    setCurrentAnswer("");
    setWizardError("");
    setWizardNotice("Expert panel confirmed. Continue to Brainstorm Q&A.");
  }

  async function handleGenerateQuestions() {
    if (!run) {
      return;
    }

    setWizardError("");
    setWizardNotice("");
    setQuestionsLoading(true);
    try {
      const expertContext = run.experts.map((expert) => expert.title).join(", ");
      const data = await requestDraftBundle({
        mode: "business",
        prompt: [
          `Idea: ${run.idea || "Untitled idea"}`,
          expertContext ? `Experts: ${expertContext}` : "Experts: none",
          "Generate 5-8 clarifying questions for founder brainstorm.",
          "Each question should be concise and actionable.",
        ].join("\n\n"),
      });
      const questions = mapNodesToQuestions(data.bundle.nodes, run.idea, run.experts || []);
      saveRun(
        { ...run, questions, answers: [] },
        { step: 2, action: "AI_QUESTIONS_GENERATED", questionCount: questions.length },
      );
      recordAudit("AI_QUESTIONS_GENERATED", {
        wizardRunId: run.id,
        questionCount: questions.length,
      });
      setActiveQuestionIndex(0);
      setCurrentAnswer("");
      setWizardNotice(`Questions generated: ${questions.length} (source=${data.source || "mock"}).`);
    } catch (error) {
      setWizardError(normalizeDraftError(error, "Failed to generate questions."));
    } finally {
      setQuestionsLoading(false);
    }
  }

  function withCurrentAnswer(baseRun) {
    if (!baseRun || !Array.isArray(baseRun.questions) || baseRun.questions.length === 0) {
      return baseRun;
    }
    const current = baseRun.questions[activeQuestionIndex];
    if (!current) {
      return baseRun;
    }
    return {
      ...baseRun,
      answers: upsertAnswer(baseRun.answers || [], current.questionId, currentAnswer),
    };
  }

  function handleNextQuestion() {
    if (!run || !Array.isArray(run.questions) || run.questions.length === 0) {
      return;
    }

    const nextRun = withCurrentAnswer(run);
    const current = nextRun.questions[activeQuestionIndex];
    saveRun(
      nextRun,
      { step: 2, action: "QUESTION_ANSWERED", questionId: current?.questionId || "unknown" },
    );

    if (activeQuestionIndex < nextRun.questions.length - 1) {
      const nextIndex = activeQuestionIndex + 1;
      setActiveQuestionIndex(nextIndex);
      const nextQuestion = nextRun.questions[nextIndex];
      setCurrentAnswer(answerForQuestion(nextRun, nextQuestion.questionId));
      setWizardNotice("");
      return;
    }

    setWizardNotice("Last question reached. Click Finish Brainstorm to create summary.");
  }

  async function handleFinishBrainstorm() {
    if (!run || !Array.isArray(run.questions) || run.questions.length === 0) {
      setWizardError("Generate questions first.");
      return;
    }

    setWizardError("");
    setWizardNotice("");
    setQuestionsLoading(true);
    try {
      const answeredRun = withCurrentAnswer(run);
      const qaLines = answeredRun.questions.map((question) => {
        const answer = answerForQuestion(answeredRun, question.questionId);
        return `Q: ${question.text}\nA: ${answer || "(no answer yet)"}`;
      });
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: [
          `Idea: ${answeredRun.idea || "Untitled idea"}`,
          "Create a 5-line brainstorm summary from the following Q&A.",
          qaLines.join("\n\n"),
        ].join("\n\n"),
      });
      const summaryLines = (Array.isArray(data.bundle?.nodes) ? data.bundle.nodes : [])
        .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
        .map((line) => `- ${line}`);
      const summary = summaryLines.length > 0 ? summaryLines.join("\n") : deterministicSummary(answeredRun);

      const nextRun = { ...answeredRun, brainstormSummary: summary, currentStep: 3 };
      saveRun(
        nextRun,
        { step: 2, action: "BRAINSTORM_SUMMARY_CREATED", summaryLength: summary.length },
      );
      recordAudit("BRAINSTORM_SUMMARY_CREATED", {
        wizardRunId: run.id,
        summaryLength: summary.length,
      });
      setWizardNotice("Brainstorm summary created. Continue to Baseline.");
    } catch (error) {
      const answeredRun = withCurrentAnswer(run);
      const summary = deterministicSummary(answeredRun);
      const nextRun = { ...answeredRun, brainstormSummary: summary, currentStep: 3 };
      saveRun(
        nextRun,
        { step: 2, action: "BRAINSTORM_SUMMARY_CREATED", summaryLength: summary.length },
      );
      recordAudit("BRAINSTORM_SUMMARY_CREATED", {
        wizardRunId: run.id,
        summaryLength: summary.length,
      });
      setWizardNotice(
        `Summary fallback used: ${normalizeDraftError(error, "AI unavailable, used deterministic summary.")}`,
      );
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleGenerateBaseline(revise = false) {
    if (!run || !run.idea.trim()) {
      setWizardError("Idea is required before baseline generation.");
      return;
    }

    const version = revise && run.baseline ? Number(run.baseline.version || 1) + 1 : 1;
    setWizardError("");
    setWizardNotice("");
    setBaselineLoading(true);
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: buildBaselinePrompt(run, revise),
      });
      const baseline = parseBaselineFromBundle(data.bundle, run, version);
      saveRun(
        { ...run, baseline },
        { step: 3, action: revise ? "BASELINE_REVISED" : "BASELINE_GENERATED", baselineVersion: version },
      );
      recordAudit("BASELINE_GENERATED", { wizardRunId: run.id, baselineVersion: version });
      setWizardNotice(
        `${revise ? "Baseline revised" : "Baseline generated"} (version ${version}, source=${data.source || "mock"}).`,
      );
    } catch (error) {
      const fallback = parseBaselineFromBundle({}, run, version);
      saveRun(
        { ...run, baseline: fallback },
        { step: 3, action: revise ? "BASELINE_REVISED" : "BASELINE_GENERATED", baselineVersion: version },
      );
      recordAudit("BASELINE_GENERATED", { wizardRunId: run.id, baselineVersion: version });
      setWizardNotice(
        `Baseline fallback used: ${normalizeDraftError(error, "AI unavailable, used deterministic baseline.")}`,
      );
    } finally {
      setBaselineLoading(false);
    }
  }
  function handleAcceptBaseline() {
    if (!run || !run.baseline) {
      setWizardError("Generate baseline before accepting.");
      return;
    }

    const snapshot = {
      id: run.baseline.id,
      type: "Baseline",
      title: run.baseline.title,
      stage: "proposed",
      status: "queued",
      version: run.baseline.version || 1,
      createdAt: run.baseline.createdAt || new Date().toISOString(),
      createdBy: "ai",
      owner: "founder",
      risk: "medium",
      parentId: null,
      archived: false,
      idea: run.idea || "Untitled baseline",
      experts: (Array.isArray(run.experts) ? run.experts : []).map((expert) => ({
        id: expert.id,
        title: expert.title,
        focusAreas: Array.isArray(expert.focusAreas) ? expert.focusAreas : [],
      })),
      brainstormSummary: run.baseline.summary || run.brainstormSummary || "",
      gravitySnapshot: {
        questionCount: Array.isArray(run.questions) ? run.questions.length : 0,
        answerCount: Array.isArray(run.answers) ? run.answers.length : 0,
      },
    };

    const existing = loadStoredArray(BASELINE_SNAPSHOTS_STORAGE_KEY);
    writeStoredArray(BASELINE_SNAPSHOTS_STORAGE_KEY, [...existing, snapshot]);

    saveRun({ ...run, currentStep: 4 }, { step: 3, action: "BASELINE_ACCEPTED", baselineId: snapshot.id });
    recordAudit("BASELINE_ACCEPTED", { wizardRunId: run.id, baselineId: snapshot.id });
    setWizardError("");
    setWizardNotice("Baseline accepted and saved to baseline_snapshots.");
  }

  function buildRequirementsPrompt(currentRun) {
    const baseline = currentRun?.baseline;
    if (!baseline) {
      return "Generate 5-10 basic requirements from baseline context.";
    }
    const expertLines = (Array.isArray(currentRun.experts) ? currentRun.experts : [])
      .map((expert) => `- ${expert.title}`)
      .join("\n");
    return [
      `Baseline title: ${baseline.title}`,
      `Baseline summary:\n${baseline.summary || "No summary."}`,
      `Constraints:\n${(baseline.constraints || []).map((line) => `- ${line}`).join("\n")}`,
      `Non-goals:\n${(baseline.nonGoals || []).map((line) => `- ${line}`).join("\n")}`,
      expertLines ? `Experts:\n${expertLines}` : "Experts: none",
      "Generate 5-10 basic requirements only.",
    ].join("\n\n");
  }

  async function handleGenerateBasicRequirements() {
    if (!run || !run.baseline) {
      setWizardError("Accept baseline before generating requirements.");
      return;
    }

    setWizardError("");
    setWizardNotice("");
    setRequirementsLoading(true);
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        prompt: buildRequirementsPrompt(run),
      });
      const requirements = parseRequirementsFromBundle(data.bundle, run.id, run.baseline.id);
      const nextAcceptState = { ...(run.acceptState || {}) };
      for (const requirement of requirements) {
        if (!nextAcceptState[requirement.id]) {
          nextAcceptState[requirement.id] = "pending";
        }
      }

      saveRun(
        { ...run, basicRequirements: requirements, acceptState: nextAcceptState },
        {
          step: 4,
          action: "REQUIREMENTS_GENERATED_FROM_BASELINE",
          nodeCount: requirements.length,
          edgeCount: Math.max(requirements.length - 1, 0),
        },
      );
      recordAudit("REQUIREMENTS_GENERATED_FROM_BASELINE", {
        wizardRunId: run.id,
        nodeCount: requirements.length,
        edgeCount: Math.max(requirements.length - 1, 0),
      });
      setWizardNotice(`Basic requirements generated: ${requirements.length}.`);
    } catch (error) {
      setWizardError(normalizeDraftError(error, "Failed to generate basic requirements."));
    } finally {
      setRequirementsLoading(false);
    }
  }

  function handleRequirementDecision(requirement, decision) {
    if (!run) {
      return;
    }
    const nextAcceptState = { ...(run.acceptState || {}), [requirement.id]: decision };
    const nextRequirements = (Array.isArray(run.basicRequirements) ? run.basicRequirements : []).map((item) =>
      item.id === requirement.id ? { ...item, archived: decision === "discarded" } : item,
    );

    saveRun(
      { ...run, basicRequirements: nextRequirements, acceptState: nextAcceptState },
      { step: 4, action: `REQUIREMENT_${decision.toUpperCase()}`, requirementId: requirement.id },
    );

    const eventType =
      decision === "accepted"
        ? "REQUIREMENT_ACCEPTED"
        : decision === "discarded"
          ? "REQUIREMENT_DISCARDED"
          : "REQUIREMENT_PENDING";
    recordAudit(eventType, { wizardRunId: run.id, requirementId: requirement.id, title: requirement.title });
    setWizardNotice(`Requirement ${decision}: ${requirement.title}`);
  }

  async function handleReviseRequirement(requirement) {
    if (!run) {
      return;
    }

    setRequirementLoading((previous) => ({ ...previous, [requirement.id]: true }));
    setWizardError("");
    setWizardNotice("");
    try {
      const data = await requestDraftBundle({
        mode: "requirements",
        level: "baseline",
        nonce: `${Date.now()}`,
        prompt: [
          `Revise requirement for baseline workflow: ${requirement.title}`,
          `Current risk: ${requirement.risk || "medium"}`,
          "Return one improved Requirement title.",
        ].join("\n\n"),
      });
      const revisedTitle =
        (Array.isArray(data.bundle?.nodes) ? data.bundle.nodes : [])
          .filter((node) => node?.type === "Requirement")
          .map((node) => (typeof node?.title === "string" ? node.title.trim() : ""))
          .find(Boolean) || `${requirement.title} (Revised)`;

      const revised = {
        ...requirement,
        id: `wiz:req:${toIdPart(run.id)}:${Date.now()}`,
        title: revisedTitle,
        version: Number(requirement.version || 1) + 1,
        parentId: requirement.id,
        createdAt: new Date().toISOString(),
        archived: false,
      };

      const nextRequirements = (Array.isArray(run.basicRequirements) ? run.basicRequirements : [])
        .map((item) => (item.id === requirement.id ? { ...item, archived: true } : item))
        .concat(revised);
      const nextAcceptState = {
        ...(run.acceptState || {}),
        [requirement.id]: "discarded",
        [revised.id]: "pending",
      };

      saveRun(
        { ...run, basicRequirements: nextRequirements, acceptState: nextAcceptState },
        { step: 4, action: "REQUIREMENT_REVISED", requirementId: requirement.id, newRequirementId: revised.id },
      );
      recordAudit("REQUIREMENT_REVISED", {
        wizardRunId: run.id,
        requirementId: requirement.id,
        title: requirement.title,
        newRequirementId: revised.id,
      });
      setWizardNotice(`Requirement revised: ${revised.title}`);
    } catch (error) {
      setWizardError(normalizeDraftError(error, "Failed to revise requirement."));
    } finally {
      setRequirementLoading((previous) => ({ ...previous, [requirement.id]: false }));
    }
  }

  function handleCompleteWizard() {
    if (!run) {
      return;
    }
    if (acceptedRequirementCount < MIN_ACCEPTED_REQUIREMENTS) {
      setWizardError(`Accept at least ${MIN_ACCEPTED_REQUIREMENTS} requirements to complete v1.`);
      return;
    }

    saveRun(
      { ...run, stage: "complete", currentStep: 4 },
      { step: 4, action: "WIZARD_V1_COMPLETED", acceptedRequirementCount },
    );
    recordAudit("WIZARD_V1_COMPLETED", { wizardRunId: run.id, acceptedRequirementCount });
    setWizardError("");
    setWizardNotice("Wizard v1 complete.");
  }

  function goBack() {
    if (!run || run.currentStep <= 1) {
      return;
    }
    updateRun({ currentStep: run.currentStep - 1 }, { step: run.currentStep, action: "STEP_BACK" });
    setWizardError("");
    setWizardNotice("");
  }

  function goNext() {
    if (!run || run.currentStep >= 4) {
      return;
    }
    updateRun({ currentStep: run.currentStep + 1 }, { step: run.currentStep, action: "STEP_NEXT" });
    setWizardError("");
    setWizardNotice("");
  }

  if (loadingRun || !run) {
    return (
      <Card title="Wizard v1">
        <p>Loading wizard run...</p>
      </Card>
    );
  }

  const currentQuestion = run.questions?.[activeQuestionIndex] || null;
  const canGoNext =
    (run.currentStep === 1 && run.experts?.length > 0) ||
    (run.currentStep === 2 && Boolean(run.brainstormSummary)) ||
    (run.currentStep === 3 && Boolean(run.baseline)) ||
    run.currentStep === 4;

  return (
    <>
      <Card title="Wizard v1" description="Recruit -> Brainstorm Q&A -> Baseline -> Basic Requirements">
        <p>
          Run ID: {run.id} | Stage: {run.stage} | Current step: {run.currentStep}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const active = run.currentStep === step;
            return (
              <span
                key={label}
                className={`rounded-md border px-2 py-1 text-xs ${
                  active ? "border-red-600 bg-red-900/30 text-red-200" : "border-slate-700 text-slate-300"
                }`}
              >
                {label}
              </span>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={goBack} disabled={run.currentStep <= 1}>
            Back
          </button>
          <button type="button" onClick={goNext} disabled={run.currentStep >= 4 || !canGoNext}>
            Next
          </button>
        </div>
        {wizardError ? <p className="mt-2 text-red-300">{wizardError}</p> : null}
        {wizardNotice ? <p className="mt-2 text-emerald-300">{wizardNotice}</p> : null}
      </Card>
      {run.currentStep === 1 ? (
        <Card title="Step 1: Recruit Experts">
          <label htmlFor="wizard-idea-input">High-level idea</label>
          <textarea
            id="wizard-idea-input"
            value={run.idea}
            onChange={(event) => updateRun({ idea: event.target.value })}
            className="mt-2 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
            placeholder="Describe the idea to scope expert recruitment."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleRecruitExperts} disabled={recruiting}>
              {recruiting ? "Recruiting..." : "Recruit Experts"}
            </button>
            <button type="button" onClick={handleConfirmExpertPanel} disabled={!run.experts?.length}>
              Confirm Expert Panel
            </button>
          </div>
          {run.experts?.length ? (
            <ul className="mt-3 space-y-1">
              {run.experts.map((expert) => (
                <li key={expert.id}>
                  <strong>{expert.title}</strong>
                  {expert.focusAreas?.length ? ` | ${expert.focusAreas.join(" / ")}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {run.currentStep === 2 ? (
        <Card title="Step 2: Brainstorm Q&A">
          <button type="button" onClick={handleGenerateQuestions} disabled={questionsLoading}>
            {questionsLoading ? "Generating..." : "Generate Questions"}
          </button>
          {run.questions?.length && currentQuestion ? (
            <div className="mt-3">
              <p>Question {activeQuestionIndex + 1} / {run.questions.length}</p>
              <p className="mt-1">{currentQuestion.text}</p>
              <textarea
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                className="mt-2 h-20 w-full rounded-lg border border-slate-700 bg-slate-950 p-2"
                placeholder="Answer here..."
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={handleNextQuestion} disabled={questionsLoading}>
                  Next Question
                </button>
                <button type="button" onClick={handleFinishBrainstorm} disabled={questionsLoading}>
                  Finish Brainstorm
                </button>
              </div>
            </div>
          ) : null}
          {run.brainstormSummary ? (
            <div className="mt-3">
              <h4>Summary</h4>
              <pre>{run.brainstormSummary}</pre>
            </div>
          ) : null}
        </Card>
      ) : null}

      {run.currentStep === 3 ? (
        <Card title="Step 3: Baseline">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => handleGenerateBaseline(false)} disabled={baselineLoading}>
              {baselineLoading ? "Generating..." : "Generate Baseline"}
            </button>
            <button type="button" onClick={() => handleGenerateBaseline(true)} disabled={baselineLoading || !run.baseline}>
              Revise Baseline
            </button>
            <button type="button" onClick={handleAcceptBaseline} disabled={!run.baseline}>
              Accept Baseline
            </button>
          </div>
          {run.baseline ? (
            <div className="mt-3">
              <p><strong>{run.baseline.title}</strong> (version {run.baseline.version})</p>
              <pre>{run.baseline.summary}</pre>
              <p>Constraints: {(run.baseline.constraints || []).join(" | ")}</p>
              <p>Non-goals: {(run.baseline.nonGoals || []).join(" | ")}</p>
            </div>
          ) : <p className="mt-3">Generate baseline to continue.</p>}
        </Card>
      ) : null}

      {run.currentStep === 4 ? (
        <Card title="Step 4: Basic Requirements">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleGenerateBasicRequirements} disabled={requirementsLoading}>
              {requirementsLoading ? "Generating..." : "Generate Basic Requirements"}
            </button>
            <button type="button" onClick={handleCompleteWizard} disabled={acceptedRequirementCount < MIN_ACCEPTED_REQUIREMENTS}>
              Complete Wizard v1
            </button>
          </div>
          <p className="mt-2">Accepted requirements: {acceptedRequirementCount} / {MIN_ACCEPTED_REQUIREMENTS} required.</p>
          {run.basicRequirements?.length ? (
            <div className="mt-3 space-y-2">
              {run.basicRequirements.map((requirement) => {
                const decision = run.acceptState?.[requirement.id] || "pending";
                return (
                  <article key={requirement.id} className={`rounded-lg border p-2 ${requirement.archived ? "border-slate-700 bg-slate-900/40" : "border-red-900/40 bg-neutral-900/60"}`}>
                    <p><strong>{requirement.title}</strong></p>
                    <p className="text-xs">state={decision} | version={requirement.version} | risk={requirement.risk || "medium"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" onClick={() => handleRequirementDecision(requirement, "accepted")} disabled={requirement.archived === true}>Accept</button>
                      <button type="button" onClick={() => handleRequirementDecision(requirement, "discarded")} disabled={requirement.archived === true}>Discard</button>
                      <button type="button" onClick={() => handleReviseRequirement(requirement)} disabled={Boolean(requirementLoading[requirement.id])}>
                        {requirementLoading[requirement.id] ? "Revising..." : "Revise"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card title="Wizard History">
        <div className="max-h-56 overflow-auto">
          <ul>
            {(run.history || []).slice().reverse().map((entry) => (
              <li key={entry.id}>{entry.createdAt} | step={entry.step} | {entry.action}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card title="Audit (latest 12)">
        <div className="max-h-56 overflow-auto">
          <ul>
            {recentAuditEvents.map((event, index) => (
              <li key={`${event?.id || "event"}-${index}`}>
                <strong>{event.type}</strong> | {event.createdAt}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  );
}
