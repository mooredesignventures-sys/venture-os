"use client";

// 🔒 LOCKED BASELINE (Brainstorm War Room UI)
// Known-good tag: brainstorm-maturity-v1 (commit d9d528a)
// If changes are needed: duplicate to brainstorm-client.v2.js and update imports.
// Avoid in-place edits unless fixing a bug/regression.

import { useEffect, useMemo, useRef, useState } from "react";
import Card, { CardContent } from "../../../src/components/ui/card";

const DRAFT_NODE_STORAGE_KEY = "draft_nodes";
const DRAFT_EDGE_STORAGE_KEY = "draft_edges";

function classNames(...values) {
  return values.filter(Boolean).join(" ");
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function agentBadgeTone(name) {
  const tones = [
    "from-red-700/60 to-red-950/80 border-red-800/70",
    "from-amber-700/60 to-neutral-950 border-amber-800/70",
    "from-indigo-700/55 to-neutral-950 border-indigo-800/70",
    "from-cyan-700/50 to-neutral-950 border-cyan-800/70",
    "from-fuchsia-700/50 to-neutral-950 border-fuchsia-800/70",
  ];
  const value = String(name || "")
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return tones[value % tones.length];
}

function clusterPill(cluster) {
  const map = {
    Core: "bg-red-900/40 border-red-700/40 text-red-200",
    Scoring: "bg-amber-900/35 border-amber-700/40 text-amber-200",
    Growth: "bg-indigo-900/35 border-indigo-700/40 text-indigo-200",
    Revenue: "bg-emerald-900/30 border-emerald-700/40 text-emerald-200",
    Ops: "bg-slate-800/40 border-slate-600/40 text-slate-200",
    Governance: "bg-fuchsia-900/25 border-fuchsia-700/40 text-fuchsia-200",
    Compute: "bg-cyan-900/25 border-cyan-700/40 text-cyan-200",
  };
  return map[cluster] || "bg-slate-800/40 border-slate-600/40 text-slate-200";
}

function decisionStateBadge(state) {
  if (state === "Accepted") {
    return "border-emerald-700/50 bg-emerald-900/35 text-emerald-200";
  }
  return "border-red-700/50 bg-red-900/35 text-red-200";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createSeedNodes(items, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  return items.map((item, index) => {
    const angle = (index / Math.max(1, items.length)) * Math.PI * 2;
    const radius = 155 + (index % 3) * 35;
    return {
      ...item,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: Math.cos(angle) * 0.12,
      vy: Math.sin(angle) * 0.12,
    };
  });
}

function useGravityNodes(items, arenaRef) {
  const [nodes, setNodes] = useState(() => createSeedNodes(items, 900, 520));
  const nodesRef = useRef(nodes);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const width = arenaRef.current?.offsetWidth || 900;
    const height = arenaRef.current?.offsetHeight || 520;
    nodesRef.current = createSeedNodes(items, width, height);
  }, [items, arenaRef]);

  useEffect(() => {
    let raf = 0;

    const step = () => {
      const width = arenaRef.current?.offsetWidth || 900;
      const height = arenaRef.current?.offsetHeight || 520;
      const cx = width / 2;
      const cy = height / 2;
      const arr = nodesRef.current.map((node) => ({ ...node }));

      if (arr.length === 0) {
        raf = requestAnimationFrame(step);
        return;
      }

      for (let i = 0; i < arr.length; i += 1) {
        for (let j = i + 1; j < arr.length; j += 1) {
          const a = arr[i];
          const b = arr[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = Math.max(64, dx * dx + dy * dy);
          const force = 650 / d2;
          a.vx -= dx * force * 0.0007;
          a.vy -= dy * force * 0.0007;
          b.vx += dx * force * 0.0007;
          b.vy += dy * force * 0.0007;
        }
      }

      for (const node of arr) {
        node.vx += (cx - node.x) * 0.00055;
        node.vy += (cy - node.y) * 0.00055;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.94;
        node.vy *= 0.94;
        node.x = clamp(node.x, 60, width - 60);
        node.y = clamp(node.y, 60, height - 60);
      }

      nodesRef.current = arr;
      setNodes(arr);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [arenaRef]);

  return nodes;
}

export default function BrainstormClient() {
  const [message, setMessage] = useState("");
  const [draftPrompt, setDraftPrompt] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftResult, setDraftResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [decisionFilter, setDecisionFilter] = useState("All");
  const [fullscreen, setFullscreen] = useState(null);
  const arenaRef = useRef(null);
  const fullscreenArenaRef = useRef(null);
  const nextIdeaIdRef = useRef(1000);

  const team = useMemo(
    () => [
      { name: "Sarah Chen", role: "Tech Lead" },
      { name: "Marcus Hale", role: "Governance Architect" },
      { name: "Aisha Rahman", role: "Risk Strategist" },
      { name: "Leo Grant", role: "Revenue Engineer" },
      { name: "Elena Kovac", role: "Stability Analyst" },
    ],
    [],
  );

  const initialIdeas = useMemo(
    () => [
      { id: "idea:1", label: "LandReg: Temporal unregistered detection", cluster: "Core" },
      { id: "idea:2", label: "CUPI persistence scoring", cluster: "Scoring" },
      { id: "idea:3", label: "Market Contrast Multiplier", cluster: "Scoring" },
      { id: "idea:4", label: "Gamified drops + credits", cluster: "Growth" },
      { id: "idea:5", label: "Investor SPV pipeline", cluster: "Revenue" },
      { id: "idea:6", label: "Solicitor pack automation", cluster: "Ops" },
      { id: "idea:7", label: "Drift monitoring baseline vs live", cluster: "Governance" },
      { id: "idea:8", label: "Quarterly full recompute", cluster: "Compute" },
    ],
    [],
  );
  const [ideasState, setIdeasState] = useState(initialIdeas);

  const decisions = useMemo(
    () => [
      { id: "d1", title: "Determinism Level = Strict", state: "Locked" },
      { id: "d2", title: "Exposure Level = C", state: "Locked" },
      { id: "d3", title: "Overnight Refactor Disabled", state: "Locked" },
      { id: "d4", title: "Freeze Threshold ~= 90%", state: "Accepted" },
    ],
    [],
  );

  const visibleDecisions = useMemo(() => {
    if (decisionFilter === "All") {
      return decisions;
    }
    return decisions.filter((entry) => entry.state === decisionFilter);
  }, [decisionFilter, decisions]);

  const activeArenaRef = fullscreen === "map" ? fullscreenArenaRef : arenaRef;
  const nodes = useGravityNodes(ideasState, activeArenaRef);
  const preview = useMemo(() => {
    if (!draftResult?.bundle) {
      return null;
    }

    const nodes = Array.isArray(draftResult.bundle.nodes) ? draftResult.bundle.nodes : [];
    const edges = Array.isArray(draftResult.bundle.edges) ? draftResult.bundle.edges : [];
    const titleById = new Map(nodes.map((node) => [node.id, node.title]));

    return {
      source: draftResult.source || "mock",
      nodes,
      edges,
      titleById,
    };
  }, [draftResult]);

  function handleNewIdea() {
    const newIdea = {
      id: `idea:new:${nextIdeaIdRef.current++}`,
      label: `New idea: ${new Date().toLocaleTimeString()}`,
      cluster: "Core",
    };
    setIdeasState((previous) => [newIdea, ...previous]);
  }

  function openFullscreen(mode) {
    setFullscreen(mode);
  }

  function closeFullscreen() {
    setFullscreen(null);
  }

  async function handleGenerateDraft() {
    const prompt = draftPrompt.trim();
    if (!prompt) {
      setDraftError("Enter a brainstorm prompt before generating a draft.");
      return;
    }

    setDraftLoading(true);
    setDraftError("");
    setApplyResult(null);

    try {
      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "requirements" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.bundle) {
        throw new Error(data?.error || "Failed to generate draft bundle.");
      }

      setDraftResult(data);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : "Failed to generate draft bundle.");
    } finally {
      setDraftLoading(false);
    }
  }

  function readStoredArray(key) {
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

  function handleApplyDraft() {
    if (!preview) {
      setDraftError("Generate a draft first.");
      return;
    }

    setDraftError("");

    const storedNodes = readStoredArray(DRAFT_NODE_STORAGE_KEY);
    const storedEdges = readStoredArray(DRAFT_EDGE_STORAGE_KEY);
    const nodeIds = new Set(storedNodes.map((node) => node?.id).filter(Boolean));
    const edgeIds = new Set(storedEdges.map((edge) => edge?.id).filter(Boolean));

    let addedNodes = 0;
    let addedEdges = 0;
    const nextNodes = [...storedNodes];
    const nextEdges = [...storedEdges];

    for (const node of preview.nodes) {
      if (!node?.id || nodeIds.has(node.id)) {
        continue;
      }
      nodeIds.add(node.id);
      nextNodes.push(node);
      addedNodes += 1;
    }

    for (const edge of preview.edges) {
      if (!edge?.id || edgeIds.has(edge.id)) {
        continue;
      }
      edgeIds.add(edge.id);
      nextEdges.push(edge);
      addedEdges += 1;
    }

    window.localStorage.setItem(DRAFT_NODE_STORAGE_KEY, JSON.stringify(nextNodes));
    window.localStorage.setItem(DRAFT_EDGE_STORAGE_KEY, JSON.stringify(nextEdges));

    setApplyResult({
      addedNodes,
      addedEdges,
      totalNodes: nextNodes.length,
      totalEdges: nextEdges.length,
    });
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        closeFullscreen();
      }
    }

    if (fullscreen) {
      window.addEventListener("keydown", onKeyDown);
    }

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreen]);

  function renderMapPanel(mode) {
    const isFullscreen = mode === "fullscreen";

    return (
      <Card
        className={classNames(
          "rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl",
          isFullscreen ? "h-full" : "",
        )}
      >
        <CardContent>
          <div className={classNames(isFullscreen ? "flex h-full min-h-0 flex-col" : "")}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-red-400">Idea Gravity Map</div>
                <div className="text-[11px] text-slate-400">UI-only drift - no drag yet</div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl border border-red-900/40 bg-neutral-900 px-3 py-2 text-xs hover:border-amber-400">
                  Branch Topic
                </button>
                <button className="rounded-xl border border-red-900/40 bg-neutral-900 px-3 py-2 text-xs hover:border-amber-400">
                  Merge Themes
                </button>
                <button
                  type="button"
                  onClick={() => openFullscreen("map")}
                  className="rounded-xl border border-red-900/40 bg-neutral-900 px-3 py-2 text-xs hover:border-amber-400"
                >
                  Fullscreen
                </button>
              </div>
            </div>

            <div
              ref={isFullscreen ? fullscreenArenaRef : arenaRef}
              className={classNames(
                "relative mt-4 overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-b from-neutral-900/60 to-neutral-950",
                isFullscreen ? "h-full min-h-0 flex-1" : "h-[300px]",
              )}
              style={{ perspective: "900px" }}
            >
              <div
                className="absolute inset-0 opacity-[0.18]"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "56px 56px",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-black/60" />

              {nodes.map((node, index) => (
                <div
                  key={node.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: node.x,
                    top: node.y,
                    transform: `translate(-50%, -50%) translateZ(${(index % 5) * 4}px)`,
                  }}
                >
                  <div className="w-[220px] rounded-xl border border-red-900/45 bg-neutral-950/90 p-2 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-[11px] font-semibold text-slate-200">
                        {node.label}
                      </div>
                      <span
                        className={classNames(
                          "rounded-md border px-1.5 py-0.5 text-[9px]",
                          clusterPill(node.cluster),
                        )}
                      >
                        {node.cluster}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <button
                type="button"
                onClick={handleNewIdea}
                className="rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2 text-white shadow-lg"
              >
                New Idea
              </button>
              <button className="rounded-xl border border-red-900/40 bg-neutral-900 px-4 py-2 hover:border-amber-400">
                Branch Topic
              </button>
              <button className="rounded-xl border border-red-900/40 bg-neutral-900 px-4 py-2 hover:border-amber-400">
                Merge Themes
              </button>
              <button className="rounded-xl border border-red-900/40 bg-neutral-900 px-4 py-2 hover:border-amber-400">
                Park Idea
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderChatPanel(mode) {
    const isFullscreen = mode !== "normal";
    const isMapFullscreen = mode === "mapFullscreen";

    return (
      <Card
        className={classNames(
          "rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl",
          isMapFullscreen ? "h-full" : "",
        )}
      >
        <CardContent>
          <div className={classNames(isMapFullscreen ? "flex h-full min-h-0 flex-col" : "")}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-red-400">Founder - Team Chat</div>
              <button
                type="button"
                onClick={() => openFullscreen("chat")}
                className="rounded-xl border border-red-900/40 bg-neutral-900 px-3 py-1.5 text-xs hover:border-amber-400"
              >
                Fullscreen
              </button>
            </div>
            <div
              className={classNames(
                "mt-3 overflow-auto rounded-2xl border border-red-900/25 bg-neutral-900/70 p-2 text-sm text-slate-200",
                isMapFullscreen ? "h-full min-h-0 flex-1" : "",
                isFullscreen && !isMapFullscreen ? "h-[65vh]" : "",
                !isFullscreen ? "h-20" : "",
              )}
            >
              <div>
                <span className="font-medium text-red-400">Founder:</span> Lock next 3 decisions to
                raise stability.
              </div>
              <div className="mt-1">
                <span className="font-medium text-amber-300">Governance:</span> Confirm decision
                object model fields.
              </div>
              <div className="mt-1">
                <span className="font-medium text-indigo-300">Tech:</span> Ensure no silent
                refactors on builds.
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="flex-1 rounded-xl border border-red-900/25 bg-neutral-900 px-4 py-2 text-sm outline-none"
                placeholder="Message the team..."
              />
              <button className="rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-5 py-2 text-white shadow-lg">
                Send
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <Card className="rounded-2xl border border-red-900/50 bg-neutral-950 shadow-xl">
            <CardContent>
              <div className="text-[11px] text-slate-400">Early Financial Projection</div>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 p-3">
                  <div className="text-[10px] text-slate-400">MRR Target</div>
                  <div className="font-semibold text-red-300">GBP 25k</div>
                </div>
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 p-3">
                  <div className="text-[10px] text-slate-400">CAC (est.)</div>
                  <div className="font-semibold text-amber-300">GBP 14</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-2xl border border-red-900/50 bg-neutral-950 shadow-xl">
            <CardContent>
              <div className="text-[11px] text-slate-400">Reference Capture</div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                  Competitor: propertydata.co.uk
                </div>
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                  Docs: HMLR BG Tech Docs
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-2xl border border-red-900/50 bg-neutral-950 shadow-xl">
            <CardContent>
              <div className="text-[11px] text-slate-400">Reusable Assets</div>
              <div className="mt-2 text-xs text-slate-300">Overlaps detected:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-lg border border-red-900/25 bg-neutral-900 px-2 py-1 text-[11px]">
                  Map UI
                </span>
                <span className="rounded-lg border border-red-900/25 bg-neutral-900 px-2 py-1 text-[11px]">
                  Credits
                </span>
                <span className="rounded-lg border border-red-900/25 bg-neutral-900 px-2 py-1 text-[11px]">
                  Stability
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="rounded-2xl border border-red-900/50 bg-neutral-950 shadow-xl">
            <CardContent>
              <div className="text-[11px] text-slate-400">Parking Vault</div>
              <div className="mt-2 space-y-2 text-xs">
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                  Idea: Token grants program
                </div>
                <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                  Decision: Expand to TikTok
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="md:col-span-3">
          <Card className="rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl">
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-red-400">Idea Generation Team</div>
                <div className="text-[10px] text-slate-500">Live</div>
              </div>
              <div className="mt-4 max-h-[240px] space-y-3 overflow-auto pr-1">
                {team.map((agent) => (
                  <div
                    key={agent.name}
                    className="flex items-center gap-3 rounded-xl border border-red-900/25 bg-neutral-900 p-2"
                  >
                    <div
                      className={classNames(
                        "flex h-12 w-12 items-center justify-center rounded-lg border bg-gradient-to-br text-xs font-semibold text-slate-100 shadow-inner",
                        agentBadgeTone(agent.name),
                      )}
                    >
                      {initials(agent.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-semibold text-slate-200">{agent.name}</div>
                      <div className="truncate text-[10px] text-slate-400">{agent.role}</div>
                      <div className="mt-1 h-1.5 w-[120px] overflow-hidden rounded bg-red-900/30">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-amber-500"
                          style={{ width: `${24 + (agent.name.length % 40)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 md:col-span-6">
          {renderMapPanel("normal")}
          {renderChatPanel("normal")}

          <Card className="rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl">
            <CardContent>
              <div className="text-sm font-semibold text-red-400">AI Draft (Proposed-only)</div>
              <div className="mt-2 text-xs text-slate-400">
                Generate a proposed draft bundle, preview it, then apply to local draft graph.
              </div>

              <textarea
                value={draftPrompt}
                onChange={(event) => setDraftPrompt(event.target.value)}
                placeholder="Describe the brainstorm direction for requirements draft generation..."
                className="mt-3 h-24 w-full resize-none rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2 text-sm text-slate-100 outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateDraft}
                  disabled={draftLoading}
                  className="rounded-xl bg-gradient-to-r from-red-600 to-amber-500 px-4 py-2 text-sm text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {draftLoading ? "Generating..." : "Generate Draft"}
                </button>
                <button
                  type="button"
                  onClick={handleApplyDraft}
                  disabled={!preview}
                  className="rounded-xl border border-red-900/40 bg-neutral-900 px-4 py-2 text-sm hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Apply to Draft Graph
                </button>
              </div>

              {draftError ? (
                <div className="mt-3 rounded-xl border border-red-700/60 bg-red-900/25 px-3 py-2 text-xs text-red-100">
                  {draftError}
                </div>
              ) : null}

              {applyResult ? (
                <div className="mt-3 rounded-xl border border-emerald-700/60 bg-emerald-900/20 px-3 py-2 text-xs text-emerald-100">
                  Applied draft bundle: addedNodes={applyResult.addedNodes}, addedEdges=
                  {applyResult.addedEdges}, totalNodes={applyResult.totalNodes}, totalEdges=
                  {applyResult.totalEdges}
                </div>
              ) : null}

              {preview ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2 text-slate-200">
                    source={preview.source} • nodes={preview.nodes.length} • edges=
                    {preview.edges.length}
                  </div>

                  <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                    <div className="font-semibold text-slate-200">Nodes (read-only)</div>
                    <div className="mt-2 max-h-32 space-y-1 overflow-auto pr-1 text-slate-300">
                      {preview.nodes.map((node) => (
                        <div key={node.id} className="truncate">
                          [{node.type}] {node.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-red-900/25 bg-neutral-900 px-3 py-2">
                    <div className="font-semibold text-slate-200">Edges (read-only)</div>
                    <div className="mt-2 max-h-28 space-y-1 overflow-auto pr-1 text-slate-300">
                      {preview.edges.map((edge) => {
                        const fromLabel = preview.titleById.get(edge.from) || edge.from;
                        const toLabel = preview.titleById.get(edge.to) || edge.to;
                        return (
                          <div key={edge.id} className="truncate">
                            {edge.relationshipType}: {fromLabel} -&gt; {toLabel}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl">
            <CardContent>
              <div className="text-sm font-semibold text-red-400">Decision Log</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["All", "Locked", "Accepted"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDecisionFilter(option)}
                    className={classNames(
                      "rounded-lg border px-2 py-1 text-[10px]",
                      decisionFilter === option
                        ? "border-amber-500/70 bg-amber-900/20 text-amber-200"
                        : "border-red-900/40 bg-neutral-900 text-slate-300 hover:border-amber-500/60",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
                {visibleDecisions.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl border border-red-900/25 bg-neutral-900 p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-slate-200">
                        {entry.title}
                      </div>
                      <span
                        className={classNames(
                          "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px]",
                          decisionStateBadge(entry.state),
                        )}
                      >
                        {entry.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {fullscreen ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="h-[90vh] w-[95vw] max-w-6xl rounded-2xl border border-red-900/60 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-900/40 px-4 py-3">
              <div className="text-sm font-semibold text-red-300">
                {fullscreen === "map" ? "Gravity Map (Fullscreen)" : "Chat (Fullscreen)"}
              </div>
              <button
                type="button"
                onClick={closeFullscreen}
                className="rounded-xl border border-red-900/40 bg-neutral-900 px-3 py-1.5 text-xs hover:border-amber-400"
              >
                Close
              </button>
            </div>
            <div className="h-[calc(90vh-57px)] overflow-hidden p-4">
              {fullscreen === "map" ? (
                <div className="flex h-full flex-col gap-4">
                  <div className="min-h-0 flex-1">{renderMapPanel("fullscreen")}</div>
                  <div className="h-[28vh] min-h-[220px]">{renderChatPanel("mapFullscreen")}</div>
                </div>
              ) : (
                <div className="h-full">{renderChatPanel("fullscreen")}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
