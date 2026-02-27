"use client";

import { useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
const COMMITTED_NODE_STORAGE_KEY = "committed_nodes";
const COMMITTED_EDGE_STORAGE_KEY = "committed_edges";
const AUDIT_STORAGE_KEY = "draft_audit_log";
const FALLBACK_AUDIT_STORAGE_KEY = "audit_events";
const COMMIT_CONFIRM_TEXT = "CONFIRMED";
const RELATIONSHIP_TYPES = ["depends_on", "enables", "relates_to"];

function normalizeRelationships(node) {
  if (Array.isArray(node.relationships)) {
    return node.relationships
      .filter((rel) => rel && typeof rel === "object")
      .map((rel) => ({
        targetId: typeof rel.targetId === "string" ? rel.targetId : "",
        type: RELATIONSHIP_TYPES.includes(rel.type) ? rel.type : "relates_to",
      }))
      .filter((rel) => rel.targetId);
  }

  if (Array.isArray(node.relatedIds)) {
    return node.relatedIds
      .filter((id) => typeof id === "string")
      .map((id) => ({ targetId: id, type: "relates_to" }));
  }

  return [];
}

function normalizeStatus(node) {
  if (node.stage === "committed") {
    return "committed";
  }

  if (node.stage === "archived") {
    return "archived";
  }

  if (node.status === "committed") {
    return "committed";
  }

  if (node.status === "archived") {
    return "archived";
  }

  if (node.archived) {
    return "archived";
  }

  return "active";
}

function loadDraftEdges() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(EDGE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadDraftNodes() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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

  const key = resolveAuditStorageKey();
  const existing = loadStoredArray(key);
  window.localStorage.setItem(key, JSON.stringify([...existing, event]));
}

function getActiveNodes(nodes) {
  return nodes
    .filter(
      (node) =>
        node &&
        typeof node.id === "string" &&
        typeof node.title === "string" &&
        typeof node.type === "string" &&
        normalizeStatus(node) !== "archived"
    )
    .map((node) => ({
      ...node,
      relationships: normalizeRelationships(node),
    }));
}

function buildRelationships(nodes, edges) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  if (edges.length > 0) {
    return edges
      .filter(
        (edge) =>
          edge &&
          typeof edge.from === "string" &&
          typeof edge.to === "string" &&
          RELATIONSHIP_TYPES.includes(edge.relationshipType) &&
          edge.stage !== "archived"
      )
      .map((edge) => {
        const source = nodeById.get(edge.from);
        const target = nodeById.get(edge.to);
        if (!source || !target) {
          return null;
        }

        return {
          sourceId: source.id,
          sourceTitle: source.title,
          sourceType: source.type,
          targetId: target.id,
          targetTitle: target.title,
          targetType: target.type,
          type: edge.relationshipType,
        };
      })
      .filter((item) => item !== null);
  }

  return nodes.flatMap((node) =>
    node.relationships
      .map((rel) => {
        const relatedNode = nodeById.get(rel.targetId);
        if (!relatedNode) {
          return null;
        }

        return {
          sourceId: node.id,
          sourceTitle: node.title,
          sourceType: node.type,
          targetId: relatedNode.id,
          targetTitle: relatedNode.title,
          targetType: relatedNode.type,
          type: rel.type,
        };
      })
      .filter((item) => item !== null)
  );
}

