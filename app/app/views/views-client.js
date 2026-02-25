"use client";

import { useMemo, useState } from "react";
import EmptyState from "../../../src/components/ui/empty-state";
import SearchBox from "../../../src/components/ui/search-box";
import SelectFilter from "../../../src/components/ui/select-filter";

const STORAGE_KEY = "draft_nodes";
const EDGE_STORAGE_KEY = "draft_edges";
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
          targetId: target.id,
          targetTitle: target.title,
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
          targetId: relatedNode.id,
          targetTitle: relatedNode.title,
          type: rel.type,
        };
      })
      .filter((item) => item !== null)
  );
}

export default function ViewsClient({ mode, viewScope = "draft" }) {
  const [search, setSearch] = useState("");
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState("all");
  const activeNodes = getActiveNodes(loadDraftNodes());
  const activeEdges = loadDraftEdges();
  const filteredNodes =
    viewScope === "committed"
      ? activeNodes.filter((node) => normalizeStatus(node) === "committed")
      : activeNodes;

  const nodeById = useMemo(
    () => new Map(filteredNodes.map((node) => [node.id, node])),
    [filteredNodes]
  );

  const decisionNodes = filteredNodes.filter((node) => node.type === "Decision");
  const requirementNodes = filteredNodes.filter(
    (node) => node.type === "Requirement"
  );

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

  function renderTree(nodes) {
    if (nodes.length === 0) {
      return (
        <EmptyState
          title="No nodes available."
          message="Load demo data or add draft nodes to populate this view."
        />
      );
    }

    return (
      <ul>
        {nodes.map((node) => {
          const related = relationshipsBySource.get(node.id) || [];

          return (
            <li key={node.id}>
              <strong>{node.title}</strong>
              {related.length === 0 ? (
                <p>No related items</p>
              ) : (
                <ul>
                  {related.map((item, index) => {
                    const targetNode = nodeById.get(item.targetId);
                    if (!targetNode) {
                      return null;
                    }

                    return (
                      <li key={`${node.id}-${item.targetId}-${item.type}-${index}`}>
                        {item.type}: {targetNode.title} ({targetNode.type})
                      </li>
                    );
                  })}
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
          message="Add relationships in Nodes to populate the business view."
        />
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
