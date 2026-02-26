"use client";

import { useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const AUDIT_STORAGE_KEY = "draft_audit_log";

function normalizeAuditEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const action =
    typeof entry.action === "string" && entry.action
      ? entry.action
      : typeof entry.eventType === "string" && entry.eventType
        ? entry.eventType
        : "UNKNOWN_EVENT";

  return {
    ...entry,
    timestamp: typeof entry.timestamp === "string" ? entry.timestamp : "unknown-time",
    action,
    eventType:
      typeof entry.eventType === "string" && entry.eventType ? entry.eventType : action,
    actor: typeof entry.actor === "string" && entry.actor ? entry.actor : "unknown",
    nodeId: typeof entry.nodeId === "string" ? entry.nodeId : "",
    edgeId: typeof entry.edgeId === "string" ? entry.edgeId : "",
    nodeTitle: typeof entry.nodeTitle === "string" ? entry.nodeTitle : "",
  };
}

function loadAuditEntries() {
  try {
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((entry) => normalizeAuditEntry(entry)).filter((entry) => entry !== null)
      : [];
  } catch {
    return [];
  }
}

export default function AuditClient() {
  const [entries] = useState(loadAuditEntries);
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

  const eventTypeOptions = useMemo(() => {
    const eventTypes = [...new Set(entries.map((entry) => entry.eventType))].sort();
    return [
      { value: "all", label: "All events" },
      ...eventTypes.map((eventType) => ({ value: eventType, label: eventType })),
    ];
  }, [entries]);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No audit entries yet."
        message="Commit a node in Nodes to create the first audit event."
      />
    );
  }

  const filtered = entries.filter((entry) => {
    if (eventTypeFilter !== "all" && entry.eventType !== eventTypeFilter) {
      return false;
    }

    const term = search.trim().toLowerCase();
    if (!term) {
      return true;
    }

    const haystack = [
      entry.eventType,
      entry.action,
      entry.actor,
      entry.nodeId,
      entry.edgeId,
      entry.nodeTitle,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });

  const ordered = [...filtered].sort((a, b) =>
    String(b.timestamp).localeCompare(String(a.timestamp))
  );

  if (ordered.length === 0) {
    return (
      <section className="audit-feed">
        <div className="filters-grid">
          <SearchBox
            id="audit-search"
            label="Search audit events"
            value={search}
            onChange={setSearch}
          />
          <SelectFilter
            id="audit-event-type"
            label="Event type"
            value={eventTypeFilter}
            onChange={setEventTypeFilter}
            options={eventTypeOptions}
          />
        </div>
        <EmptyState
          title="No audit entries match the current filters."
          message="Adjust search or event type filters to see matching entries."
        />
      </section>
    );
  }

  return (
    <section className="audit-feed">
      <p className="vo-meta">
        Showing {ordered.length} of {entries.length} audit events.
      </p>
      <div className="filters-grid">
        <SearchBox
          id="audit-search"
          label="Search audit events"
          value={search}
          onChange={setSearch}
        />
        <SelectFilter
          id="audit-event-type"
          label="Event type"
          value={eventTypeFilter}
          onChange={setEventTypeFilter}
          options={eventTypeOptions}
        />
      </div>
      <ul className="audit-feed__list">
        {ordered.map((entry, index) => (
          <li key={`${entry.timestamp}-${entry.nodeId}-${entry.edgeId}-${index}`}>
            <span>{entry.timestamp}</span>
            <span>{entry.eventType}</span>
            <span>{entry.actor}</span>
            <span>node: {entry.nodeId || "-"}</span>
            <span>edge: {entry.edgeId || "-"}</span>
            <span>{entry.nodeTitle || "-"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
