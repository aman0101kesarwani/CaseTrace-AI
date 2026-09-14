import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Network,
  User,
} from "lucide-react";

import { api, ApiGraphNode, ApiGraphRelationship } from "@/services/api";

function getNodeLabels(node: ApiGraphNode): string[] {
  const labels = (node as unknown as { labels?: unknown }).labels;

  if (Array.isArray(labels)) {
    return labels.map(String);
  }

  return [];
}

function getNodeProperties(
  node: ApiGraphNode
): Record<string, unknown> {
  const properties = (node as unknown as { properties?: unknown })
    .properties;

  if (properties && typeof properties === "object") {
    return properties as Record<string, unknown>;
  }

  return {};
}

function getNodeName(node: ApiGraphNode): string {
  const properties = getNodeProperties(node);

  const candidates = [
    properties.name,
    properties.title,
    properties.file_name,
    properties.event_type,
  ];

  const value = candidates.find(
    (item) => typeof item === "string" && item.trim()
  );

  return value ? String(value) : `Node ${node.id}`;
}

function getNodeType(node: ApiGraphNode): string {
  const labels = getNodeLabels(node);

  if (labels.includes("Entity")) {
    return "Entity";
  }

  if (labels.includes("Event")) {
    return "Event";
  }

  if (labels.includes("DocumentPage")) {
    return "DocumentPage";
  }

  if (labels.includes("Document")) {
    return "Document";
  }

  return node.type || labels[0] || "Unknown";
}

