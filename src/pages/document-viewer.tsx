import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

import { api, ApiDocument, DocumentPage } from "@/services/api";

export function DocumentViewer() {
  const { caseId, documentId, page } = useParams<{
    caseId: string;
    documentId: string;
    page: string;
  }>();

  const parsedCaseId = Number(caseId);
  const parsedDocumentId = Number(documentId);
  const requestedPage = Number(page);
  const [searchParams] = useSearchParams();
  const highlightText = searchParams.get("highlight")?.trim() ?? "";

  const [document, setDocument] = useState<ApiDocument | null>(null);
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !Number.isFinite(parsedCaseId) ||
      !Number.isFinite(parsedDocumentId)
    ) {
      setError("Invalid case or document ID.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const [documents, documentPages] = await Promise.all([
          api.documents(parsedCaseId),
          api.pages(parsedCaseId, parsedDocumentId),
        ]);

        if (cancelled) {
          return;
        }

        const selectedDocument =
          documents.find((item) => item.id === parsedDocumentId) ?? null;

        const sortedPages = [...documentPages].sort(
          (a, b) => a.page_number - b.page_number
        );

        setDocument(selectedDocument);
        setPages(sortedPages);

        if (!selectedDocument) {
          setError("Document not found.");
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load the document."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [parsedCaseId, parsedDocumentId]);

  const currentPage = useMemo(() => {
    if (pages.length === 0) {
      return null;
    }

    return (
      pages.find((item) => item.page_number === requestedPage) ??
      pages[0]
    );
  }, [pages, requestedPage]);

  const currentIndex = useMemo(() => {
    if (!currentPage) {
      return -1;
    }

    return pages.findIndex((item) => item.id === currentPage.id);
  }, [currentPage, pages]);

  const previousPage =
    currentIndex > 0 ? pages[currentIndex - 1] : null;

  const nextPage =
    currentIndex >= 0 && currentIndex < pages.length - 1
      ? pages[currentIndex + 1]
      : null;

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border bg-background p-8 text-center">
          Loading document...
        </div>
      </div>
    );
  }

  if (error || !document || !currentPage) {
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
          <p className="font-medium">Unable to open document</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? "No extracted pages are available for this document."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Link
        to={`/cases/${caseId}`}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Case
      </Link>

      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {document.file_name}
        </h1>

        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Document #{document.id}</span>
          <span>•</span>
          <span>{document.processing_status}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Document Viewer</h2>
              <p className="text-sm text-muted-foreground">
                Navigate through the extracted source pages.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {previousPage ? (
                <Link
                  to={`/cases/${caseId}/documents/${documentId}/pages/${previousPage.page_number}`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
              )}

              <span className="px-2 text-sm font-medium">
                Page {currentPage.page_number} / {pages.length}
              </span>

              {nextPage ? (
                <Link
                  to={`/cases/${caseId}/documents/${documentId}/pages/${nextPage.page_number}`}
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-1 rounded-md border px-3 py-2 text-sm font-medium opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid min-h-[650px] grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border-b bg-muted/20 md:border-b-0 md:border-r">
            <div className="border-b px-4 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Pages</h3>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                {pages.length} extracted{" "}
                {pages.length === 1 ? "page" : "pages"}
              </p>
            </div>

            <nav className="max-h-[600px] overflow-y-auto p-3">
              <div className="space-y-2">
                {pages.map((item) => {
                  const isActive = item.id === currentPage.id;

                  return (
                    <Link
                      key={item.id}
                      to={`/cases/${caseId}/documents/${documentId}/pages/${item.page_number}`}
                      className={`block rounded-lg border px-3 py-3 transition ${
                        isActive
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          Page {item.page_number}
                        </span>

                        {isActive && (
                          <span className="text-xs font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.extracted_text.trim() || "No extracted text"}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </aside>

          <main className="min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Source Page</h3>
                <p className="text-sm text-muted-foreground">
                  Page {currentPage.page_number} of {pages.length}
                </p>
              </div>

              <span className="text-xs text-muted-foreground">
                Document {document.id}
              </span>
            </div>

            <div className="rounded-lg border">
              <div className="border-b px-4 py-3">
                <span className="text-sm font-medium">
                  Page {currentPage.page_number}
                </span>
              </div>

              <div className="max-h-[570px] overflow-y-auto p-5">
                <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {currentPage.extracted_text
                    ? highlightText
                      ? currentPage.extracted_text
                          .split(highlightText)
                          .map((part, index, parts) => (
                            <span key={`${part}-${index}`}>
                              {part}
                              {index < parts.length - 1 && (
                                <mark className="rounded bg-yellow-200 px-1 text-foreground">
                                  {highlightText}
                                </mark>
                              )}
                            </span>
                          ))
                      : currentPage.extracted_text
                    : "No extracted text available."}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}




