"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "../../../src/components/ui/card";

const RECRUITED_EXPERTS_STORAGE_KEY = "recruited_experts";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";

const COUNCIL_MEMBERS = [
  { id: "member-1", label: "Founder", role: "Command", left: "12%", top: "58%", delay: "0s" },
  { id: "member-2", label: "Governance", role: "Boundary", left: "28%", top: "28%", delay: "0.4s" },
  { id: "member-3", label: "Research", role: "Signal", left: "52%", top: "18%", delay: "0.8s" },
  { id: "member-4", label: "Execution", role: "Ops", left: "74%", top: "34%", delay: "1.2s" },
  { id: "member-5", label: "Risk", role: "Shield", left: "82%", top: "64%", delay: "1.6s" },
  { id: "member-6", label: "Audit", role: "Ledger", left: "56%", top: "78%", delay: "2s" },
];

const COUNCIL_THREAD = [
  { id: "msg-1", speaker: "Founder", stamp: "08:40", text: "Re-center on deterministic execution for this sprint." },
  { id: "msg-2", speaker: "Governance", stamp: "08:42", text: "Boundary checks remain strict: draft first, founder-confirmed commit only." },
  { id: "msg-3", speaker: "Research", stamp: "08:45", text: "External signal scan is stable; no conflicting assumptions detected." },
  { id: "msg-4", speaker: "Execution", stamp: "08:49", text: "War Room pipeline ready. Queue pressure is below threshold." },
  { id: "msg-5", speaker: "Risk", stamp: "08:52", text: "Risk posture is controlled. No escalation required." },
  { id: "msg-6", speaker: "Audit", stamp: "08:55", text: "Append-only trail healthy. Last state transition verified." },
  { id: "msg-7", speaker: "Founder", stamp: "08:58", text: "Proceed with requirements refinement and graph review." },
  { id: "msg-8", speaker: "Governance", stamp: "09:01", text: "Council alignment confirmed. Continue with proposal-safe path." },
  { id: "msg-9", speaker: "Execution", stamp: "09:04", text: "Next wave prepared: requirements, decisions, business graphs synced." },
  { id: "msg-10", speaker: "Research", stamp: "09:07", text: "Signal confidence remains high across current assumptions." },
];

function speakerTone(speaker) {
  if (speaker === "Founder") return "border-red-700/50 bg-red-900/25 text-red-200";
  if (speaker === "Governance") return "border-amber-700/50 bg-amber-900/25 text-amber-200";
  if (speaker === "Audit") return "border-cyan-700/50 bg-cyan-900/20 text-cyan-200";
  if (speaker === "Risk") return "border-fuchsia-700/50 bg-fuchsia-900/20 text-fuchsia-200";
  return "border-slate-700/60 bg-slate-900/40 text-slate-200";
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

  const key = resolveAuditStorageKey();
  const existing = loadStoredArray(key);
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
  window.localStorage.setItem(key, JSON.stringify([...existing, event]));
}

function toIdPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function coerceTitle(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
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
    areas.push(trimmedIdea.slice(0, 60));
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

function buildExpertsFromBundle(nodes, idea) {
  const bundleTitles = Array.isArray(nodes)
    ? nodes
        .map((node) => coerceTitle(node?.title))
        .filter(Boolean)
        .map((title) => (title.toLowerCase().includes("expert") ? title : `${title} Expert`))
    : [];

  const candidates = [...bundleTitles, ...fallbackExpertTitles(idea)];
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
  const ideaKey = toIdPart(idea).slice(0, 18) || "general";
  return uniqueTitles.slice(0, 8).map((title, index) => ({
    id: `expert:${ideaKey}:${toIdPart(title) || `role-${index + 1}`}`,
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

function toRecruitErrorMessage(error) {
  const message = error instanceof Error ? error.message : "";
  const lowered = message.toLowerCase();

  if (
    (error instanceof Error && error.name === "AbortError") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("networkerror") ||
    lowered.includes("load failed")
  ) {
    return "Server not reachable — is dev server running?";
  }

  return message || "Failed to recruit experts.";
}

export default function CouncilClient() {
  const [ideaInput, setIdeaInput] = useState("");
  const [recruiting, setRecruiting] = useState(false);
  const [recruitError, setRecruitError] = useState("");
  const [recruitSource, setRecruitSource] = useState("");
  const [recruitPreview, setRecruitPreview] = useState([]);
  const [recruitResult, setRecruitResult] = useState("");
  const [storedExpertCount, setStoredExpertCount] = useState(0);

  function refreshStoredExpertCount() {
    const experts = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY).filter(
      (item) => item?.type === "Expert" && item?.archived !== true,
    );
    setStoredExpertCount(experts.length);
  }

  async function handleRecruitExperts(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const idea = ideaInput.trim();
    if (!idea) {
      setRecruitError("Enter a high-level idea before recruiting experts.");
      return;
    }

    setRecruitError("");
    setRecruitResult("");
    setRecruiting(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode: "business",
          prompt: `${idea}\nReturn 6-8 expert roles with focus for council recruitment.`,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok || !data?.ok || !data?.bundle) {
        const reason =
          typeof data?.error === "string" && data.error
            ? data.error
            : `Recruit request failed (${response.status})`;
        throw new Error(reason);
      }

      const experts = buildExpertsFromBundle(data.bundle.nodes, idea);
      setRecruitPreview(experts);
      setRecruitSource(data.source || "mock");
      appendAuditEvent("AI_EXPERTS_GENERATED", {
        idea,
        expertCount: experts.length,
      });
    } catch (error) {
      setRecruitError(toRecruitErrorMessage(error));
    } finally {
      clearTimeout(timeout);
      setRecruiting(false);
    }
  }

  function handleRecruitToBrainstorm(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (recruitPreview.length === 0) {
      return;
    }

    try {
      const existing = loadStoredArray(RECRUITED_EXPERTS_STORAGE_KEY);
      const existingIds = new Set(existing.map((item) => item?.id).filter(Boolean));
      const additions = recruitPreview.filter(
        (expert) => expert?.id && !existingIds.has(expert.id),
      );
      const next = [...existing, ...additions];
      window.localStorage.setItem(RECRUITED_EXPERTS_STORAGE_KEY, JSON.stringify(next));

      appendAuditEvent("AI_EXPERTS_RECRUITED", {
        addedExperts: additions.length,
        totalExperts: next.length,
      });
      refreshStoredExpertCount();
      setRecruitResult(
        `Recruited to Brainstorm: addedExperts=${additions.length}, totalExperts=${next.length}`,
      );
      setRecruitError("");
    } catch (error) {
      setRecruitError(toRecruitErrorMessage(error));
    }
  }

  useEffect(() => {
    refreshStoredExpertCount();
  }, []);

  return (
    <>
      <Card title="Council Hub" description="Live posture and chamber activity (UI-only mock).">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-red-700/60 bg-red-900/30 px-2 py-1 text-[10px] text-red-200">
            Exposure C
          </span>
          <span className="rounded-md border border-amber-700/60 bg-amber-900/30 px-2 py-1 text-[10px] text-amber-200">
            Determinism
          </span>
          <span className="rounded-md border border-emerald-700/60 bg-emerald-900/30 px-2 py-1 text-[10px] text-emerald-200">
            Freeze: OFF
          </span>
        </div>

        <div className="relative mt-4 h-[340px] overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-b from-neutral-900 to-neutral-950">
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-red-700/60 bg-red-900/25 text-xs font-semibold text-red-200 shadow-xl">
            Council Core
          </div>

          {COUNCIL_MEMBERS.map((member) => (
            <div
              key={member.id}
              className="council-drift absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-red-900/40 bg-neutral-900/85 px-2 py-1.5 shadow-lg"
              style={{ left: member.left, top: member.top, animationDelay: member.delay }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-red-700/60 bg-gradient-to-br from-red-700/60 to-neutral-950 text-[10px] font-semibold text-red-100">
                {member.label.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-100">{member.label}</p>
                <p className="text-[10px] text-slate-400">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="AI Recruiter" description="Generate expert panel from a high-level idea (UI-only storage).">
        <form onSubmit={handleRecruitExperts}>
          <textarea
            value={ideaInput}
            onChange={(event) => setIdeaInput(event.target.value)}
            placeholder="Enter high-level idea (e.g. Land registry app for investors)"
            className="h-20 w-full rounded-xl border border-red-900/40 bg-neutral-900 p-3 text-sm text-slate-100 outline-none"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={recruiting}
              className="rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2 text-sm text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {recruiting ? "Recruiting..." : "Recruit Experts"}
            </button>
            <button
              type="button"
              onClick={handleRecruitToBrainstorm}
              disabled={recruitPreview.length === 0}
              className="rounded-xl border border-red-900/40 bg-neutral-900 px-4 py-2 text-sm hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Recruit to Brainstorm
            </button>
          </div>
        </form>

        <div className="mt-3 text-xs text-slate-400">
          Stored recruited experts: {storedExpertCount}
          {recruitSource ? ` | source=${recruitSource}` : ""}
        </div>

        {recruitError ? (
          <div className="mt-3 rounded-xl border border-red-700/60 bg-red-900/30 px-3 py-2 text-xs text-red-100">
            {recruitError}
          </div>
        ) : null}

        {recruitResult ? (
          <div className="mt-3 rounded-xl border border-emerald-700/60 bg-emerald-900/30 px-3 py-2 text-xs text-emerald-100">
            {recruitResult}
          </div>
        ) : null}

        {recruitPreview.length > 0 ? (
          <div className="mt-3 max-h-[42vh] space-y-2 overflow-auto pr-1">
            {recruitPreview.map((expert) => (
              <article key={expert.id} className="rounded-xl border border-red-900/30 bg-neutral-900/70 p-3">
                <div className="text-sm font-semibold text-slate-100">{expert.title}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  focus: {expert.focusAreas?.length ? expert.focusAreas.join(" | ") : "n/a"}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </Card>

      <Card title="Council Thread" description="Deterministic mock thread. No backend writes.">
        <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
          {COUNCIL_THREAD.map((message) => (
            <article key={message.id} className="rounded-xl border border-red-900/30 bg-neutral-900/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-md border px-2 py-0.5 text-[10px] ${speakerTone(message.speaker)}`}>
                  {message.speaker}
                </span>
                <span className="text-[10px] text-slate-500">{message.stamp}</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">{message.text}</p>
            </article>
          ))}
        </div>
      </Card>

      <Card title="Route Links">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/app">App</Link>
          <span className="text-slate-500">/</span>
          <Link href="/app/views/requirements">Requirements view</Link>
          <span className="text-slate-500">/</span>
          <Link href="/app/nodes">Nodes</Link>
        </nav>
      </Card>

      <style>{`
        .council-drift {
          animation: council-drift 7s ease-in-out infinite;
        }

        @keyframes council-drift {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-6px);
          }
        }
      `}</style>
    </>
  );
}
