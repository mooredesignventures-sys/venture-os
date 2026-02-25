"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "draft_nodes";
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

function getActiveNodes(nodes) {
  return nodes
    .filter(
      (node) =>
        node &&
        typeof node.id === "string" &&
        typeof node.title === "string" &&
        typeof node.type === "string" &&
        !node.archived
    )
    .map((node) => ({
      ...node,
      relationships: normalizeRelationships(node),
    }));
}

export default function ViewsClient({ mode }) {
  const [search, setSearch] = useState("");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState("all");
  const activeNodes = getActiveNodes(loadDraftNodes());

  const nodeById = useMemo(
    () => new Map(activeNodes.map((node) => [node.id, node])),
    [activeNodes]
  );

  const decisionNodes = activeNodes.filter((node) => node.type === "Decision");
  const requirementNodes = activeNodes.filter(
    (node) => node.type === "Requirement"
  );

  const relationships = activeNodes.flatMap((node) =>
    node.relationships
      .map((rel) => {
        const relatedNode = nodeById.get(rel.targetId);
        if (!relatedNode) {
          return null;
        }

        return {
          sourceId: node.id,
          sourceTitle: node.title,
          targetId: relatedNode.id,
          targetTitle: relatedNode.title,
          type: rel.type,
        };
      })
      .filter((item) => item !== null)
  );

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

  function renderTree(nodes) {
    if (nodes.length === 0) {
      return <p>No nodes available.</p>;
    }

    return (
      <ul>
        {nodes.map((node) => {
          const related = node.relationships
            .map((rel) => ({ ...rel, node: nodeById.get(rel.targetId) }))
            .filter((item) => Boolean(item.node));

          return (
            <li key={node.id}>
              <strong>{node.title}</strong>
              {related.length === 0 ? (
                <p>No related items</p>
              ) : (
                <ul>
                  {related.map((item, index) => (
                    <li key={`${node.id}-${item.targetId}-${item.type}-${index}`}>
                      {item.type}: {item.node.title} ({item.node.type})
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  if (mode === "decisions") {
    return renderTree(decisionNodes);
  }

  if (mode === "requirements") {
    return renderTree(requirementNodes);
  }

  return (
    <section>
      <label htmlFor="business-search">Filter by node</label>
      <br />
      <input
        id="business-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <br />
      <label htmlFor="relationship-type-filter">Filter by relationship type</label>
      <br />
      <select
        id="relationship-type-filter"
        value={relationshipTypeFilter}
        onChange={(event) => setRelationshipTypeFilter(event.target.value)}
      >
        <option value="all">all</option>
        <option value="depends_on">depends_on</option>
        <option value="enables">enables</option>
        <option value="relates_to">relates_to</option>
      </select>

      {filteredRelationships.length === 0 ? (
        <p>No relationships found.</p>
      ) : (
        <ul>
          {filteredRelationships.map((item, index) => (
            <li key={`${item.sourceId}-${item.targetId}-${item.type}-${index}`}>
              {item.sourceTitle} {"\u2014"}({item.type}){"\u2192"} {item.targetTitle}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
