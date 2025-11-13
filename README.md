# PubDiscuss Frontend

> **Important note:**  
> This prototype currently implements only the functionality of the backend *concepts* from Assignment 4A (PaperIndex, DiscussionPub, AnchoredContext, and IdentityVerification).  
> It is a minimal working version intended for the **Assignment 4B check-in (Oct 21)** to demonstrate end-to-end reactivity and concept actions.  
> I will **expand the app substantially** for the final deadline — including richer front-end features such as a PDF/text viewer, persistent discussion threads, and full paper navigation.

---

- Design (A4c): [`DESIGN_FRONTEND.md`](DESIGN_FRONTEND.md)
- Reflection (A4c): [`REFLECTION_FRONTEND.md`](REFLECTION_FRONTEND.md)
- Change log (A4c): [`changes_for_4c.md`](changes_for_4c.md)

---

- User journey: see [`USER_JOURNEY.md`](USER_JOURNEY.md)
- API specification: see [`API.md`](API.md)
- Visual design study: see [`visual-design/study.md`](visual-design/study.md)

---

## Demo

![Demo](./demo_new.gif)

## Run

```bash
npm install
npm run dev
```

Requires backend running at http://localhost:8000/api.

```bash
cd ../backend
export MONGODB_URL='mongodb+srv://...'
export DB_NAME='pubdiscuss_dev'
deno task concepts
```