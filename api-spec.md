# PubDiscuss API (used by frontend)

Base URL: `http://localhost:8000/api`

- POST /PaperIndex/ensure → { result: string }
- POST /PaperIndex/updateMeta → { ok: true }
- POST /AnchoredContext/create → { result: string }
- POST /DiscussionPub/open → { result: string }
- POST /DiscussionPub/startThread → { result: string }
- POST /DiscussionPub/reply → { result: string }
- POST /IdentityVerification/addORCID → { ok: true }
- POST /IdentityVerification/addBadge → { ok: true }
