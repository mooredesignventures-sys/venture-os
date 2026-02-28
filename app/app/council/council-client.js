"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AiPanel from "../../../src/components/ai-panel";
import WarCouncilRosterStrip from "../../../src/components/war-council-roster-strip";
import Card from "../../../src/components/ui/card";
import EmptyState from "../../../src/components/ui/empty-state";
import { StageBadge } from "../../../src/components/ui/status-badges";

const COUNCIL_AVATAR_STORAGE_KEY = "draft_council:avatars";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";

function readStoredArray(key) {
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
  const existing = readStoredArray(key);
  const createdAt = new Date().toISOString();
  const event = {
    id: `${Date.now()}-${type}`,
    type,
    createdAt,
    payload,
    timestamp: createdAt,
    action: type,
    eventType: type,
    actor: "founder",
  };
  window.localStorage.setItem(key, JSON.stringify([...existing, event]));
}

function toIdPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAvatar(item, index) {
  const rawId = typeof item?.id === "string" ? item.id : "";
  const title = typeof item?.title === "string" && item.title.trim()
    ? item.title.trim()
    : `Council Avatar ${index + 1}`;
  const baseId = rawId || `avatar:${toIdPart(title) || `slot-${index + 1}`}`;
  const id = baseId.startsWith("avatar:") ? baseId : `avatar:${toIdPart(baseId) || `slot-${index + 1}`}`;
  return {
    id,
    type: "Avatar",
    title,
    role: typeof item?.role === "string" && item.role.trim() ? item.role.trim() : (typeof item?.type === "string" && item.type.trim() ? item.type.trim() : "Advisor"),
    stage: "proposed",
    status: "queued",
    version: Number.isFinite(Number(item?.version)) ? Number(item.version) : 1,
    createdAt: typeof item?.createdAt === "string" && item.createdAt ? item.createdAt : new Date().toISOString(),
    createdBy: "ai",
    owner: typeof item?.owner === "string" && item.owner ? item.owner : "founder",
    risk: typeof item?.risk === "string" && item.risk ? item.risk : "medium",
    parentId: null,
    archived: false,
  };
}

function normalizeCouncilProposal(data) {
  const fromScope = Array.isArray(data?.proposedAvatars) ? data.proposedAvatars : [];
  const fallbackNodes = Array.isArray(data?.bundle?.nodes) ? data.bundle.nodes : [];
  const source = fromScope.length > 0 ? fromScope : fallbackNodes;
  const avatars = source.slice(0, 10).map((item, index) => normalizeAvatar(item, index));
  const byId = new Map();
  for (const avatar of avatars) {
    if (!byId.has(avatar.id)) {
      byId.set(avatar.id, avatar);
    }
  }
  return [...byId.values()];
}

function hashToNumber(value) {
  let hash = 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 2147483647;
  }
  return hash;
}

function seedMovingAvatar(avatar, index, width, height) {
  const hash = hashToNumber(avatar.id || `${index}`);
  const x = 40 + (hash % Math.max(60, width - 80));
  const y = 40 + ((Math.floor(hash / 17) % Math.max(60, height - 80)));
  const baseSpeed = 0.22 + ((hash % 9) * 0.03);
  const vx = (hash % 2 === 0 ? 1 : -1) * baseSpeed;
  const vy = (hash % 3 === 0 ? 1 : -1) * (baseSpeed * 0.9);
  return { ...avatar, x, y, vx, vy };
}