export default function ViewsClient({ mode, viewScope = "draft" }) {
  const [search, setSearch] = useState("");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState("all");
  const [refreshToken, setRefreshToken] = useState(0);
  const [founderCommitText, setFounderCommitText] = useState("");
  const [commitError, setCommitError] = useState("");
  const [commitResult, setCommitResult] = useState(null);
  const activeNodes = useMemo(() => getActiveNodes(loadDraftNodes()), [refreshToken]);
  const activeEdges = useMemo(() => loadDraftEdges(), [refreshToken]);
  const filteredNodes =
    viewScope === "committed"
      ? activeNodes.filter((node) => normalizeStatus(node) === "committed")
      : activeNodes;

  const nodeById = useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes]
  );

  const decisionNodes = filteredNodes.filter((node) => node.type === "Decision");
  const requirementNodes = filteredNodes.filter((node) => node.type === "Requirement");
  const proposedRequirementNodes = requirementNodes.filter((node) => {
    const stage = typeof node.stage === "string" ? node.stage.toLowerCase() : "";
    return stage === "proposed" && node.archived !== true;
  });

  const relationships = buildRelationships(filteredNodes, activeEdges);

  const relationshipsBySource = useMemo(() => {
    const grouped = new Map();

    for (const relationship of relationships) {
      if (!grouped.has(relationship.sourceId)) {
        grouped.set(relationship.sourceId, []);
      }

      grouped.get(relationship.sourceId).push(relationship);
    }

    return grouped;
  }, [relationships]);

  const filteredRelationships = relationships.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesTerm =
      !term ||
      item.sourceTitle.toLowerCase().includes(term) ||
      item.targetTitle.toLowerCase().includes(term);

    const matchesType =
      relationshipTypeFilter === "all" || item.type === relationshipTypeFilter;

    return matchesTerm && matchesType;
  });

  const relationshipsByType = useMemo(() => {
    const grouped = new Map();

    for (const relationship of filteredRelationships) {
      if (!grouped.has(relationship.type)) {
        grouped.set(relationship.type, []);
      }

      grouped.get(relationship.type).push(relationship);
    }

    return grouped;
  }, [filteredRelationships]);

  function handleFounderCommit() {
    if (founderCommitText !== COMMIT_CONFIRM_TEXT) {
      setCommitError("Type CONFIRMED exactly to commit proposed requirements.");
      return;
    }

    const draftNodes = loadStoredArray(STORAGE_KEY);
    const draftEdges = loadStoredArray(EDGE_STORAGE_KEY);
    const committedNodes = loadStoredArray(COMMITTED_NODE_STORAGE_KEY);
    const committedEdges = loadStoredArray(COMMITTED_EDGE_STORAGE_KEY);

    const proposedRequirements = draftNodes.filter((node) => {
      const stage = typeof node?.stage === "string" ? node.stage.toLowerCase() : "";
      return node?.type === "Requirement" && stage === "proposed" && node?.archived !== true;
    });

    if (proposedRequirements.length === 0) {
      setCommitError("No proposed requirements found to commit.");
      return;
    }

    const proposedIds = new Set(proposedRequirements.map((node) => node.id));
    let archivedProposedCount = 0;
    const nextDraftNodes = draftNodes.map((node) => {
      if (!proposedIds.has(node?.id)) {
        return node;
      }
      archivedProposedCount += 1;
      return {
        ...node,
        stage: "archived",
        archived: true,
      };
    });

    const committedNodeIds = new Set(
      committedNodes.map((node) => node?.id).filter((id) => typeof id === "string"),
    );
    const committedNodeAdds = proposedRequirements
      .filter((node) => !committedNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        stage: "committed",
        archived: false,
      }));
    const nextCommittedNodes = [...committedNodes, ...committedNodeAdds];

    const relatedEdges = draftEdges.filter(
      (edge) =>
        edge &&
        typeof edge.from === "string" &&
        typeof edge.to === "string" &&
        (proposedIds.has(edge.from) || proposedIds.has(edge.to)),
    );

    const relatedEdgeIds = new Set(
      relatedEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
    );
    let archivedEdgeCount = 0;
    const nextDraftEdges = draftEdges.map((edge) => {
      if (!relatedEdgeIds.has(edge?.id)) {
        return edge;
      }
      archivedEdgeCount += 1;
      return {
        ...edge,
        stage: "archived",
        archived: true,
      };
    });

    const committedEdgeIds = new Set(
      committedEdges.map((edge) => edge?.id).filter((id) => typeof id === "string"),
    );
    const committedEdgeAdds = relatedEdges
      .filter((edge) => typeof edge?.id === "string" && !committedEdgeIds.has(edge.id))
      .map((edge) => ({
        ...edge,
        stage: "committed",
        archived: false,
      }));
    const nextCommittedEdges = [...committedEdges, ...committedEdgeAdds];

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraftNodes));
    window.localStorage.setItem(EDGE_STORAGE_KEY, JSON.stringify(nextDraftEdges));
    window.localStorage.setItem(COMMITTED_NODE_STORAGE_KEY, JSON.stringify(nextCommittedNodes));
    window.localStorage.setItem(COMMITTED_EDGE_STORAGE_KEY, JSON.stringify(nextCommittedEdges));

    const payload = {
      committedRequirementCount: committedNodeAdds.length,
      archivedProposedCount,
      committedEdgeCount: committedEdgeAdds.length,
      archivedEdgeCount,
      note: "Committed proposed requirements via exact CONFIRMED",
    };

    appendAuditEvent("FOUNDER_COMMIT_CONFIRMED", payload);
    setCommitResult(payload);
    setCommitError("");
    setFounderCommitText("");
    setRefreshToken((value) => value + 1);
  }

  function renderTree(nodes) {
    if (nodes.length === 0) {
      return (
        <EmptyState
          title={`No ${mode} nodes available.`}
          message={`Load demo data or add nodes to populate this ${viewScope} view.`}
        />
      );
    }

    const relationshipTotal = nodes.reduce((count, node) => {
      const related = relationshipsBySource.get(node.id) || [];
      return count + related.length;
    }, 0);

    return (
      <section>
        <p>
          Nodes: {nodes.length} | Relationships: {relationshipTotal}
        </p>
        <ul>
          {nodes.map((node) => {
            const related = relationshipsBySource.get(node.id) || [];
            const relatedByType = related.reduce((grouped, item) => {
              if (!grouped.has(item.type)) {
                grouped.set(item.type, []);
              }
              grouped.get(item.type).push(item);
              return grouped;
            }, new Map());

            return (
              <li key={node.id}>
                <strong>{node.title}</strong>
                {related.length === 0 ? (
                  <p>No related items</p>
                ) : (
                  <ul>
                    {[...relatedByType.entries()].map(([type, typedItems]) => (
                      <li key={`${node.id}-${type}`}>
                        <strong>{type}</strong> ({typedItems.length})
                        <ul>
                          {typedItems.map((item, index) => {
                            const targetNode = nodeById.get(item.targetId);
                            if (!targetNode) {
                              return null;
                            }

                            return (
                              <li key={`${node.id}-${item.targetId}-${item.type}-${index}`}>
                                {targetNode.title} ({targetNode.type})
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (mode === "decisions") {
    return renderTree(decisionNodes);
  }

  if (mode === "requirements") {
    return (
      <section>
        <p>Proposed requirements: {proposedRequirementNodes.length}</p>
        {proposedRequirementNodes.length === 0 ? (
          <EmptyState
            title="No proposed requirements found."
            message="Generate and apply a brainstorm draft to populate this list."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Risk</th>
                <th>Status</th>
                <th>Version</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {proposedRequirementNodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.title}</td>
                  <td>{node.risk || "-"}</td>
                  <td>{node.status || "-"}</td>
                  <td>{node.version ?? "-"}</td>
                  <td>{node.owner || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div>
          <h3>Founder Commit</h3>
          <p>Only Founder commits. This moves proposed -&gt; committed.</p>
          <label htmlFor="founder-confirmed-input">
            Type CONFIRMED to commit proposed requirements
          </label>
          <br />
          <input
            id="founder-confirmed-input"
            value={founderCommitText}
            onChange={(event) => {
              setFounderCommitText(event.target.value);
              setCommitError("");
            }}
          />{" "}
          <button
            type="button"
            onClick={handleFounderCommit}
            disabled={founderCommitText !== COMMIT_CONFIRM_TEXT}
          >
            Commit
          </button>
          {commitError ? <p>{commitError}</p> : null}
          {commitResult ? (
            <p>
              Commit success: committedRequirements={commitResult.committedRequirementCount},
              archivedProposed={commitResult.archivedProposedCount}, committedEdges=
              {commitResult.committedEdgeCount}, archivedEdges={commitResult.archivedEdgeCount}
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section>
      <p>
        Nodes: {filteredNodes.length} | Relationships: {relationships.length}
      </p>
      <SearchBox
        id="business-search"
        label="Filter by node"
        value={search}
        onChange={setSearch}
      />
      <br />
      <SelectFilter
        id="relationship-type-filter"
        label="Filter by relationship type"
        value={relationshipTypeFilter}
        onChange={setRelationshipTypeFilter}
        options={[
          { value: "all", label: "all" },
          { value: "depends_on", label: "depends_on" },
          { value: "enables", label: "enables" },
          { value: "relates_to", label: "relates_to" },
        ]}
      />

      {filteredRelationships.length === 0 ? (
        <EmptyState
          title="No relationships found."
          message={`No ${viewScope} relationships match this filter. Add relationships in Nodes or switch view mode.`}
        />
      ) : (
        <section>
          {[...relationshipsByType.entries()].map(([type, items]) => (
            <div key={type}>
              <h3>
                {type} ({items.length})
              </h3>
              <ul>
                {items.map((item, index) => (
                  <li key={`${item.sourceId}-${item.targetId}-${item.type}-${index}`}>
                    {item.sourceTitle} ({item.sourceType}) {"\u2014"}({item.type}){"\u2192"}{" "}
                    {item.targetTitle} ({item.targetType})
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
