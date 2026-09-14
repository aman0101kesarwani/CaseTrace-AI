import { CaseWorkspace, Cases, DocumentViewer, EntityProfile, Home, Root, SignIn, Users } from "@/pages";
import { createBrowserRouter } from "react-router-dom";

export const ROOT = "/";
export const SIGN_IN = "/sign-in";
export const CASES = "/cases";
export const USERS = "/users";
export const CASE_WORKSPACE = "/cases/:id";
export const DOCUMENT_VIEWER = "/cases/:caseId/documents/:documentId/pages/:page";
export const ENTITY_PROFILE = "/cases/:caseId/entities/:entityId";

export const router = createBrowserRouter([
  { path: SIGN_IN, element: <SignIn /> },
  {
    path: ROOT,
    element: <Root />,
    children: [
      { path: ROOT, element: <Home /> },
      { path: CASES, element: <Cases /> },
      { path: CASE_WORKSPACE, element: <CaseWorkspace /> },
      { path: DOCUMENT_VIEWER, element: <DocumentViewer /> },
      { path: ENTITY_PROFILE, element: <EntityProfile /> },
      { path: USERS, element: <Users /> },
    ],
  },
]);


