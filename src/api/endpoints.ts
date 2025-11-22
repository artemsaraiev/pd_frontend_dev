import { post } from './client';

export type AnchorKind = 'Section' | 'Figure' | 'Lines';

export const paper = {
  async ensure(args: { id: string; title?: string }): Promise<{ id: string }> {
    const data = await post<{ result: string }>(`/PaperIndex/ensure`, args);
    return { id: data.result };
  },
  async updateMeta(args: { id: string; title?: string }): Promise<void> {
    await post<{ ok: true }>(`/PaperIndex/updateMeta`, args);
  },
  async get(args: { id: string }): Promise<{ id: string; title?: string }> {
    const data = await post<
      Array<{ paper: { _id: string; title?: string } | null }>
    >(`/PaperIndex/_get`, { paper: args.id });
    const doc = data[0]?.paper ?? { _id: args.id };
    return { id: doc._id, title: doc.title };
  },
  async listRecent(args?: { limit?: number }): Promise<{ papers: Array<{ id: string; title?: string; createdAt?: number }> }> {
    const data = await post<
      Array<{ papers: Array<{ _id: string; title?: string; createdAt?: number }> }>
    >(`/PaperIndex/_listRecent`, args ?? {});
    const papers = (data[0]?.papers ?? []).map(r => ({
      id: r._id,
      title: r.title,
      createdAt: r.createdAt,
    }));
    return { papers };
  },
  async searchArxiv(args: { q: string }): Promise<{ papers: Array<{ id: string; title?: string }> }> {
    const data = await post<
      Array<{ result: Array<{ id: string; title?: string }> }>
    >(`/PaperIndex/_searchArxiv`, args);
    const result = data[0]?.result ?? [];
    return { papers: result };
  },
};

export const anchored = {
  async create(args: {
    paperId: string;
    kind: AnchorKind;
    ref: string;
    snippet: string;
    session: string;
  }): Promise<{ anchorId: string }> {
    const { paperId, kind, ref, snippet, session } = args;

    // Parse legacy ref string "p=3;rects=x,y,w,h|..."
    let page = 1;
    let rects: Array<{ x: number; y: number; w: number; h: number }> = [];
    try {
      const m = ref.match(/p=(\d+)/);
      if (m) page = parseInt(m[1], 10);
      const rectsPart = ref.split("rects=")[1];
      if (rectsPart) {
        for (const seg of rectsPart.split("|")) {
          const parts = seg.split(",").map((s) => parseFloat(s));
          if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
            rects.push({
              x: parts[0],
              y: parts[1],
              w: parts[2],
              h: parts[3],
            });
          }
        }
      }
    } catch {
      // fall back to default page/empty rects
    }

    // 1) Create the PDF highlight (geometry + quote)
    const highlightRes = await post<{
      highlightId?: string;
      error?: string;
    }>(`/PdfHighlighter/createHighlight`, {
      session,
      paper: paperId,
      page,
      rects,
      quote: snippet,
    });
    if (!highlightRes.highlightId) {
      throw new Error(highlightRes.error ?? "Failed to create highlight");
    }

    // 2) Create the highlighted context pointing at this highlight
    const contextRes = await post<{
      newContext?: string;
      error?: string;
    }>(`/HighlightedContext/create`, {
      session,
      paperId,
      location: highlightRes.highlightId,
      kind,
    });
    if (!contextRes.newContext) {
      throw new Error(contextRes.error ?? "Failed to create context");
    }

    return { anchorId: contextRes.newContext };
  },

  async listByPaper(args: {
    paperId: string;
  }): Promise<
    { anchors: Array<{ _id: string; kind: AnchorKind; ref: string; snippet: string }> }
  > {
    const { paperId } = args;

    // Load contexts for this paper
    const ctxData = await post<
      Array<{
        filteredContexts: Array<{
          _id: string;
          paperId: string;
          author: string;
          location: string;
          kind?: AnchorKind;
          parentContext?: string;
          createdAt: number;
        }>;
      }>
    >(`/HighlightedContext/_getFilteredContexts`, { paperIds: [paperId] });
    const contexts = ctxData[0]?.filteredContexts ?? [];
    if (!contexts.length) return { anchors: [] };

    // Load all highlights for this paper
    const hlData = await post<
      Array<{
        highlights: Array<{
          _id: string;
          paper: string;
          page: number;
          rects: Array<{ x: number; y: number; w: number; h: number }>;
          quote?: string;
        }>;
      }>
    >(`/PdfHighlighter/_listByPaper`, { paper: paperId });
    const highlights = hlData[0]?.highlights ?? [];
    const hlById = new Map(highlights.map((h) => [h._id, h]));

    const anchors = contexts
      .map((ctx) => {
        const hl = hlById.get(ctx.location);
        if (!hl) return null;
        const rectsEncoded = (hl.rects ?? [])
          .map((r) =>
            [r.x, r.y, r.w, r.h].map((n) => Number(n.toFixed(4))).join(","),
          )
          .join("|");
        const ref = `p=${hl.page};rects=${rectsEncoded}`;
        return {
          _id: ctx._id,
          kind: ctx.kind ?? "Lines",
          ref,
          snippet: hl.quote ?? "",
        };
      })
      .filter((a): a is { _id: string; kind: AnchorKind; ref: string; snippet: string } =>
        a !== null
      );

    return { anchors };
  },
};

