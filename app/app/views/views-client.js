"use client";

import { useMemo, useState } from "react";

const STORAGE_KEY = "draft_nodes";

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
  return nodes.filter(
    (node) =>
      node &&
      typeof node.id === "string" &&
      typeof node.title === "string" &&
      typeof node.type === "string" &&
      !node.archived
  );
}

export default function ViewsClient({ mode }) {
  const [search, setSearch] = useState("");
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
    Array.isArray(node.relatedIds)
      ? node.relatedIds
          .map((relatedId) => {
            const relatedNode = nodeById.get(relatedId);
            if (!relatedNode) {
              return null;
            }
            return {
              sourceId: node.id,
              sourceTitle: node.title,
              targetId: relatedNode.id,
              targetTitle: relatedNode.title,
            };
          })
          .filter((item) => item !== null)
      : []
  );

  const filteredRelationships = relationships.filter((item) => {
    if (!search.trim()) {
      return true;
    }

    const term = search.toLowerCase();
    return (
      item.sourceTitle.toLowerCase().includes(term) ||
      item.targetTitle.toLowerCase().includes(term)
    );
  });

  function renderTree(nodes) {
    if (nodes.length === 0) {
      return <p>No nodes available.</p>;
    }

    return (
      <ul>
        {nodes.map((node) => {
          const relatedNodes = Array.isArray(node.relatedIds)
            ? node.relatedIds
                .map((relatedId) => nodeById.get(relatedId))
                .filter((relatedNode) => Boolean(relatedNode))
            : [];

          return (
            <li key={node.id}>
              <strong>{node.title}</strong>
              {relatedNodes.length === 0 ? (
                <p>No related items</p>
              ) : (
                <ul>
                  {relatedNodes.map((relatedNode) => (
                    <li key={`${node.id}-${relatedNode.id}`}>
                      {relatedNode.title} ({relatedNode.type})
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

      {filteredRelationships.length === 0 ? (
        <p>No relationships found.</p>
      ) : (
        <ul>
          {filteredRelationships.map((item, index) => (
            <li key={`${item.sourceId}-${item.targetId}-${index}`}>
              {item.sourceTitle} {"->"} {item.targetTitle}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
