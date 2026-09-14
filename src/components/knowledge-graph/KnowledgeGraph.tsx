import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type {
  ApiGraph,
  ApiGraphNode,
  ApiGraphRelationship,
} from "@/services/api";

type KnowledgeGraphProps = {
  graph: ApiGraph | null;
};

type GraphFilters = {
  Entity: boolean;
  Claim: boolean;
  Event: boolean;
  Document: boolean;
  DocumentPage: boolean;
};

type RelationshipFilters = {
  ASSOCIATED_WITH: boolean;
  EXTRACTED_FROM: boolean;
  MENTIONS: boolean;
  INVOLVED_IN: boolean;
  HAS_PAGE: boolean;
  DERIVED_FROM: boolean;
  SUPPORTED_BY: boolean;
};

const NODE_WIDTH = 190;
const HORIZONTAL_GAP = 80;

const getNodeLabels = (
  node: ApiGraphNode
): string[] => {
  const labels = node.labels;

  if (Array.isArray(labels)) {
    return labels.filter(
      (label): label is string =>
        typeof label === "string"
    );
  }

  return [];
};




const getNodeProperties = (
  node: ApiGraphNode
): Record<string, unknown> => {
  const properties = node.properties;

  if (
    properties &&
    typeof properties === "object" &&
    !Array.isArray(properties)
  ) {
    return properties as Record<string, unknown>;
  }

  return {};
};



const getNodeType = (
  node: ApiGraphNode
): string => {
  const labels = getNodeLabels(node);

  if (labels.includes("Entity")) {
    return "Entity";
  }

  if (labels.includes("Claim")) {
    return "Claim";
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

  return labels[0] || "Unknown";
};




const getNodeColor = (type: string) => {
  switch (type) {
    case "Entity":
      return "#2563eb";

    case "Claim":
      return "#dc2626";

    case "Event":
      return "#16a34a";

    case "Document":
      return "#9333ea";

    case "DocumentPage":
      return "#ea580c";

    default:
      return "#64748b";
  }
};

const getRelationshipColor = (
  relationshipType: string
) => {
  switch (relationshipType) {
    case "MENTIONS":
      return "#2563eb";

    case "INVOLVED_IN":
      return "#16a34a";

    case "ASSOCIATED_WITH":
      return "#7c3aed";

    case "EXTRACTED_FROM":
      return "#0891b2";

    case "DERIVED_FROM":
      return "#9333ea";

    case "HAS_PAGE":
      return "#ea580c";

    case "SUPPORTED_BY":
      return "#dc2626";

    default:
      return "#64748b";
  }
};



const getNodeName = (
  node: ApiGraphNode
): string => {
  const properties = getNodeProperties(node);

  const candidates: unknown[] = [
    properties.name,
    properties.title,
    properties.claim_text,
    properties.file_name,
    properties.event_type,
    node.label,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value;
    }
  }

  return `${getNodeType(node)} ${String(node.id)}`;
};




const getNodeSubtitle = (
  node: ApiGraphNode
): string => {
  const type = getNodeType(node);
  const properties = getNodeProperties(node);

  if (type === "Entity") {
    const entityType = properties.entity_type;

    if (
      typeof entityType === "string" &&
      entityType.trim().length > 0
    ) {
      return entityType;
    }

    return "Case entity";
  }

  if (type === "Claim") {
    const status = properties.status;

    if (
      typeof status === "string" &&
      status.trim().length > 0
    ) {
      return status;
    }

    return "Case claim";
  }

  if (type === "Event") {
    const eventDate = properties.event_date;

    if (
      typeof eventDate === "string" &&
      eventDate.trim().length > 0
    ) {
      return eventDate;
    }

    return "Case event";
  }

  if (type === "Document") {
    return "Source document";
  }

  if (type === "DocumentPage") {
    const pageNumber = properties.page_number;

    if (typeof pageNumber === "number") {
      return `Page ${pageNumber}`;
    }

    return "Document page";
  }

  return type;
};





const getNodePosition = (
  node: ApiGraphNode,
  index: number,
  counts: Record<string, number>,
  layoutMode: "semantic" | "compact"
) => {
  const type = getNodeType(node);

  const typeOrder = [
    "Entity",
    "Claim",
    "Event",
    "Document",
    "DocumentPage",
  ];

  const rowCount = counts[type] || 1;

  const columns =
    layoutMode === "compact"
      ? 10
      : Math.min(
        14,
        Math.max(
          6,
          Math.ceil(Math.sqrt(rowCount) * 1.5)
        )
      );

  const column = index % columns;

  const wrappedRow = Math.floor(index / columns);

  const horizontalGap =
    layoutMode === "compact"
      ? 30
      : HORIZONTAL_GAP;

  const verticalGap =
    layoutMode === "compact"
      ? 120
      : 150;

  const rowWidth =
    Math.min(columns, rowCount) * NODE_WIDTH +
    Math.max(
      Math.min(columns, rowCount) - 1,
      0
    ) *
    horizontalGap;

  const canvasWidth = 1200;

  const startX = Math.max(
    40,
    (canvasWidth - rowWidth) / 2
  );

  const typeIndex = typeOrder.indexOf(type);

  const previousTypeRows = typeOrder
    .slice(0, typeIndex)
    .reduce((total, previousType) => {
      const previousCount =
        counts[previousType] || 0;

      if (previousCount === 0) {
        return total;
      }

      const previousColumns =
        layoutMode === "compact"
          ? 10
          : Math.min(
            14,
            Math.max(
              6,
              Math.ceil(
                Math.sqrt(previousCount) * 1.5
              )
            )
          );

      return (
        total +
        Math.ceil(
          previousCount / previousColumns
        ) +
        1
      );
    }, 0);

  return {
    x:
      startX +
      column *
      (NODE_WIDTH + horizontalGap),

    y:
      70 +
      previousTypeRows * verticalGap +
      wrappedRow * verticalGap,
  };
};





