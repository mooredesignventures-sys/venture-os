"use client";

import { useState } from "react";

const TEMPLATES = {
  decision: `Proposal Type: Decision
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
  requirement: `Proposal Type: Requirement
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
  kpi: `Proposal Type: KPI
Title:
Rationale:
Assumptions:
Success criteria:
Risks:
Next steps:
`,
};

export default function ProposalsClient() {
  const [text, setText] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  function generate(templateKey) {
    setText(TEMPLATES[templateKey]);
    setCopyMessage("");
  }

  async function copyText() {
    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("Copied.");
    } catch {
      setCopyMessage("Copy failed.");
    }
  }

  function clearText() {
    setText("");
    setCopyMessage("");
  }

  return (
    <section>
      <p>
        <button type="button" onClick={() => generate("decision")}>
          Propose a Decision
        </button>{" "}
        <button type="button" onClick={() => generate("requirement")}>
          Propose a Requirement
        </button>{" "}
        <button type="button" onClick={() => generate("kpi")}>
          Propose a KPI
        </button>
      </p>

      <textarea value={text} readOnly rows={12} cols={70} />
      <br />
      <button type="button" onClick={copyText}>
        Copy to clipboard
      </button>{" "}
      <button type="button" onClick={clearText}>
        Clear
      </button>
      {copyMessage ? <p>{copyMessage}</p> : null}
    </section>
  );
}
