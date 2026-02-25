"use client";

import { useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";

const AUDIT_STORAGE_KEY = "draft_audit_log";

function loadAuditEntries() {
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AuditClient() {
  const [entries] = useState(loadAuditEntries);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No audit entries yet."
        message="Commit a node in Nodes to create the first audit event."
      />
    );
  }

  const ordered = [...entries].sort((a, b) =>
    String(b.timestamp || "").localeCompare(String(a.timestamp || ""))
  );

  return (
    <ul>
      {ordered.map((entry, index) => (
        <li key={`${entry.timestamp}-${entry.nodeId}-${index}`}>
          {entry.timestamp} | {entry.action} | {entry.nodeId} | {entry.nodeTitle}
        </li>
      ))}
    </ul>
  );
}
