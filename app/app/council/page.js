import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppNav from "../../../src/components/app-nav";
import AppShell from "../../../src/components/ui/app-shell";
import Card from "../../../src/components/ui/card";

export const dynamic = "force-dynamic";

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

export default async function CouncilPage() {
  const cookieStore = await cookies();
  const hasEntered = cookieStore.get("temp_app_access")?.value === "1";

  if (!hasEntered) {
    redirect("/login");
  }

  return (
    <AppShell
      grid
      title="War Council Room"
      description="Council alignment hub with deterministic mock briefings."
    >
      <Card>
        <AppNav current="/app/council" />
      </Card>

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
          <div className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
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

      <style jsx>{`
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
    </AppShell>
  );
}
