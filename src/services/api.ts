const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem("caseflow_access_token");

  const headers = new Headers(options?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      body || `Request failed with ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export type ApiCase = {
  id: number;
  title: string;
  description?: string | null;
  case_type?: string | null;
  jurisdiction?: string | null;
  case_number?: string | null;
  status: string;
  owner_id?: number | null;
  created_at: string;
  updated_at: string;
};

export type CaseCreate = {
  title: string;
  description?: string;
  case_type?: string;
  jurisdiction?: string;
  case_number?: string;
  status?: string;
};

export type UserCreate = {
  name: string;
  email: string;
  password: string;
  role?: string;
  company?: string;
};

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  company?: string | null;
  created_at: string;
};

export type DocumentPage = {
  id: number;
  document_id: number;
  page_number: number;
  extracted_text: string;
};

export type ApiDocument = {
  id: number;
  case_id: number;
  file_name: string;
  document_type?: string | null;
  mime_type?: string | null;
  processing_status: string;
  created_at: string;
};

export type ApiEvent = {
  id: number;
  case_id: number;
  document_id: number;
  page_id: number;
  page_number: number;
  event_date: string | null;
  event_type: string | null;
  description: string;
  confidence: number | null;
};

/* =========================================================
   Claims & Evidence Types
   ========================================================= */

export type ApiClaim = {
  id: number;
  claim_text: string;
  status: string | null;
  confidence: number | null;
  reason: string | null;
  created_at: string;
};

export type ApiEvidence = {
  id: number;
  document_chunk_id: number;
  document_id: number;
  document_name: string;
  page_id: number;
  page_number: number;
  chunk_index: number;
  text: string;
  relevance_score: number | null;
  evidence_type: string | null;
  created_at: string;
};

export type ApiClaimsResponse = {
  case_id: number;
  claims: ApiClaim[];
};

export type ApiClaimEvidenceResponse = {
  claim_id: number;
  claim_text: string;
  evidence: ApiEvidence[];
};

/* =========================================================
   Knowledge Graph Types
   ========================================================= */

export type ApiGraphNode = {
  id: string | number;
  label: string;
  type: string;
  [key: string]: unknown;
};

export type ApiGraphRelationship = {
  id?: string | number;
  source: string | number;
  target: string | number;
  type: string;
  [key: string]: unknown;
};

export type ApiGraph = {
  case_id: number;
  nodes: ApiGraphNode[];
  relationships: ApiGraphRelationship[];
};

export const api = {
  health: () =>
    request<{ status: string; service: string }>("/health"),

  dashboardStats: () =>
    request<{
      total_cases: number;
      total_documents: number;
      total_ongoing_cases: number;
      total_users: number;
      cases_count_by_type: Record<string, number>;
    }>("/dashboard/stats"),

  createUser: (data: UserCreate) =>
    request<ApiUser>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cases: () =>
    request<ApiCase[]>("/cases"),

  getCase: (id: number) =>
    request<ApiCase>(`/cases/${id}`),

  createCase: (data: CaseCreate) =>
    request<ApiCase>("/cases", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateCase: (id: number, data: Partial<CaseCreate>) =>
    request<ApiCase>(`/cases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteCase: (id: number) =>
    request<void>(`/cases/${id}`, {
      method: "DELETE",
    }),

  documents: (caseId: number) =>
    request<ApiDocument[]>(`/cases/${caseId}/documents`),

  events: (caseId: number) =>
    request<ApiEvent[]>(`/cases/${caseId}/events`),

  claims: (caseId: number) =>
    request<ApiClaimsResponse>(
      `/claims?case_id=${caseId}`
    ),

  claimEvidence: (claimId: number) =>
    request<ApiClaimEvidenceResponse>(
      `/claims/${claimId}/evidence`
    ),

  graph: (caseId: number) =>
    request<ApiGraph>(`/graph/${caseId}`),

  pages: (caseId: number, documentId: number) =>
    request<DocumentPage[]>(
      `/cases/${caseId}/documents/${documentId}/pages`
    ),

  uploadDocument: async (
    caseId: number,
    file: File,
    documentType?: string
  ) => {
    const form = new FormData();

    form.append("file", file);

    if (documentType) {
      form.append("document_type", documentType);
    }

    const token = localStorage.getItem(
      "caseflow_access_token"
    );

    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/cases/${caseId}/documents`,
      {
        method: "POST",
        headers,
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error(
        (await response.text()) ||
        `Upload failed (${response.status})`
      );
    }

    return response.json() as Promise<ApiDocument>;
  },
};