const toNode = (
  node: ApiGraphNode,
  index: number,
  counts: Record<string, number>,
  selectedNodeId: string | null,
  connectedNodeIds: Set<string>,
  searchQuery: string,
  layoutMode: "semantic" | "compact",
  focusSelectedNode: boolean
): Node => {
  const normalizedSearch = searchQuery
    .trim()
    .toLowerCase();

  const properties = getNodeProperties(node);

  const searchableText = [
    getNodeType(node),
    node.id,
    properties.name,
    properties.entity_name,
    properties.entity_type,
    properties.claim_text,
    properties.status,
    properties.reason,
    properties.event_text,
    properties.event_type,
    properties.file_name,
    properties.document_name,
    properties.page_number,
    properties.text,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null
    )
    .join(" ")
    .toLowerCase();

  const isSearchMatch =
    !normalizedSearch ||
    searchableText.includes(normalizedSearch);
  const type = getNodeType(node);
  const color = getNodeColor(type);

  const nodeId = String(node.id);

  const isSelected =
    nodeId === selectedNodeId;

  const isConnected =
    selectedNodeId === null ||
    isSelected ||
    connectedNodeIds.has(nodeId);

  return {
    id: String(node.id),

    position: getNodePosition(
      node,
      index,
      counts,
      layoutMode
    ),

    draggable: true,

    data: {
      type,

      label: (
        <div className="w-[190px]">
          <div
            className="rounded-lg border bg-white px-3 py-3 shadow-sm transition-shadow"
            style={{
              borderColor: color,
              boxShadow: isSelected
                ? `0 0 0 4px ${color}44`
                : isSearchMatch
                  ? `0 0 0 3px ${color}88`
                  : undefined,
              opacity: focusSelectedNode
                ? isConnected
                  ? isSearchMatch
                    ? 1
                    : 0.7
                  : 0.08
                : isConnected
                  ? isSearchMatch
                    ? 1
                    : 0.75
                  : 0.25,
              transform: isSelected
                ? "scale(1.04)"
                : isSearchMatch
                  ? "scale(1.02)"
                  : undefined,
            }}
          >
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color,
              }}
            >
              {type === "DocumentPage"
                ? "PAGE"
                : type}
            </div>

            <div className="break-words text-sm font-semibold text-slate-900">
              {getNodeName(node)}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {getNodeSubtitle(node)}
            </div>
          </div>
        </div>
      ),
    },

    style: {
      background: "transparent",
      border: "none",
      padding: 0,
      width: NODE_WIDTH,
    },
  };
};




const toEdge = (
  relationship: ApiGraphRelationship,
  index: number,
  selectedNodeId: string | null,
  selectedRelationshipId: string | null
): Edge => {
  const source = String(
    relationship.source
  );

  const target = String(
    relationship.target
  );

  const isConnected =
    selectedNodeId !== null &&
    (source === selectedNodeId ||
      target === selectedNodeId);

  const isSelected =
    selectedRelationshipId ===
    String(relationship.id);

  const relationshipColor =
    getRelationshipColor(relationship.type);

  return {
    id: relationship.id !== undefined
      ? String(relationship.id)
      : `relationship-${index}`,
    source,
    target,
    type: "smoothstep",

    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: relationshipColor,
    },

    animated: isConnected || isSelected,

    label:
      isConnected || isSelected
        ? relationship.type
        : undefined,

    labelStyle: {
      fontSize: 9,
      fontWeight: 600,
    },

    labelBgStyle: {
      fill: "white",
      fillOpacity: 0.9,
    },

    style: {
      stroke: relationshipColor,
      strokeWidth: isSelected
        ? 4
        : isConnected
          ? 2.5
          : 1,
      opacity: isSelected
        ? 1
        : selectedNodeId === null
          ? 0.7
          : isConnected
            ? 1
            : 0.12,
    },
    interactionWidth: 20,
  };
};



