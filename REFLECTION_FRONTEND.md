## Reflection (Frontend)

References:
- Frontend changes log: [`frontend/changes_for_4c.md`](frontend/changes_for_4c.md)
- Backend changes log: [`backend/changes_for_4c.md`](backend/changes_for_4c.md)

### What I focused on
- Expanding visible functionality: authentication flow, threads with anchor filters, nested replies, PDF rendering with annotation, and search via arXiv.
- Making the discussion experience more user-friendly: quick replies, collapsible reply trees, anchor-aware filtering, and quoting selected text.

### Where I got stuck
- PDF rendering consumed a surprising amount of time:
  - I hit broken builds at different points while integrating the viewer and its worker.
  - The PDF canvas and text layer sometimes escaped their container (“out of the box”).
  - Pages randomly appeared at different zoom levels (progressively more zoomed on later pages).
  - Z-index and layering were finicky; copy/selection needed to work without overlay collisions.
- Discussion duplicates surfaced due to backend sync multi-matches. Even though the root cause was backend, the frontend had to be defensive:
  - Removed optimistic inserts.
  - Always reload from the backend after actions to reflect the source of truth.

### How I fixed things
- PDF:
  - Used the backend proxy endpoint (`/api/pdf/:id`) to stabilize CORS and range requests.
  - Pinned `pdfjs-dist@3.x` and used the supported viewer APIs; cleaned up CSS for predictable layout and layering.
  - Ensured the worker is imported correctly and avoids HMR pitfalls.
- Discussion:
  - Implemented `ReplyTree` and `ReplyNode` as proper SFCs, avoiding runtime template compilation pitfalls.
  - Added expand/collapse per thread and preserved expanded state across reloads.
  - Implemented “Reply” link focus behavior and quote insertion for a smoother flow.
- Search:
  - Added a real results page and connected it to the backend arXiv search route.

### Decisions and changes
- Initially considered Google Custom Search, but switched to free arXiv search (good enough for the use case).
- Reworked threading UI to be clearer and removed dead or confusing features (like “ensure”) that no longer fit the flow.
- Added annotate flow integrated with the PDF view; selection → annotate → create anchor → discussion.

### Takeaways
- PDF viewer integrations are deceptively deep; expect to budget extra time and test across build modes.
- Tight frontend-backend loops (no optimistic writes, clear refreshes) reduce confusion when sync orchestration changes.
- Small interaction improvements (focus management, quoting, collapse state) have a big impact on perceived polish.


