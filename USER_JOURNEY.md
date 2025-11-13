A user opens PubDiscuss, ensures a paper by ID and title, adds an anchor (kind/ref/snippet), opens a discussion for that paper, starts a thread optionally tied to that anchor, posts a quick reply, and finally saves their ORCID and adds a badge. The UI shows small success toasts and a recent-actions list so the demo is visual without list queries.

![Demo](./demo_new.gif)

Demo steps narrated:
1. Ensure a paper (ID + Title) → success note.
2. Add anchor (Kind, Ref, Snippet) → toast + session anchor list shows anchorId.
3. Open Pub → shows pubId; the button disables.
4. Start thread (author u1, body, optional anchorId) → threadId appears in recent actions.
5. Reply (threadId + body) → replyId appears in recent actions.
6. Identity: Save ORCID and add a badge → success toasts.
