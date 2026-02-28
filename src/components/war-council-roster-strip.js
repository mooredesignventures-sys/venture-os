"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  WAR_COUNCIL_ROSTER_UPDATED_EVENT,
  getDefaultWarCouncilRoster,
  readWarCouncilRoster,
  setWarCouncilIdeaText,
} from "../lib/war-council-roster";

export default function WarCouncilRosterStrip({ editable = false, onIdeaSaved = null }) {
  const [roster, setRoster] = useState(() => getDefaultWarCouncilRoster());
  const [ideaInput, setIdeaInput] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const activeMembers = useMemo(
    () => roster.members.filter((member) => member.archived !== true),
    [roster.members],
  );

  const ideaText = typeof roster.ideaText === "string" ? roster.ideaText.trim() : "";
  const showRecruitCta = !ideaText || activeMembers.length <= 1;

  useEffect(() => {
    function syncRoster() {
      const next = readWarCouncilRoster();
      setRoster(next);
      setIdeaInput(next.ideaText || "");
    }

    if (typeof window === "undefined") {
      return () => {};
    }

    syncRoster();
    window.addEventListener("storage", syncRoster);
    window.addEventListener(WAR_COUNCIL_ROSTER_UPDATED_EVENT, syncRoster);
    return () => {
      window.removeEventListener("storage", syncRoster);
      window.removeEventListener(WAR_COUNCIL_ROSTER_UPDATED_EVENT, syncRoster);
    };
  }, []);

  function handleSave() {
    const next = setWarCouncilIdeaText(ideaInput);
    setRoster(next);
    setIdeaInput(next.ideaText || "");
    setSaveMessage("Saved");
    if (typeof onIdeaSaved === "function") {
      onIdeaSaved(next.ideaText || "");
    }
  }

  return (
    <section className="warcouncil-roster-strip vo-surface">
      <header className="warcouncil-roster-strip__header">
        <p className="warcouncil-roster-strip__eyebrow">War Council Roster</p>
        <h3 className="warcouncil-roster-strip__title">
          {ideaText ? ideaText : "No idea yet"}
        </h3>
      </header>

      <div className="warcouncil-roster-strip__members">
        {activeMembers.map((member) => (
          <span key={member.id} className="warcouncil-roster-strip__chip">
            {member.name} - {member.role}
          </span>
        ))}
      </div>

      {editable ? (
        <div className="warcouncil-roster-strip__editor">
          <label htmlFor="warcouncil-idea-text">Call to Arms</label>
          <input
            id="warcouncil-idea-text"
            value={ideaInput}
            onChange={(event) => {
              setIdeaInput(event.target.value);
              setSaveMessage("");
            }}
            placeholder="Describe your venture idea"
          />
          <p>
            <button type="button" onClick={handleSave}>
              Save Idea
            </button>
            {saveMessage ? <span className="warcouncil-roster-strip__saved"> {saveMessage}</span> : null}
          </p>
        </div>
      ) : null}

      {showRecruitCta ? (
        <p className="warcouncil-roster-strip__cta">
          <Link href="/app/council">Recruit your War Council</Link>
        </p>
      ) : null}
    </section>
  );
}