function useMovingAvatars(avatars, arenaRef) {
  const [moving, setMoving] = useState([]);
  const stateRef = useRef([]);

  useEffect(() => {
    const width = arenaRef.current?.offsetWidth || 860;
    const height = arenaRef.current?.offsetHeight || 380;
    const seeded = avatars.map((avatar, index) => seedMovingAvatar(avatar, index, width, height));
    stateRef.current = seeded;
  }, [avatars, arenaRef]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const width = arenaRef.current?.offsetWidth || 860;
      const height = arenaRef.current?.offsetHeight || 380;
      if (!Array.isArray(stateRef.current) || stateRef.current.length === 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const next = stateRef.current.map((avatar) => {
        let x = avatar.x + avatar.vx;
        let y = avatar.y + avatar.vy;
        let vx = avatar.vx;
        let vy = avatar.vy;

        if (x < 46 || x > width - 46) {
          vx = -vx;
          x = Math.max(46, Math.min(width - 46, x));
        }
        if (y < 34 || y > height - 34) {
          vy = -vy;
          y = Math.max(34, Math.min(height - 34, y));
        }

        return { ...avatar, x, y, vx, vy };
      });

      stateRef.current = next;
      setMoving(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [arenaRef]);

  return moving;
}

export default function CouncilClient() {
  const arenaRef = useRef(null);
  const [ventureIdea, setVentureIdea] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      id: "council:init:assistant",
      role: "assistant",
      text: "Share your venture idea and I will draft proposed Council avatars.",
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [preview, setPreview] = useState(null);
  const [applyResult, setApplyResult] = useState("");
  const [avatars, setAvatars] = useState([]);

  useEffect(() => {
    setAvatars(readStoredArray(COUNCIL_AVATAR_STORAGE_KEY));
  }, []);

  const movingAvatars = useMovingAvatars(avatars, arenaRef);
  const totalActive = useMemo(
    () =>
      avatars.filter((avatar) => avatar?.stage === "proposed" && avatar?.archived !== true).length,
    [avatars],
  );

  async function handleSend() {
    const prompt = ventureIdea.trim();
    if (!prompt) {
      setErrorMessage("Enter a venture idea before sending.");
      return;
    }

    setErrorMessage("");
    setApplyResult("");
    setIsGenerating(true);
    setMessages((previous) => [
      ...previous,
      { id: `council:founder:${Date.now()}`, role: "founder", text: prompt },
    ]);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "business",
          scope: "council",
          prompt,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const source = response.headers.get("X-AI-Mode") === "ai" ? "ai" : (data?.source || "mock");
      const fallbackReason = typeof data?.fallbackReason === "string" ? data.fallbackReason : "";
      const proposedAvatars = normalizeCouncilProposal(data);
      if (!response.ok || !data?.ok || proposedAvatars.length === 0) {
        throw new Error(data?.error || "Failed to recruit council avatars.");
      }

      const assistantText =
        typeof data?.assistantText === "string" && data.assistantText
          ? data.assistantText
          : `Prepared ${proposedAvatars.length} proposed avatars for council review.`;
      setPreview({
        source,
        fallbackReason,
        assistantText,
        proposedAvatars,
      });
      setVentureIdea("");
      setMessages((previous) => [
        ...previous,
        { id: `council:assistant:${Date.now()}`, role: "assistant", text: assistantText },
      ]);

      appendAuditEvent("ai_generate", {
        scope: "council",
        source,
        fallbackReason,
        avatarCount: proposedAvatars.length,
        prompt,
      });
    } catch (error) {
      setPreview(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to recruit council avatars.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleApply() {
    if (!preview || !Array.isArray(preview.proposedAvatars) || preview.proposedAvatars.length === 0) {
      setErrorMessage("Send a venture idea first.");
      return;
    }

    const existing = readStoredArray(COUNCIL_AVATAR_STORAGE_KEY);
    const existingIds = new Set(existing.map((avatar) => avatar?.id).filter((id) => typeof id === "string"));
    const additions = [];
    for (const avatar of preview.proposedAvatars) {
      if (!avatar?.id || existingIds.has(avatar.id)) {
        continue;
      }
      additions.push(avatar);
      existingIds.add(avatar.id);
    }
    const next = [...existing, ...additions];
    window.localStorage.setItem(COUNCIL_AVATAR_STORAGE_KEY, JSON.stringify(next));
    setAvatars(next);
    setErrorMessage("");
    setApplyResult(
      `Applied council avatars: added=${additions.length}, total=${next.length}`,
    );

    appendAuditEvent("ai_apply", {
      scope: "council",
      source: preview.source || "mock",
      fallbackReason: preview.fallbackReason || "",
      addedAvatars: additions.length,
      totalAvatars: next.length,
    });
  }

  function handleIdeaSaved(ideaText) {
    appendAuditEvent("war_council_idea_updated", {
      ideaText: typeof ideaText === "string" ? ideaText : "",
    });
  }

  return (
    <>
      <Card title="War Council Roster" description="Call to Arms and persistent core team">
        <WarCouncilRosterStrip editable onIdeaSaved={handleIdeaSaved} />
      </Card>

      <Card title="Council Canvas" description="Proposed avatars move in the chamber after Apply.">
        <p>
          Active proposed avatars: {totalActive}
        </p>
        <div
          ref={arenaRef}
          className="relative mt-3 h-[380px] overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-b from-neutral-900 to-neutral-950"
        >
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-red-700/60 bg-red-900/25 text-xs font-semibold text-red-200 shadow-xl">
            Council Core
          </div>

          {movingAvatars.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="max-w-sm">
                <EmptyState
                  title="Council chamber is empty"
                  message="Recruit your council by sending a venture idea, then Apply."
                />
              </div>
            </div>
          ) : (
            movingAvatars.map((avatar) => (
              <div
                key={avatar.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border border-red-900/50 bg-neutral-900/90 px-3 py-2 shadow-lg"
                style={{ left: avatar.x, top: avatar.y }}
              >
                <div className="text-[11px] font-semibold text-slate-100">{avatar.title}</div>
                <div className="text-[10px] text-slate-400">{avatar.role}</div>
                <StageBadge stage={avatar.stage || "proposed"} />
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="AI Recruiter" description="Generate proposed avatars from your venture idea.">
        <AiPanel
          title="Council AI Recruiter"
          subtitle="Generate proposed avatars from your venture idea."
          messages={messages}
          inputValue={ventureIdea}
          inputPlaceholder="Enter venture idea for council recruiting"
          onInputChange={setVentureIdea}
          onSend={() => {
            void handleSend();
          }}
          onApply={handleApply}
          canSend={Boolean(ventureIdea.trim())}
          canApply={Boolean(
            preview &&
              Array.isArray(preview.proposedAvatars) &&
              preview.proposedAvatars.length > 0,
          )}
          loading={isGenerating}
          errorMessage={errorMessage}
          resultMessage={applyResult}
          source={preview?.source || ""}
          fallbackReason={preview?.fallbackReason || ""}
          lastProposalSummary={
            preview
              ? `${preview.assistantText} (proposedAvatars=${preview.proposedAvatars.length})`
              : ""
          }
          emptyTitle="Council is empty"
          emptyMessage="Recruit your council."
          renderPreview={
            preview
              ? () => (
                  <ul>
                    {preview.proposedAvatars.map((avatar) => (
                      <li key={avatar.id}>
                        <StageBadge stage={avatar.stage || "proposed"} /> {avatar.title} ({avatar.role})
                      </li>
                    ))}
                  </ul>
                )
              : null
          }
        />
      </Card>

      <Card title="Route Links">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/app/brainstorm">Brainstorm</Link>
          <span className="text-slate-500">/</span>
          <Link href="/app/views/requirements">Requirements</Link>
        </nav>
      </Card>
    </>
  );
}
