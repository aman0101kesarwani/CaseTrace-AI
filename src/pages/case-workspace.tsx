import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Upload,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/atoms/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/atoms/card";
import {
  api,
  ApiCase,
  ApiClaim,
  ApiClaimEvidenceResponse,
  ApiDocument,
  ApiEvent,
  ApiGraph,
} from "@/services/api";
import { KnowledgeGraph } from "@/components/knowledge-graph/KnowledgeGraph";

export const CaseWorkspace = () => {
  const { id } = useParams();
  const caseId = Number(id);

  const [caseData, setCaseData] = useState<ApiCase | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [claims, setClaims] = useState<ApiClaim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(
    null
  );
  const [claimEvidence, setClaimEvidence] =
    useState<ApiClaimEvidenceResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [graph, setGraph] = useState<ApiGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);

      const [c, docs, caseEvents, caseClaims, caseGraph] =
        await Promise.all([
          api.getCase(caseId),
          api.documents(caseId),
          api.events(caseId),
          api.claims(caseId),
          api.graph(caseId),
        ]);

      setCaseData(c);
      setDocuments(docs);
      setEvents(caseEvents);
      setClaims(caseClaims.claims);
      setGraph(caseGraph);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load case"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Number.isFinite(caseId)) {
      load();
    }
  }, [caseId]);

  const handleClaimEvidence = async (claimId: number) => {
    if (selectedClaimId === claimId) {
      setSelectedClaimId(null);
      setClaimEvidence(null);
      setEvidenceError(null);
      return;
    }

    try {
      setSelectedClaimId(claimId);
      setClaimEvidence(null);
      setEvidenceError(null);
      setEvidenceLoading(true);

      const evidence = await api.claimEvidence(claimId);

      setClaimEvidence(evidence);
    } catch (e) {
      setEvidenceError(
        e instanceof Error
          ? e.message
          : "Unable to load claim evidence"
      );
    } finally {
      setEvidenceLoading(false);
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;

    try {
      setUploading(true);
      await api.uploadDocument(caseId, file);
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="animate-spin" />
        Loading case...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-8">
        {error || "Case not found"}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Link to="/cases">
        <Button variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cases
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">
          {caseData.title}
        </h1>

        <p className="text-muted-foreground">
          {caseData.case_number ||
            `Case #${caseData.id}`}{" "}
          •{" "}
          {caseData.jurisdiction ||
            "No jurisdiction"}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Status
            </CardTitle>
          </CardHeader>

          <CardContent>
            {caseData.status}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Documents
            </CardTitle>
          </CardHeader>

          <CardContent>
            {documents.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              AI Entities
            </CardTitle>
          </CardHeader>

          <CardContent>
            {graph
              ? graph.nodes.filter(
                (node) =>
                  Array.isArray(node.labels) &&
                  node.labels.includes("Entity")
              ).length
              : 0}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Timeline Events
            </CardTitle>
          </CardHeader>

          <CardContent>
            {events.length}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Claims
            </CardTitle>
          </CardHeader>

          <CardContent>
            {claims.length}
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Graph */}
      <Card>
        <CardHeader>
          <CardTitle>
            Knowledge Graph
          </CardTitle>
        </CardHeader>

        <CardContent>
          <KnowledgeGraph graph={graph} />
        </CardContent>
      </Card>

      {/* Claims & Evidence */}
      <Card>
        <CardHeader>
          <CardTitle>
            Claims & Evidence
          </CardTitle>
        </CardHeader>

        <CardContent>
          {claims.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verified claims have been recorded
              for this case yet.
            </p>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">
                        Claim #{claim.id}
                      </div>

                      <p className="text-sm">
                        {claim.claim_text}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() =>
                        handleClaimEvidence(claim.id)
                      }
                    >
                      {selectedClaimId === claim.id
                        ? "Hide Evidence"
                        : "View Evidence"}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {claim.status && (
                      <span className="rounded-full border px-2 py-1">
                        Status: {claim.status}
                      </span>
                    )}

                    {claim.confidence !== null && (
                      <span className="rounded-full border px-2 py-1">
                        Confidence:{" "}
                        {Math.round(
                          claim.confidence * 100
                        )}
                        %
                      </span>
                    )}
                  </div>

                  {claim.reason && (
                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium">
                        Verification Reason
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {claim.reason}
                      </p>
                    </div>
                  )}

                  {selectedClaimId === claim.id && (
                    <div className="border-t pt-4">
                      {evidenceLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading evidence...
                        </div>
                      )}

                      {evidenceError && (
                        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm">
                          {evidenceError}
                        </div>
                      )}

                      {!evidenceLoading &&
                        !evidenceError &&
                        claimEvidence && (
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-semibold">
                                Evidence Sources
                              </h3>

                              <p className="text-xs text-muted-foreground">
                                {claimEvidence.evidence.length} mapped
                                evidence source
                                {claimEvidence.evidence.length === 1
                                  ? ""
                                  : "s"}
                              </p>
                            </div>

                            {claimEvidence.evidence.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No evidence has been mapped to this
                                claim.
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {claimEvidence.evidence.map(
                                  (evidence) => (
                                    <div
                                      key={evidence.id}
                                      className="rounded-md border p-4 space-y-3"
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                          <FileText className="mt-0.5 h-5 w-5 shrink-0" />

                                          <div>
                                            <p className="font-medium">
                                              {evidence.document_name}
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                              Page{" "}
                                              {evidence.page_number}
                                              {" • "}
                                              Chunk{" "}
                                              {evidence.chunk_index}
                                            </p>
                                          </div>
                                        </div>

                                        <span className="text-xs rounded-full border px-2 py-1">
                                          {evidence.relevance_score !==
                                            null
                                            ? `${Math.round(
                                              evidence.relevance_score *
                                              100
                                            )}% relevance`
                                            : "Relevance unavailable"}
                                        </span>
                                      </div>

                                      <div className="rounded-md bg-muted p-3">
                                        <p className="text-sm whitespace-pre-wrap">
                                          {evidence.text}
                                        </p>
                                      </div>

                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-muted-foreground">
                                          Evidence type:{" "}
                                          {evidence.evidence_type ||
                                            "Not specified"}
                                        </span>

                                        <Link
                                          to={`/cases/${caseId}/documents/${evidence.document_id}/pages/${evidence.page_number}?highlight=${encodeURIComponent(
                                            evidence.text
                                          )}`}
                                        >
                                          <Button
                                            variant="outline"
                                            size="sm"
                                          >
                                            <ExternalLink className="mr-2 h-4 w-4" />
                                            Open Source Page
                                          </Button>
                                        </Link>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>
            Case Timeline
          </CardTitle>
        </CardHeader>

        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No timeline events have been
              extracted yet.
            </p>
          ) : (
            <div className="space-y-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="relative border-l-2 pl-6"
                >
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-primary" />

                  <div className="space-y-1">
                    <div className="font-semibold">
                      {event.event_date
                        ? new Date(
                          event.event_date
                        ).toLocaleDateString()
                        : "Date unavailable"}
                    </div>

                    <div className="font-medium">
                      {event.event_type ||
                        "Case Event"}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Source: Document{" "}
                      {event.document_id} • Page{" "}
                      {event.page_number}
                    </p>

                    {event.confidence !== null && (
                      <p className="text-xs text-muted-foreground">
                        Confidence:{" "}
                        {Math.round(
                          event.confidence * 100
                        )}
                        %
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Case Documents
          </CardTitle>

          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
              onChange={(e) =>
                handleUpload(
                  e.target.files?.[0]
                )
              }
            />

            <Button
              asChild
              disabled={uploading}
            >
              <span>
                <Upload className="mr-2 h-4 w-4" />

                {uploading
                  ? "Processing..."
                  : "Upload Document"}
              </span>
            </Button>
          </label>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Upload your first case document.
              PDF page extraction is enabled
              in Build 02.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5" />

                    <div>
                      <div className="font-medium">
                        {doc.file_name}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {doc.processing_status}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {new Date(
                      doc.created_at
                    ).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};