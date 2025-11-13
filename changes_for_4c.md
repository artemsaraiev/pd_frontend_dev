### A4c migration notes (frontend)

- The backend migrated logic from `backend/concepts/*` services into `backend/src/concepts/*` classes to align with the Requesting + syncs architecture.
- Frontend API routes remain the same; no changes required here unless backend endpoints change or passthrough exclusions are updated.

Completed changes:
- Search UX:
  - Added results page `src/views/SearchResults.vue` and route `/search?q=...`.
  - `src/components/TopNav.vue` now routes to `/search` (and opens `/paper/:id` only when the input looks like an arXiv id).
  - `src/views/PaperPage.vue` no longer auto-picks the first arXiv result; if the URL param is not an arXiv id, it redirects to `/search?q=...`.
  - Added `src/env.d.ts` for Vue SFC typing to satisfy TS.

Latest updates:
- Auth UI:
  - Added `src/views/Login.vue`, persisted session in `src/stores/session.ts`, and added Sign in/Sign out in `src/components/TopNav.vue`.
- Search:
  - The new results page calls backend `/api/PaperIndex/searchArxiv` and renders a list of arXiv matches with links to our paper page and arXiv (abs/pdf). This replaces the previous behavior that auto-navigated to the first result.
- Removed Explore:
  - Deleted `src/views/Explore.vue` and its route/link.
- Discussion UX:
  - `DiscussionPanel.vue`: changed “Body” to “Topic”, added inline “Reply” link per thread, removed optimistic inserts (reloads from backend to avoid duplicates).
- “My Papers” per-user:
  - Library stored under `localStorage` key `library:<userId>`; switching accounts switches saved papers. Updated `PaperPage.vue` and `MyPapers.vue`.

PDF & discussion updates (new):
- Centered PDF viewer with highlight capture
  - New component `src/components/PdfView.vue` using `pdfjs-dist@3.x` viewer (`PDFPageView`, textLayer).
  - `src/views/PaperPage.vue` now centers the PDF in a scrollable pane with a zoom toolbar; the right sidebar shows Discussion + Anchors.
  - `src/styles/pdf.css` ensures pdf.js helper boxes are hidden, selection is enabled, and z-index is correct (canvas < textLayer < overlay).
  - The viewer accepts `[proxy, arXiv]` sources and falls back automatically if the proxy is unavailable.
  - Text selection → confirm → saves an anchor via `/AnchoredContext/create` with `ref="p=..;rects=.."` and draws overlay highlights.
- Anchors + threads
  - Clicking “Reply” in Discussion focuses the Quick reply box.
  - Threads can be filtered by anchor id; selecting text and creating an anchor allows starting a thread bound to that anchor.
- Infinite-nesting replies
  - New recursive component `src/components/ReplyTree.vue` renders nested replies.
  - API additions in `src/api/endpoints.ts`: `discussion.replyTo`, `discussion.listRepliesTree`.
  - `DiscussionPanel.vue` switched to `listRepliesTree` so replies nest like Reddit.
- Stability/interop
  - Pinned pdf.js to v3 (`pdfjs-dist@3.11.174`) and imported `web/pdf_viewer` + worker from `build/pdf.worker.min.js`.
  - Fixed HMR/Pinia edge case in `TopNav.vue` during hot reloads.

Reddit-style collapsible replies (latest):
- `DiscussionPanel.vue`:
  - Added expand/collapse toggle for thread replies with "View replies" / "Hide replies" links.
  - Replies are now hidden by default and only render when expanded (performance improvement for threads with many replies).
  - Reactive `expanded` state tracks which threads are expanded per thread ID.
  - Expanded state preserved across thread reloads (no reset when creating anchors).
- `ReplyTree.vue`:
  - Refactored from inline `defineComponent` with string template to proper SFC architecture.
  - Fixed Vue runtime compilation error by splitting `ReplyNode` into separate component.
- `src/components/ReplyNode.vue` (new):
  - Extracted recursive reply node component to its own SFC file.
  - Handles nested reply rendering, inline reply composition, and recursive children.
  - Properly supports Vue 3 SFC compilation without runtime template compiler.
- Build verification:
  - Frontend production build passes (`npm run build`).
  - Backend build passes (`deno task build`).

ChatGPT-style text annotation (final updates):
- `src/components/PdfView.vue`:
  - Removed blocking `confirm()` dialog
  - Added inline popup that appears on text selection with "💬 Annotate" button
  - Removed "Highlight" button (simplified to annotation-only workflow)
  - Popup positioned near selection with modern styling (shadow, hover effects)
  - Emits `text-selected` event when annotate is clicked
  - Text automatically formatted as quote (`> selected text`)
- `src/components/DiscussionPanel.vue`:
  - Listens for `text-selected` global event
  - Inserts quoted text into focused textarea or quick reply box
  - Maintains cursor position and triggers Vue reactivity
  - Works seamlessly with thread creation and quick replies
- `src/components/ReplyNode.vue`:
  - Also listens for `text-selected` event
  - Enables annotation into nested reply textareas
  - Selection cleared after insertion

MIT Email Authentication (final updates):
- `src/views/Login.vue`:
  - Combined login/register form with toggle button
  - MIT email validation on frontend (`@mit.edu` required)
  - Email input type with placeholder `your_email@mit.edu`
  - Clear hints: "Only @mit.edu emails are allowed"
  - Success/error messages for both registration and login
  - Mode toggle: "Need an account? Register" / "Already have an account? Sign in"
  - Computed validation: button disabled if email doesn't match `@mit.edu` pattern
- User experience:
  - Must register with MIT email before login
  - Password stored securely (hashed on backend)
  - Clear feedback on registration success
  - Automatic mode switch after successful registration

Next steps:
- Re-run app (`deno task import` in backend, then `deno task start`) and click through flows to ensure endpoints still work.
- If any routes move behind Requesting-only (not passthrough), adjust API calls accordingly.
- Ready for deployment to Render (see `DEPLOYMENT.md`).


