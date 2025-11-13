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
    const data = await post<{ result: { _id: string; title?: string } | null }>(`/PaperIndex/get`, args);
    const r = data.result ?? { _id: args.id };
    return { id: r._id, title: r.title };
  },
  async listRecent(args?: { limit?: number }): Promise<{ papers: Array<{ id: string; title?: string; createdAt?: number }> }> {
    const data = await post<{ result: Array<{ _id: string; title?: string; createdAt?: number }> }>(`/PaperIndex/listRecent`, args ?? {});
    return { papers: data.result.map(r => ({ id: r._id, title: r.title, createdAt: r.createdAt })) };
  },
  async searchArxiv(args: { q: string }): Promise<{ papers: Array<{ id: string; title?: string }> }> {
    const data = await post<{ result: Array<{ id: string; title?: string }> }>(`/PaperIndex/searchArxiv`, args);
    return { papers: data.result };
  },
};

export const anchored = {
  async create(args: { paperId: string; kind: AnchorKind; ref: string; snippet: string }): Promise<{ anchorId: string }> {
    const data = await post<{ result: string }>(`/AnchoredContext/create`, args);
    return { anchorId: data.result };
  },
  async listByPaper(args: { paperId: string }): Promise<{ anchors: Array<{ _id: string; kind: AnchorKind; ref: string; snippet: string }>}> {
    const data = await post<{ result: any[] }>(`/AnchoredContext/listByPaper`, args);
    return { anchors: data.result };
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
    const data = await post<{ result: string | null }>(`/DiscussionPub/getPubIdByPaper`, args);
    return { pubId: data.result };
  },
  async listThreads(args: { pubId: string; anchorId?: string }): Promise<{ threads: Array<{ _id: string; author: string; body: string; anchorId?: string; createdAt: number; editedAt?: number }>}> {
    const data = await post<{ result: any[] }>(`/DiscussionPub/listThreads`, args);
    return { threads: data.result };
  },
  async listReplies(args: { threadId: string }): Promise<{ replies: Array<{ _id: string; author: string; body: string; createdAt: number; editedAt?: number }>}> {
    const data = await post<{ result: any[] }>(`/DiscussionPub/listReplies`, args);
    return { replies: data.result };
  },
  async listRepliesTree(args: { threadId: string }): Promise<{ replies: Array<any> }> {
    const data = await post<{ result: any[] }>(`/DiscussionPub/listRepliesTree`, args);
    return { replies: data.result as any[] };
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


