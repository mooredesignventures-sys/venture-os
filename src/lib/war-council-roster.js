"use client";

export const WAR_COUNCIL_ROSTER_STORAGE_KEY = "draft_warcouncil:roster";
export const WAR_COUNCIL_ROSTER_UPDATED_EVENT = "war-council-roster:updated";

const RECRUITER_MEMBER = Object.freeze({
  id: "wc_recruiter",
  name: "Recruiter",
  role: "Recruitment Specialist",
  source: "system",
  status: "hired",
  archived: false,
});

function nowIso() {
  return new Date().toISOString();
}

function cloneRecruiter() {
  return {
    id: RECRUITER_MEMBER.id,
    name: RECRUITER_MEMBER.name,
    role: RECRUITER_MEMBER.role,
    source: RECRUITER_MEMBER.source,
    status: RECRUITER_MEMBER.status,
    archived: false,
  };
}

export function getDefaultWarCouncilRoster() {
  return {
    ideaText: "",
    recruiterSummary: "",
    members: [cloneRecruiter()],
    updatedAt: nowIso(),
  };
}

export function ensureRecruiter(roster) {
  const base = roster && typeof roster === "object" ? roster : {};
  const members = Array.isArray(base.members)
    ? base.members.filter((member) => member && typeof member === "object").map((member) => ({
        id: typeof member.id === "string" ? member.id : "",
        name: typeof member.name === "string" ? member.name : "",
        role: typeof member.role === "string" ? member.role : "",
        source: typeof member.source === "string" ? member.source : "user",
        status: typeof member.status === "string" ? member.status : "hired",
        archived: member.archived === true,
      }))
    : [];

  const byId = new Map(members.map((member) => [member.id, member]));
  const recruiter = byId.get(RECRUITER_MEMBER.id);
  const normalizedRecruiter = recruiter
    ? {
        ...recruiter,
        id: RECRUITER_MEMBER.id,
        name: RECRUITER_MEMBER.name,
        role: RECRUITER_MEMBER.role,
        source: RECRUITER_MEMBER.source,
        status: RECRUITER_MEMBER.status,
        archived: false,
      }
    : cloneRecruiter();

  const nextMembers = [normalizedRecruiter];
  for (const member of members) {
    if (!member.id || member.id === RECRUITER_MEMBER.id) {
      continue;
    }
    nextMembers.push(member);
  }

  return {
    ideaText: typeof base.ideaText === "string" ? base.ideaText : "",
    recruiterSummary: typeof base.recruiterSummary === "string" ? base.recruiterSummary : "",
    members: nextMembers,
    updatedAt: typeof base.updatedAt === "string" && base.updatedAt ? base.updatedAt : nowIso(),
  };
}

export function readWarCouncilRoster() {
  if (typeof window === "undefined") {
    return getDefaultWarCouncilRoster();
  }

  try {
    const raw = window.localStorage.getItem(WAR_COUNCIL_ROSTER_STORAGE_KEY);
    if (!raw) {
      return getDefaultWarCouncilRoster();
    }

    return ensureRecruiter(JSON.parse(raw));
  } catch {
    return getDefaultWarCouncilRoster();
  }
}

export function writeWarCouncilRoster(nextRoster) {
  const normalized = ensureRecruiter({
    ...(nextRoster && typeof nextRoster === "object" ? nextRoster : {}),
    updatedAt: nowIso(),
  });

  if (typeof window === "undefined") {
    return normalized;
  }

  window.localStorage.setItem(WAR_COUNCIL_ROSTER_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(WAR_COUNCIL_ROSTER_UPDATED_EVENT));
  return normalized;
}

export function setWarCouncilIdeaText(text) {
  const current = readWarCouncilRoster();
  const nextIdeaText = typeof text === "string" ? text.trim() : "";
  return writeWarCouncilRoster({
    ...current,
    ideaText: nextIdeaText,
  });
}