function getNodePropertyText(
  node: ApiGraphNode,
  key: string
): string | null {
  const properties = getNodeProperties(node);
  const value = properties[key];

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

export function EntityProfile() {
  const { caseId, entityId } = useParams<{
    caseId: string;
    entityId: string;
  }>();

  const parsedCaseId = Number(caseId);

  const navigate = useNavigate();

  const [nodes, setNodes] = useState<ApiGraphNode[]>([]);
  const [relationships, setRelationships] =
    useState<ApiGraphRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(parsedCaseId) || !entityId) {
      setError("Invalid case or entity ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadGraph = async () => {
      try {
        setLoading(true);
        setError(null);

        const graph = await api.graph(parsedCaseId);

        if (!cancelled) {
          setNodes(graph.nodes);
          setRelationships(graph.relationships);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load entity profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadGraph();

    return () => {
      cancelled = true;
    };
  }, [parsedCaseId, entityId]);

  const entity = useMemo(() => {
    return (
      nodes.find(
        (node) =>
          String(node.id) === String(entityId) &&
          getNodeType(node) === "Entity"
      ) ?? null
    );
  }, [nodes, entityId]);

  const relatedNodes = useMemo(() => {
    if (!entity) {
      return [];
    }

    const connectedIds = new Set<string>();

    relationships.forEach((relationship) => {
      const source = String(relationship.source);
      const target = String(relationship.target);
      const entityNodeId = String(entity.id);

      if (source === entityNodeId) {
        connectedIds.add(target);
      }

      if (target === entityNodeId) {
        connectedIds.add(source);
      }
    });

    return nodes.filter(
      (node) =>
        connectedIds.has(String(node.id)) &&
        getNodeType(node) !== "Entity"
    );
  }, [entity, nodes, relationships]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-background p-8 text-center">
          Loading entity profile...
        </div>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="p-6">
        <Link
          to={`/cases/${caseId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Case
        </Link>

        <div className="rounded-lg border bg-background p-8 text-center">
          <p className="font-medium">Entity not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "The requested entity could not be found in this case."}
          </p>
        </div>
      </div>
    );
  }

  const labels = getNodeLabels(entity);
  const entityType =
    getNodePropertyText(entity, "entity_type") ?? "ENTITY";

  const mentions = relationships.filter(
    (relationship) =>
      relationship.type === "MENTIONS" &&
      (String(relationship.source) === String(entity.id) ||
        String(relationship.target) === String(entity.id))
  ).length;
  const description = getNodePropertyText(entity, "description");

  return (
    <div className="p-6">
      <Link
        to={`/cases/${caseId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      <div className="mb-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl border bg-muted/30 p-3">
            {entityType.toUpperCase() === "PERSON" ? (
              <User className="h-6 w-6" />
            ) : (
              <Building2 className="h-6 w-6" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {getNodeName(entity)}
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{entityType}</span>

              {labels
                .filter((label) => label !== "Entity")
                .map((label) => (
                  <span
                    key={label}
                    className="rounded-full border px-2 py-0.5 text-xs"
                  >
                    {label}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <Network className="h-5 w-5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Entity ID
              </p>
              <p className="font-semibold">{String(entity.id)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Mentions
              </p>
              <p className="font-semibold">
                {mentions ?? "Not available"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Graph Nodes
              </p>
              <p className="font-semibold">{nodes.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl border bg-background p-5">
        <h2 className="font-semibold">Entity Information</h2>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Name
            </p>
            <p className="mt-1 text-sm">{getNodeName(entity)}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Entity Type
            </p>
            <p className="mt-1 text-sm">{entityType}</p>
          </div>

          {description && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Description
              </p>
              <p className="mt-1 text-sm leading-6">{description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-xl border bg-background p-5">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          <h2 className="font-semibold">Associated Graph Data</h2>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          Documents open in the document viewer, and events open their
          source document page when available.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {relatedNodes.slice(0, 12).map((node) => {
            const nodeType = getNodeType(node);
            const nodeProperties = getNodeProperties(node);

            const relationshipType =
              relationships.find((relationship) => {
                const source = String(relationship.source);
                const target = String(relationship.target);
                const entityNodeId = String(entity.id);
                const nodeId = String(node.id);

                return (
                  (source === entityNodeId && target === nodeId) ||
                  (source === nodeId && target === entityNodeId)
                );
              })?.type ?? null;

            let navigationTarget: string | null = null;

            if (nodeType === "Document") {
              const documentId = nodeProperties.postgres_id;

              if (
                typeof documentId === "number" ||
                typeof documentId === "string"
              ) {
                navigationTarget =
                  `/cases/${caseId}/documents/${encodeURIComponent(
                    String(documentId)
                  )}/pages/1`;
              }
            }

            if (nodeType === "Event") {
              const pageId = nodeProperties.page_id;

              if (
                typeof pageId === "number" ||
                typeof pageId === "string"
              ) {
                const sourcePage = nodes.find((candidate) => {
                  if (getNodeType(candidate) !== "DocumentPage") {
                    return false;
                  }

                  const candidateProperties =
                    getNodeProperties(candidate);

                  return String(candidateProperties.postgres_id) ===
                    String(pageId);
                });

                if (sourcePage) {
                  const sourcePageProperties =
                    getNodeProperties(sourcePage);

                  const documentId =
                    sourcePageProperties.document_id;

                  const pageNumber =
                    sourcePageProperties.page_number;

                  const eventDate = nodeProperties.event_date;

                  if (
                    (typeof documentId === "number" ||
                      typeof documentId === "string") &&
                    (typeof pageNumber === "number" ||
                      typeof pageNumber === "string")
                  ) {
                    navigationTarget =
                      `/cases/${caseId}/documents/${encodeURIComponent(
                        String(documentId)
                      )}/pages/${encodeURIComponent(
                        String(pageNumber)
                      )}${
                        typeof eventDate === "number" ||
                        typeof eventDate === "string"
                          ? `?highlight=${encodeURIComponent(
                              String(eventDate)
                            )}`
                          : ""
                      }`;
                  }
                }
              }
            }

            if (nodeType === "DocumentPage") {
              const documentId = nodeProperties.document_id;
              const pageNumber = nodeProperties.page_number;

              if (
                (typeof documentId === "number" ||
                  typeof documentId === "string") &&
                (typeof pageNumber === "number" ||
                  typeof pageNumber === "string")
              ) {
                navigationTarget =
                  `/cases/${caseId}/documents/${encodeURIComponent(
                    String(documentId)
                  )}/pages/${encodeURIComponent(
                    String(pageNumber)
                  )}`;
              }
            }

            const cardClassName =
              "rounded-lg border p-3" +
              (navigationTarget
                ? " cursor-pointer transition-colors hover:bg-muted/50"
                : "");

            if (navigationTarget) {
              return (
                <button
                  key={String(node.id)}
                  type="button"
                  className={`${cardClassName} w-full text-left`}
                  onClick={() => navigate(navigationTarget)}
                >
                  <p className="text-sm font-medium">
                    {getNodeName(node)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {relationshipType && `${relationshipType} � `}
                    {nodeType}
                    {nodeType === "Event" &&
                      Boolean(nodeProperties.event_date) &&
                      ` � ${String(nodeProperties.event_date)}`}
                    {nodeType === "Event" &&
                      Boolean(nodeProperties.page_number) &&
                      ` � Page ${String(nodeProperties.page_number)}`}
                    {" � Open"}
                  </p>
                </button>
              );
            }

            return (
              <div
                key={String(node.id)}
                className={cardClassName}
              >
                <p className="text-sm font-medium">
                  {getNodeName(node)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nodeType}
                </p>
              </div>
            );
          })}

          {relatedNodes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No associated graph data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}











