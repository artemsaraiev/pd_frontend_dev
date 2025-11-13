## Frontend Design (A4c)

This document summarizes the frontend design and the final state of the UI/UX for A4c. It references the changes logs and highlights the key features implemented for the final demo.

References:
- Frontend changes log: [`frontend/changes_for_4c.md`](frontend/changes_for_4c.md)
- Backend changes log: [`backend/changes_for_4c.md`](backend/changes_for_4c.md)

### Scope and Goals
- Surface authorization flows in the UI with a clean sign-in/out experience.
- Add threads and rethought anchoring tied to PDF text selections.
- Add PDF support with reliable rendering and text selection for annotation.
- Implement nested replies (Reddit-style) with collapsible trees.
- Integrate search via arXiv and a dedicated results page.

### Key UI/UX Changes
- PDF Viewer
  - Centered viewer with toolbar and proper layering for the text layer.
  - Proxy-based source (`/api/pdf/:id`) to avoid CORS and enable range requests.
  - Inline selection → annotation flow: selection triggers an “Annotate” action; quote formatting (`>`).
  - Time sink: PDF rendering was the main issue; fixed build compatibility, contained the canvas/textLayer, prevented zoom drift, and stabilized z-index stacking.
- Anchors + Discussion (Right Sidebar)
  - Users can create anchors from selection; anchors are saved and shown in the discussion panel.
  - Threads can be filtered by anchor id.
  - “Reply” link focuses quick-reply, improving flow and reducing friction.
- Nested Replies (Reddit-style)
  - `ReplyTree` recursive component and `ReplyNode` child component render nested replies reliably.
  - Collapsible “View replies” / “Hide replies” per thread for performance and readability.
- Authentication
  - Login view with MIT email validation; persisted session in store.
  - Navbar shows sign-in/out and session state.
- Search
  - Dedicated search results page calling backend `/api/PaperIndex/searchArxiv`.
  - Results link to our paper page and to arXiv.

### Technical Notes
- API endpoints align with backend routes and sync decisions; protected flows require valid session tokens.
- Removed optimistic inserts in discussion; all views reload from backend to avoid duplicates.
- State management refactored to preserve expanded thread states across reloads for better UX.
- Components:
  - `PdfView.vue`, `DiscussionPanel.vue`, `ReplyTree.vue`, `ReplyNode.vue`, `TopNav.vue`, `Login.vue`, search results view and store/session updates.

### Rubric Alignment
- Functionality: Auth, anchors, threads, nested replies, PDF rendering, arXiv search; all integrated.
- Authentication: Enforced by backend syncs; frontend uses tokens and hides controls when not signed in.
- Syncs: Frontend defers orchestration to backend; no frontend-only “sync-like” workarounds.
- Polish: Improved UI flows, collapsible replies, quoting, anchor filters, and search navigation.
- Deployment: Works with backend proxy; ready for production build.