const formatPropertyValue = (
  value: unknown
): string => {
  if (value === null || value === undefined) {
    return "�";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

export const KnowledgeGraph = ({
  graph,
}: KnowledgeGraphProps) => {
  const [filters, setFilters] =
    useState<GraphFilters>({
      Entity: true,
      Claim: true,
      Event: true,
      Document: true,
      DocumentPage: false,
    });

  const [relationshipFilters, setRelationshipFilters] =
    useState<RelationshipFilters>({
      ASSOCIATED_WITH: true,
      EXTRACTED_FROM: true,
      MENTIONS: true,
      INVOLVED_IN: true,
      HAS_PAGE: true,
      DERIVED_FROM: true,
      SUPPORTED_BY: true,
    });

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [selectedRelationshipId, setSelectedRelationshipId] =
    useState<string | null>(null);

  const [focusSelectedNode, setFocusSelectedNode] =
    useState(false);

  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [layoutMode, setLayoutMode] =
    useState<"semantic" | "compact">(
      "semantic"
    );

  const [searchMatchIndex, setSearchMatchIndex] =
    useState(0);

  const toggleFilter = (
    type: keyof GraphFilters
  ) => {
    setFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));

    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };


  const toggleRelationshipFilter = (
    type: keyof RelationshipFilters
  ) => {
    setRelationshipFilters((current) => ({
      ...current,
      [type]: !current[type],
    }));

    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };

  const showAll = () => {
    setFilters({
      Entity: true,
      Claim: true,
      Event: true,
      Document: true,
      DocumentPage: true,
    });

    setRelationshipFilters({
      ASSOCIATED_WITH: true,
      EXTRACTED_FROM: true,
      MENTIONS: true,
      INVOLVED_IN: true,
      HAS_PAGE: true,
      DERIVED_FROM: true,
      SUPPORTED_BY: true,
    });

    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };



  const hideAll = () => {
    setFilters({
      Entity: false,
      Claim: false,
      Event: false,
      Document: false,
      DocumentPage: false,
    });

    setRelationshipFilters({
      ASSOCIATED_WITH: false,
      EXTRACTED_FROM: false,
      MENTIONS: false,
      INVOLVED_IN: false,
      HAS_PAGE: false,
      DERIVED_FROM: false,
      SUPPORTED_BY: false,
    });

    setSelectedNodeId(null);
    setSelectedRelationshipId(null);
  };

  const visibleGraph = useMemo(() => {
    if (!graph) {
      return {
        nodes: [],
        relationships: [],
      };
    }

    const visibleNodes = graph.nodes.filter(
      (node) => {
        const type = getNodeType(node);

        return (
          type in filters &&
          filters[
          type as keyof GraphFilters
          ]
        );
      }
    );

    const visibleNodeIds = new Set(
      visibleNodes.map((node) =>
        String(node.id)
      )
    );

    const visibleRelationships =
      graph.relationships.filter(
        (relationship) =>
          visibleNodeIds.has(
            String(relationship.source)
          ) &&
          visibleNodeIds.has(
            String(relationship.target)
          ) &&
          relationship.type in
          relationshipFilters &&
          relationshipFilters[
          relationship.type as keyof RelationshipFilters
          ]
      );

    return {
      nodes: visibleNodes,
      relationships: visibleRelationships,
    };
  }, [
    graph,
    filters,
    relationshipFilters,
  ]);


  const searchMatches = useMemo(() => {
    const normalizedSearch = searchQuery
      .trim()
      .toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    return visibleGraph.nodes.filter(
      (node) => {
        const type = getNodeType(node);
        const properties =
          getNodeProperties(node);

        const searchableText = [
          type,
          node.id,
          properties.name,
          properties.entity_name,
          properties.entity_type,
          properties.claim_text,
          properties.status,
          properties.reason,
          properties.event_text,
          properties.event_type,
          properties.file_name,
          properties.document_name,
          properties.page_number,
          properties.text,
        ]
          .filter(
            (value) =>
              value !== undefined &&
              value !== null
          )
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          normalizedSearch
        );
      }
    );
  }, [
    searchQuery,
    visibleGraph.nodes,
  ]);

  useEffect(() => {
    if (searchMatches.length === 0) {
      setSearchMatchIndex(0);
      setSelectedNodeId(null);
      return;
    }

    const safeIndex =
      Math.min(
        searchMatchIndex,
        searchMatches.length - 1
      );

    if (safeIndex !== searchMatchIndex) {
      setSearchMatchIndex(safeIndex);
      return;
    }

    setSelectedNodeId(
      String(searchMatches[safeIndex].id)
    );
    setSelectedRelationshipId(null);
  }, [
    searchMatches,
    searchMatchIndex,
  ]);

  const goToPreviousSearchMatch = () => {
    if (searchMatches.length === 0) {
      return;
    }

    setSearchMatchIndex(
      (current) =>
        (current - 1 + searchMatches.length) %
        searchMatches.length
    );
  };

  const goToNextSearchMatch = () => {
    if (searchMatches.length === 0) {
      return;
    }

    setSearchMatchIndex(
      (current) =>
        (current + 1) %
        searchMatches.length
    );
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !graph) {
      return null;
    }

    return (
      graph.nodes.find(
        (node) =>
          String(node.id) === selectedNodeId
      ) || null
    );
  }, [graph, selectedNodeId]);

  const selectedRelationships =
    useMemo(() => {
      if (!selectedNodeId || !graph) {
        return [];
      }

      return graph.relationships.filter(
        (relationship) =>
          String(relationship.source) ===
          selectedNodeId ||
          String(relationship.target) ===
          selectedNodeId
      );
    }, [graph, selectedNodeId]);

  const connectedNodes = useMemo(() => {
    if (
      !selectedNodeId ||
      !graph
    ) {
      return [];
    }

    const connectedIds =
      new Set<string>();

    selectedRelationships.forEach(
      (relationship) => {
        const source = String(
          relationship.source
        );

        const target = String(
          relationship.target
        );

        if (source === selectedNodeId) {
          connectedIds.add(target);
        }

        if (target === selectedNodeId) {
          connectedIds.add(source);
        }
      }
    );

    return graph.nodes.filter((node) =>
      connectedIds.has(String(node.id))
    );
  }, [
    graph,
    selectedNodeId,
    selectedRelationships,
  ]);

  const sourceEvidencePages = useMemo(() => {
    if (!selectedNodeId || !graph) {
      return [];
    }

    const pageIds =
      new Set<string>();

    if (
      selectedNode &&
      getNodeType(selectedNode) ===
      "DocumentPage"
    ) {
      pageIds.add(
        String(selectedNode.id)
      );
    }

    selectedRelationships.forEach(
      (relationship) => {
        const source = String(
          relationship.source
        );

        const target = String(
          relationship.target
        );

        const otherNodeId =
          source === selectedNodeId
            ? target
            : target === selectedNodeId
              ? source
              : null;

        if (!otherNodeId) {
          return;
        }

        const otherNode =
          graph.nodes.find(
            (node) =>
              String(node.id) ===
              otherNodeId
          );

        if (
          otherNode &&
          getNodeType(otherNode) ===
          "DocumentPage"
        ) {
          pageIds.add(otherNodeId);
        }
      }
    );

    return graph.nodes.filter(
      (node) =>
        pageIds.has(String(node.id)) &&
        getNodeType(node) ===
        "DocumentPage"
    );
  }, [
    graph,
    selectedNode,
    selectedNodeId,
    selectedRelationships,
  ]);

  const sourceEvidenceDocuments =
    useMemo(() => {
      if (
        !graph ||
        sourceEvidencePages.length === 0
      ) {
        return [];
      }

      const documentIds =
        new Set<string>();

      sourceEvidencePages.forEach(
        (page) => {
          const properties =
            getNodeProperties(page);

          const documentId =
            properties.document_id;

          if (
            typeof documentId ===
            "number" ||
            typeof documentId ===
            "string"
          ) {
            documentIds.add(
              String(documentId)
            );
          }
        }
      );

      return graph.nodes.filter(
        (node) => {
          if (
            getNodeType(node) !==
            "Document"
          ) {
            return false;
          }

          const properties =
            getNodeProperties(node);

          const postgresId =
            properties.postgres_id;

          return (
            postgresId !==
            undefined &&
            documentIds.has(
              String(postgresId)
            )
          );
        }
      );
    }, [graph, sourceEvidencePages]);

  const counts =
    visibleGraph.nodes.reduce(
      (result, node) => {
        const type = getNodeType(node);

        result[type] =
          (result[type] || 0) + 1;

        return result;
      },
      {} as Record<
        string,
        number
      >
    );

  const connectedNodeIds =
    new Set<string>();

  selectedRelationships.forEach(
    (relationship) => {
      const source = String(
        relationship.source
      );

      const target = String(
        relationship.target
      );

      if (source === selectedNodeId) {
        connectedNodeIds.add(target);
      }

      if (target === selectedNodeId) {
        connectedNodeIds.add(source);
      }
    }
  );

  const rowIndexes: Record<
    string,
    number
  > = {};

  const nodes =
    visibleGraph.nodes.map(
      (node) => {
        const type =
          getNodeType(node);

        const index =
          rowIndexes[type] || 0;

        rowIndexes[type] =
          index + 1;

        return toNode(
          node,
          index,
          counts,
          selectedNodeId,
          connectedNodeIds,
          searchQuery,
          layoutMode,
          focusSelectedNode
        );
      }
    );

  const edges =
    visibleGraph.relationships.map(
      (relationship, index) =>
        toEdge(
          relationship,
          index,
          selectedNodeId,
          selectedRelationshipId
        )
    );

  const handleNodeClick: NodeMouseHandler =
    (_event, node) => {

      setSelectedNodeId(node.id);
      setSelectedRelationshipId(null);
      setFocusSelectedNode(false);

      if (reactFlowInstance) {
        reactFlowInstance.setCenter(
          node.position.x + NODE_WIDTH / 2,
          node.position.y + 45,
          {
            zoom: 1,
            duration: 400,
          }
        );
      }
    };

  const handleEdgeClick: EdgeMouseHandler =
    (event, edge) => {
      event.stopPropagation();

      setSelectedNodeId(String(edge.source));
      setSelectedRelationshipId(
        String(edge.id)
      );
      setFocusSelectedNode(false);

      if (reactFlowInstance) {
        const sourceNode = nodes.find(
          (node) =>
            String(node.id) ===
            String(edge.source)
        );

        if (sourceNode) {
          reactFlowInstance.setCenter(
            sourceNode.position.x +
            NODE_WIDTH / 2,
            sourceNode.position.y + 45,
            {
              zoom: 1,
              duration: 400,
            }
          );
        }
      }
    };

  const selectedRelationship =
    selectedRelationshipId && graph
      ? graph.relationships.find(
        (relationship) =>
          String(relationship.id) ===
          selectedRelationshipId
      ) ?? null
      : null;

  const selectedRelationshipSourceNode =
    selectedRelationship && graph
      ? graph.nodes.find(
        (node) =>
          String(node.id) ===
          String(selectedRelationship.source)
      ) ?? null
      : null;

  const selectedRelationshipTargetNode =
    selectedRelationship && graph
      ? graph.nodes.find(
        (node) =>
          String(node.id) ===
          String(selectedRelationship.target)
      ) ?? null
      : null;

  const handleRelationshipNodeClick = (
    node: ApiGraphNode | null
  ) => {
    if (!node) {
      return;
    }

    const nodeId = String(node.id);

    setSelectedNodeId(nodeId);
    setSelectedRelationshipId(null);
    setFocusSelectedNode(false);

    const flowNode =
      reactFlowInstance?.getNode(nodeId);

    if (flowNode && reactFlowInstance) {
      reactFlowInstance.setCenter(
        flowNode.position.x + NODE_WIDTH / 2,
        flowNode.position.y + 45,
        {
          zoom: 1,
          duration: 400,
        }
      );
    }
  };
  /*
   * Find the DocumentPage connected to
   * the selected relationship.
   *
   * This is used to open the actual
   * source page in the document viewer.
   */
  const selectedRelationshipPage =
    selectedRelationship && graph
      ? (() => {
        const directlyConnectedPage = [
          String(selectedRelationship.source),
          String(selectedRelationship.target),
        ]
          .map((nodeId) =>
            graph.nodes.find(
              (node) =>
                String(node.id) === nodeId
            )
          )
          .find(
            (node) =>
              node &&
              getNodeType(node) ===
              "DocumentPage"
          );

        if (directlyConnectedPage) {
          return directlyConnectedPage;
        }

        const relationshipProperties =
          selectedRelationship.properties ?? {};

        const sourcePageId =
          (relationshipProperties as Record<string, unknown>)
            .source_page_id;

        const sourceDocumentId =
          (relationshipProperties as Record<string, unknown>)
            .source_document_id;

        return (
          graph.nodes.find((node) => {
            if (
              getNodeType(node) !==
              "DocumentPage"
            ) {
              return false;
            }

            const properties =
              getNodeProperties(node);

            const pageMatches =
              String(properties.page_id) ===
              String(sourcePageId);

            const documentMatches =
              sourceDocumentId ===
              undefined ||
              String(
                properties.document_id
              ) ===
              String(sourceDocumentId);

            return (
              pageMatches &&
              documentMatches
            );
          }) ?? null
        );
      })()
      : null;

  const selectedRelationshipPageProperties =
    selectedRelationshipPage
      ? getNodeProperties(
        selectedRelationshipPage
      )
      : {};

  const selectedRelationshipCaseId =
    selectedRelationshipPageProperties.case_id;

  const selectedRelationshipDocumentId =
    selectedRelationshipPageProperties.document_id;

  const selectedRelationshipPageNumber =
    selectedRelationshipPageProperties.page_number;

  const canOpenSelectedRelationshipSource =
    Boolean(
      selectedRelationshipPage &&
      (
        typeof selectedRelationshipCaseId ===
        "number" ||
        typeof selectedRelationshipCaseId ===
        "string"
      ) &&
      (
        typeof selectedRelationshipDocumentId ===
        "number" ||
        typeof selectedRelationshipDocumentId ===
        "string"
      ) &&
      typeof selectedRelationshipPageNumber ===
      "number"
    );

  if (
    !graph ||
    graph.nodes.length === 0
  ) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-md border text-sm text-muted-foreground">
        No knowledge graph data is available for this case yet.
      </div>
    );
  }

  const selectedType = selectedNode
    ? getNodeType(selectedNode)
    : "";

  const selectedProperties =
    selectedNode
      ? getNodeProperties(
        selectedNode
      )
      : {};


  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
        <span className="mr-2 text-sm font-semibold">
          <div className="basis-full">
            <label className="mb-1 block text-xs font-semibold">
              Search Graph
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full max-w-[320px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchMatchIndex(0);
                  }}
                  placeholder="Search entities, claims, events, documents..."
                  className="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchMatchIndex(0);
                      setSelectedNodeId(null);
                      setSelectedRelationshipId(null);
                    }}
                    aria-label="Clear graph search"
                    title="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    ?
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {searchMatches.length > 0
                      ? `${searchMatchIndex + 1} of ${searchMatches.length}`
                      : "No matches"}
                  </span>

                  <button
                    type="button"
                    onClick={goToPreviousSearchMatch}
                    disabled={searchMatches.length === 0}
                    className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ? Previous
                  </button>

                  <button
                    type="button"
                    onClick={goToNextSearchMatch}
                    disabled={searchMatches.length === 0}
                    className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next ?
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="graph-layout"
              className="text-xs font-semibold"
            >
              Layout:
            </label>

            <select
              id="graph-layout"
              value={layoutMode}
              onChange={(event) =>
                setLayoutMode(
                  event.target.value as
                  | "semantic"
                  | "compact"
                )
              }
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              <option value="semantic">
                Semantic
              </option>
              <option value="compact">
                Compact
              </option>
            </select>
          </div>
          Show:
        </span>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters.Entity}
            onChange={() =>
              toggleFilter("Entity")
            }
          />

          <span className="h-3 w-3 rounded-full bg-blue-600" />

          Entities
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters.Claim}
            onChange={() =>
              toggleFilter("Claim")
            }
          />

          <span className="h-3 w-3 rounded-full bg-red-600" />

          Claims
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters.Event}
            onChange={() =>
              toggleFilter("Event")
            }
          />

          <span className="h-3 w-3 rounded-full bg-green-600" />

          Events
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters.Document}
            onChange={() =>
              toggleFilter("Document")
            }
          />

          <span className="h-3 w-3 rounded-full bg-purple-600" />

          Documents
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filters.DocumentPage}
            onChange={() =>
              toggleFilter("DocumentPage")
            }
          />

          <span className="h-3 w-3 rounded-full bg-orange-600" />

          Pages
        </label>
        <div className="basis-full border-t pt-2">
          <div className="mb-2 text-xs font-semibold">
            Relationships:
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.MENTIONS}
                onChange={() =>
                  toggleRelationshipFilter("MENTIONS")
                }
              />
              MENTIONS
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.INVOLVED_IN}
                onChange={() =>
                  toggleRelationshipFilter("INVOLVED_IN")
                }
              />
              INVOLVED_IN
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.ASSOCIATED_WITH}
                onChange={() =>
                  toggleRelationshipFilter("ASSOCIATED_WITH")
                }
              />
              ASSOCIATED_WITH
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.EXTRACTED_FROM}
                onChange={() =>
                  toggleRelationshipFilter("EXTRACTED_FROM")
                }
              />
              EXTRACTED_FROM
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.DERIVED_FROM}
                onChange={() =>
                  toggleRelationshipFilter("DERIVED_FROM")
                }
              />
              DERIVED_FROM
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.HAS_PAGE}
                onChange={() =>
                  toggleRelationshipFilter("HAS_PAGE")
                }
              />
              HAS_PAGE
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={relationshipFilters.SUPPORTED_BY}
                onChange={() =>
                  toggleRelationshipFilter("SUPPORTED_BY")
                }
              />
              SUPPORTED_BY
            </label>
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={showAll}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Show All
          </button>

          <button
            type="button"
            onClick={hideAll}
            className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Hide All
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-background px-4 py-2 text-xs text-muted-foreground">
        <span>
          {visibleGraph.nodes.length} nodes �{" "}
          {visibleGraph.relationships.length} relationships
        </span>

        <span>
          Click any node to inspect it.
        </span>
      </div>

      <div
        className="relative w-full rounded-md border bg-white"
        style={{
          height: "650px",
          minHeight: "650px",
        }}
      >
        <div className="absolute right-3 top-3 z-50 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!selectedNodeId) {
                return;
              }

              setFocusSelectedNode(
                (current) => !current
              );
            }}
            disabled={!selectedNodeId}
            className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {focusSelectedNode
              ? "Show All Nodes"
              : "Focus Selected"}
          </button>

          <button
            type="button"
            onClick={() =>
              reactFlowInstance?.fitView({
                padding: 0.15,
                minZoom: 0.3,
                maxZoom: 1.2,
                duration: 400,
              })
            }
            disabled={!reactFlowInstance}
            className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fit Graph
          </button>
        </div>
        <div className="absolute bottom-3 left-3 z-10 max-w-[620px] rounded-md border bg-white/95 px-3 py-2 text-[11px] shadow-sm">
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">
              Nodes:
            </span>

            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
              Entity
            </span>

            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
              Claim
            </span>

            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-green-600" />
              Event
            </span>


            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-600" />
              Document
            </span>

            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
              Page
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-slate-700">
              Relationships:
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-blue-600" />
              MENTIONS
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-green-600" />
              INVOLVED_IN
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-violet-600" />
              ASSOCIATED_WITH
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-cyan-600" />
              EXTRACTED_FROM
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-purple-600" />
              DERIVED_FROM
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-orange-600" />
              HAS_PAGE
            </span>

            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4 bg-red-600" />
              SUPPORTED_BY
            </span>
          </div>
        </div>

        <ReactFlow
          key={`${filters.Entity}-${filters.Claim}-${filters.Event}-${filters.Document}-${filters.DocumentPage}`}
          nodes={nodes}
          edges={edges}
          onInit={setReactFlowInstance}
          fitView
          fitViewOptions={{
            padding: 0.15,
            minZoom: 0.3,
            maxZoom: 1.2,
          }}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setSelectedRelationshipId(null);
          }}
          attributionPosition="bottom-left"
        >
          <Background />

          <Controls />

          <MiniMap
            nodeColor={(node) =>
              getNodeColor(
                String(
                  node.data?.type ||
                  "Unknown"
                )
              )
            }
          />
        </ReactFlow>
      </div>

      {selectedNode && (
        <div className="rounded-lg border bg-background shadow-sm">
          <div className="flex items-start justify-between border-b px-5 py-4">
            <div>
              <div
                className="mb-1 text-xs font-bold uppercase tracking-wide"
                style={{
                  color: getNodeColor(
                    selectedType
                  ),
                }}
              >
                {selectedType}
              </div>

              <h3 className="text-lg font-semibold">
                {getNodeName(selectedNode)}
              </h3>

              <p className="text-sm text-muted-foreground">
                {getNodeSubtitle(selectedNode)}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedNodeId(null)
              }
              className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
            >
              Close
            </button>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">
                Node Information
              </h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    ID
                  </span>

                  <span className="break-all text-right font-mono text-xs">
                    {String(
                      selectedNode.id
                    )}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Type
                  </span>

                  <span className="font-medium">
                    {selectedType}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Relationships
                  </span>

                  <span className="font-medium">
                    {
                      selectedRelationships.length
                    }
                  </span>
                </div>

                {Object.entries(
                  selectedProperties
                )
                  .filter(
                    ([key]) =>
                      key !== "case_id" &&
                      key !== "postgres_id"
                  )
                  .slice(0, 8)
                  .map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between gap-4 border-b pb-2"
                      >
                        <span className="text-muted-foreground">
                          {key}
                        </span>

                        <span className="max-w-[60%] break-words text-right">
                          {formatPropertyValue(
                            value
                          )}
                        </span>
                      </div>
                    )
                  )}
              </div>
            </div>

            {selectedType === "Event" && (
              <div>
                <h4 className="mb-3 text-sm font-semibold">
                  Event Details
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">
                      Event Type
                    </span>

                    <span className="max-w-[60%] break-words text-right font-medium">
                      {typeof selectedProperties.event_type === "string" &&
                        selectedProperties.event_type.trim().length > 0
                        ? selectedProperties.event_type
                        : "Not available"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">
                      Event Date
                    </span>

                    <span className="text-right">
                      {typeof selectedProperties.event_date === "string" &&
                        selectedProperties.event_date.trim().length > 0
                        ? selectedProperties.event_date
                        : "Not available"}
                    </span>
                  </div>

                  <div className="border-b pb-2">
                    <span className="text-muted-foreground">
                      Description
                    </span>

                    <p className="mt-1 whitespace-pre-wrap break-words leading-6">
                      {typeof selectedProperties.description === "string" &&
                        selectedProperties.description.trim().length > 0
                        ? selectedProperties.description
                        : "No description available."}
                    </p>
                  </div>

                  <div className="flex justify-between gap-4 border-b pb-2">
                    <span className="text-muted-foreground">
                      Confidence
                    </span>

                    <span className="text-right font-medium">
                      {typeof selectedProperties.confidence === "number"
                        ? `${Math.round(
                          selectedProperties.confidence * 100
                        )}%`
                        : "Not available"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h4 className="mb-3 text-sm font-semibold">
                Connected Nodes
              </h4>

              {connectedNodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No connected nodes found.
                </p>
              ) : (
                <div className="space-y-2">
                  {connectedNodes.map(
                    (node) => {
                      const relationship =
                        selectedRelationships.find(
                          (item) =>
                            (String(item.source) ===
                              String(selectedNodeId) &&
                              String(item.target) ===
                              String(node.id)) ||
                            (String(item.target) ===
                              String(selectedNodeId) &&
                              String(item.source) ===
                              String(node.id))
                        );

                      return (
                        <button
                          key={String(node.id)}
                          type="button"
                          onClick={() =>
                            handleRelationshipNodeClick(node)
                          }
                          className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted"
                        >
                          <span>
                            <span className="block text-sm font-medium">
                              {getNodeName(
                                node
                              )}
                            </span>

                            <span className="block text-xs text-muted-foreground">
                              {relationship?.type ??
                                getNodeType(
                                  node
                                )}
                            </span>
                          </span>

                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                getNodeColor(
                                  getNodeType(
                                    node
                                  )
                                ),
                            }}
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t px-5 py-4">
            <h4 className="mb-3 text-sm font-semibold">
              Source Evidence
            </h4>

            {sourceEvidencePages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No source pages are connected to this node.
              </p>
            ) : (
              <div className="space-y-4">
                {sourceEvidencePages.map((page) => {
                  const pageProperties =
                    getNodeProperties(page);

                  const pageNumber =
                    pageProperties.page_number;

                  const documentId =
                    pageProperties.document_id;

                  const document =
                    sourceEvidenceDocuments.find(
                      (node) =>
                        String(
                          getNodeProperties(node)
                            .postgres_id
                        ) === String(documentId)
                    );

                  const documentProperties =
                    document
                      ? getNodeProperties(document)
                      : {};

                  const fileName =
                    documentProperties.file_name;

                  const extractedText =
                    pageProperties.extracted_text;

                  return (
                    <div
                      key={String(page.id)}
                      className="rounded-md border bg-muted/20 p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <span className="font-semibold">
                          {typeof fileName === "string"
                            ? fileName
                            : "Source document"}
                        </span>

                        <span className="text-muted-foreground">
                          {typeof pageNumber === "number"
                            ? `Page ${pageNumber}`
                            : "Page unavailable"}
                        </span>
                      </div>

                      <p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {typeof extractedText === "string" &&
                          extractedText.trim().length > 0
                          ? extractedText
                          : "No extracted text is available for this page."}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t px-5 py-4">
            <h4 className="mb-3 text-sm font-semibold">
              Selected Relationship
            </h4>

            {!selectedRelationship ? (
              <p className="text-sm text-muted-foreground">
                Click a graph relationship to inspect its metadata.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">

                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">
                        Source
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRelationshipNodeClick(
                            selectedRelationshipSourceNode
                          )
                        }
                        disabled={!selectedRelationshipSourceNode}
                        className="font-medium text-right text-primary hover:underline disabled:cursor-default disabled:no-underline"
                      >
                        {selectedRelationshipSourceNode
                          ? getNodeName(
                            selectedRelationshipSourceNode
                          )
                          : String(selectedRelationship.source)}
                      </button>
                    </div>

                    <div className="flex justify-between gap-4 border-b pb-2">
                      <span className="text-muted-foreground">
                        Target
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleRelationshipNodeClick(
                            selectedRelationshipTargetNode
                          )
                        }
                        disabled={!selectedRelationshipTargetNode}
                        className="font-medium text-right text-primary hover:underline disabled:cursor-default disabled:no-underline"
                      >
                        {selectedRelationshipTargetNode
                          ? getNodeName(
                            selectedRelationshipTargetNode
                          )
                          : String(selectedRelationship.target)}
                      </button>
                    </div>
                    Type
                  </span>

                  <span className="font-medium">
                    {selectedRelationship.type}
                  </span>
                </div>

                <div className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    Evidence ID
                  </span>

                  <span className="font-medium">
                    {formatPropertyValue(
                      selectedRelationship.postgres_id
                    )}
                  </span>
                </div>

                {Object.entries(
                  selectedRelationship.properties ?? {}
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b pb-2"
                  >
                    <span className="text-muted-foreground">
                      {key}
                    </span>

                    <span className="max-w-[60%] break-words text-right">
                      {formatPropertyValue(value)}
                    </span>
                  </div>
                ))}

                {canOpenSelectedRelationshipSource ? (
                  <div className="flex items-center justify-between gap-4 pt-3">
                    <div>
                      <p className="text-sm font-medium">
                        Source Page
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Page {String(selectedRelationshipPageNumber)}
                      </p>
                    </div>

                    <Link
                      to={`/cases/${encodeURIComponent(
                        String(selectedRelationshipCaseId)
                      )}/documents/${encodeURIComponent(
                        String(selectedRelationshipDocumentId)
                      )}/pages/${encodeURIComponent(
                        String(selectedRelationshipPageNumber)
                      )}`}
                      className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
                    >
                      Open Source Page
                    </Link>
                  </div>
                ) : (
                  <p className="pt-2 text-xs text-muted-foreground">
                    Source page information is unavailable for this relationship.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="border-t px-5 py-4">
            <h4 className="mb-3 text-sm font-semibold">
              Relationships
            </h4>

            {selectedRelationships.length ===
              0 ? (
              <p className="text-sm text-muted-foreground">
                No relationships found.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedRelationships.map(
                  (
                    relationship,
                    index
                  ) => (
                    <span
                      key={
                        relationship.id !==
                          undefined
                          ? String(
                            relationship.id
                          )
                          : `selected-${index}`
                      }
                      className="rounded-full border bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {relationship.type}
                    </span>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Drag nodes to explore the case. Click
        a node to inspect its properties and
        connected relationships. Click the
        graph background to close the details
        panel.
      </p>
    </div>
  );
};