export const discussion = {
  async open(args: { paperId: string; session?: string }): Promise<{ pubId: string }> {
    const data = await post<{ result: string }>(`/DiscussionPub/open`, args);
    return { pubId: data.result };
  },
  async startThread(args: { pubId: string; author: string; body: string; anchorId?: string; session?: string }): Promise<{ threadId: string }> {
    const data = await post<{ result: string }>(`/DiscussionPub/startThread`, args);
    return { threadId: data.result };
  },
  async reply(args: { threadId: string; author: string; body: string; session?: string }): Promise<{ replyId: string }> {
    const data = await post<{ result: string }>(`/DiscussionPub/reply`, args);
    return { replyId: data.result };
  },
  async replyTo(args: { threadId: string; author: string; body: string; parentId?: string; session?: string }): Promise<{ replyId: string }> {
    const data = await post<{ result: string }>(`/DiscussionPub/replyTo`, args);
    return { replyId: data.result };
  },
  async getPubIdByPaper(args: { paperId: string }): Promise<{ pubId: string | null }> {
    const data = await post<
      Array<{ result: string | null }>
    >(`/DiscussionPub/_getPubIdByPaper`, args);
    const result = data[0]?.result ?? null;
    return { pubId: result };
  },
  async listThreads(args: { pubId: string; anchorId?: string }): Promise<{ threads: Array<{ _id: string; author: string; body: string; anchorId?: string; createdAt: number; editedAt?: number }>}> {
    const data = await post<
      Array<{ threads: Array<{ _id: string; author: string; title?: string; body: string; anchorId?: string; createdAt: number; editedAt?: number }> }>
    >(`/DiscussionPub/_listThreads`, args);
    const threads = data[0]?.threads ?? [];
    return { threads };
  },
  async listReplies(args: { threadId: string }): Promise<{ replies: Array<{ _id: string; author: string; body: string; createdAt: number; editedAt?: number }>}> {
    const data = await post<
      Array<{ replies: Array<{ _id: string; author: string; body: string; anchorId?: string; parentId?: string; createdAt: number; editedAt?: number }> }>
    >(`/DiscussionPub/_listReplies`, args);
    const replies = data[0]?.replies ?? [];
    return { replies };
  },
  async listRepliesTree(args: { threadId: string }): Promise<{ replies: Array<any> }> {
    const data = await post<
      Array<{ replies: Array<any> }>
    >(`/DiscussionPub/_listRepliesTree`, args);
    const replies = data[0]?.replies ?? [];
    return { replies };
  },
};

export const identity = {
  async addORCID(args: { userId: string; orcid: string }): Promise<void> {
    await post<{ ok: true }>(`/IdentityVerification/addORCID`, args);
  },
  async addBadge(args: { userId: string; badge: string }): Promise<void> {
    await post<{ ok: true }>(`/IdentityVerification/addBadge`, args);
  },
  async get(args: { userId: string }): Promise<{ orcid?: string; affiliation?: string; badges: string[] }> {
    const data = await post<{ result: { orcid?: string; affiliation?: string; badges?: string[] } | null }>(`/IdentityVerification/get`, args);
    const r = data.result ?? {};
    return { orcid: r.orcid, affiliation: r.affiliation, badges: r.badges ?? [] };
  },
};

export const session = {
  async register(args: { username: string; password: string }): Promise<{ user?: string; error?: string }> {
    return await post<{ user?: string; error?: string }>(`/UserAuthentication/register`, args);
  },
  async login(args: { username: string; password: string }): Promise<{ session: string } | { error: string }> {
    return await post<{ session: string } | { error: string }>(`/login`, args);
  },
  async logout(args: { session: string }): Promise<{ status: string }> {
    return await post<{ status: string }>(`/logout`, args);
  },
};


