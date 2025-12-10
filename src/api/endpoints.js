import { post } from './client';
export const paper = {
    async ensure(args) {
        const data = await post(`/PaperIndex/ensure`, args);
        return { id: data.result };
    },
    async updateMeta(args) {
        await post(`/PaperIndex/updateMeta`, args);
    },
    async get(args) {
        // id is the external paperId (DOI, arXiv, etc.)
        // Use getByPaperId to get the paper by external identifier
        const data = await post(`/PaperIndex/getByPaperId`, { paperId: args.id });
        const doc = data.result;
        if (doc) {
            // Return both internal _id (for backend operations) and external paperId (for display/URLs)
            return { id: doc._id, paperId: doc.paperId, title: doc.title };
        }
        // If paper doesn't exist, return the external id as fallback for both
        return { id: args.id, paperId: args.id };
    },
    async listRecent(args) {
        // Sync returns { papers: [{ paper: PaperDoc }, ...] }
        const data = await post(`/PaperIndex/listRecent`, args ?? {});
        // Extract papers from wrapped format
        const papers = data.papers.map((r) => ({
            id: r.paper._id, // Internal _id for backend operations
            paperId: r.paper.paperId, // External paperId for display/URLs
            title: r.paper.title,
            createdAt: r.paper.createdAt,
        }));
        return { papers };
    },
    async searchArxiv(args) {
        // Query returns fan-out format: Array<{ result: { id, title? } }>
        const data = await post(`/PaperIndex/_searchArxiv`, args);
        // Collect all results from fan-out format
        const results = data.map(r => r.result);
        return { papers: results };
    },
    async searchBiorxiv(args) {
        // Query returns fan-out format: Array<{ result: { id, title?, doi? } }>
        const data = await post(`/PaperIndex/_searchBiorxiv`, args);
        // Collect all results from fan-out format
        const results = data.map(r => r.result);
        return { papers: results };
    },
    async listRecentBiorxiv(args) {
        // Query returns fan-out format: Array<{ result: { id, title?, doi? } }>
        const data = await post(`/PaperIndex/_listRecentBiorxiv`, args ?? {});
        // Collect all results from fan-out format
        const results = data.map(r => r.result);
        return { papers: results };
    },
};
export const anchored = {
    async create(args) {
        const { paperId, kind, ref, snippet, color, session, parentContext } = args;
        // Convert external paperId to internal _id for PdfHighlighter operations
        // Ensure paper exists and get internal _id
        const ensured = await paper.ensure({ id: paperId });
        const internalPaperId = ensured.id;
        // Parse legacy ref string "p=3;rects=x,y,w,h|..."
        let page = 1;
        let rects = [];
        try {
            const m = ref.match(/p=(\d+)/);
            if (m)
                page = parseInt(m[1], 10);
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
        }
        catch {
            // fall back to default page/empty rects
        }
        // 1) Create the PDF highlight (geometry + quote)
        // Use internal _id for PdfHighlighter operations
        const highlightRes = await post(`/PdfHighlighter/createHighlight`, {
            session,
            paper: internalPaperId,
            page,
            rects,
            quote: snippet,
            color,
        });
        if (!highlightRes.highlightId) {
            throw new Error(highlightRes.error ?? "Failed to create highlight");
        }
        // 2) Create the highlighted context pointing at this highlight
        const contextRes = await post(`/HighlightedContext/create`, {
            session,
            paperId,
            location: highlightRes.highlightId,
            kind,
            ...(parentContext && { parentContext }),
        });
        if (!contextRes.newContext) {
            throw new Error(contextRes.error ?? "Failed to create context");
        }
        return { anchorId: contextRes.newContext };
    },
    async listByPaper(args) {
        const { paperId } = args;
        // Convert external paperId to internal _id for PdfHighlighter operations
        // Ensure paper exists and get internal _id
        const ensured = await paper.ensure({ id: paperId });
        const internalPaperId = ensured.id;
        // Load contexts for this paper (uses external paperId)
        // Sync returns { filteredContexts: [{ filteredContext: ContextDoc }, ...] }
        const ctxData = await post(`/HighlightedContext/getFilteredContexts`, { paperIds: [paperId], authors: null });
        // Extract contexts from the wrapped format
        const contexts = ctxData.filteredContexts?.map((c) => c.filteredContext) ?? [];
        if (!contexts.length)
            return { anchors: [] };
        // Load all highlights for this paper (uses internal _id)
        // The sync returns { highlights: [{ highlight: HighlightDoc }, ...] } (wrapped)
        // collectAs doesn't unwrap, so we need to extract the highlight field
        const hlData = await post(`/PdfHighlighter/listByPaper`, { paper: internalPaperId });
        const rawHighlights = hlData?.highlights ?? [];
        // Unwrap highlights from { highlight: HighlightDoc } format
        const highlights = rawHighlights.map((h) => h.highlight);
        const hlById = new Map(highlights.map((h) => [h._id, h]));
        const anchors = contexts
            .map((ctx) => {
            const hl = hlById.get(ctx.location);
            if (!hl)
                return null;
            const rectsEncoded = (hl.rects ?? [])
                .map((r) => [r.x, r.y, r.w, r.h].map((n) => Number(n.toFixed(4))).join(","))
                .join("|");
            const ref = `p=${hl.page};rects=${rectsEncoded}`;
            return {
                _id: ctx._id,
                kind: ctx.kind ?? "Lines",
                ref,
                snippet: hl.quote ?? "",
                color: hl.color,
                parentContext: ctx.parentContext,
            };
        })
            .filter((a) => a !== null);
        return { anchors };
    },
};
export const discussion = {
    async open(args) {
        const data = await post(`/DiscussionPub/open`, args);
        return { pubId: data.result };
    },
    async startThread(args) {
        // Use different endpoints for public vs private threads
        const endpoint = args.groupId
            ? `/DiscussionPub/startPrivateThread`
            : `/DiscussionPub/startThread`;
        // Always send anchorId and isAnonymous so the sync pattern matches
        const payload = {
            ...args,
            anchorId: args.anchorId || '',
            isAnonymous: args.isAnonymous ?? false,
        };
        const data = await post(endpoint, payload);
        return { threadId: data.result };
    },
    async reply(args) {
        // Use different endpoints for public vs private replies
        const endpoint = args.groupId
            ? `/DiscussionPub/replyPrivate`
            : `/DiscussionPub/reply`;
        // Always send anchorId and isAnonymous - backend sync requires it
        const payload = { ...args, anchorId: args.anchorId || '', isAnonymous: args.isAnonymous ?? false };
        const data = await post(endpoint, payload);
        return { replyId: data.result };
    },
    async replyTo(args) {
        // Use different endpoints for public vs private replies
        const endpoint = args.groupId
            ? `/DiscussionPub/replyToPrivate`
            : `/DiscussionPub/replyTo`;
        // Always send anchorId and isAnonymous - backend sync requires it
        const payload = { ...args, anchorId: args.anchorId || '', isAnonymous: args.isAnonymous ?? false };
        const data = await post(endpoint, payload);
        return { replyId: data.result };
    },
    async getPubIdByPaper(args) {
        const data = await post(`/DiscussionPub/getPubIdByPaper`, args);
        return { pubId: data.result };
    },
    async listPaperStats(args) {
        const data = await post(`/DiscussionPub/_listPaperDiscussionStats`, args);
        const stats = data.map((r) => r.result);
        return { stats };
    },
    async listThreads(args) {
        // Sync collects threads into { threads: [{ thread: ThreadDoc }, ...] } response
        const data = await post(`/DiscussionPub/listThreads`, {
            ...args,
            includeDeleted: args.includeDeleted ?? true,
            groupFilter: args.groupFilter || 'all',
            sortBy: args.sortBy || 'createdAt',
        });
        // Unwrap threads from { thread: ThreadDoc } format
        const threads = data.threads.map((t) => t.thread);
        return { threads };
    },
    async voteThread(args) {
        const data = await post(`/DiscussionPub/voteThread`, args);
        return data;
    },
    async voteReply(args) {
        const data = await post(`/DiscussionPub/voteReply`, args);
        return data;
    },
    async deleteThread(args) {
        const data = await post(`/DiscussionPub/deleteThread`, args);
        return data;
    },
    async deleteReply(args) {
        const data = await post(`/DiscussionPub/deleteReply`, args);
        return data;
    },
    async listReplies(args) {
        // Sync collects replies into { replies: [{ reply: ReplyDoc }, ...] } response
        const data = await post(`/DiscussionPub/listReplies`, {
            ...args,
            includeDeleted: args.includeDeleted ?? true,
            sortBy: args.sortBy || 'createdAt',
        });
        // Unwrap replies from { reply: ReplyDoc } format
        const replies = data.replies.map((r) => r.reply);
        return { replies };
    },
    async listRepliesTree(args) {
        // Sync collects replies into { replies: [{ reply: ReplyTreeNode }, ...] } response
        const data = await post(`/DiscussionPub/listRepliesTree`, {
            ...args,
            includeDeleted: args.includeDeleted ?? true,
            sortBy: args.sortBy || 'createdAt',
        });
        // Unwrap replies from { reply: ReplyTreeNode } format
        const replies = data.replies.map((r) => r.reply);
        return { replies };
    },
    async getAnonymousPseudonym(args) {
        const data = await post(`/DiscussionPub/getAnonymousPseudonym`, args);
        return data;
    },
};
export const identity = {
    async addORCID(args) {
        const data = await post(`/IdentityVerification/addORCID`, args);
        return data;
    },
    async addBadge(args) {
        await post(`/IdentityVerification/addBadge`, args);
    },
    async get(args) {
        // Sync queries all three and combines them into { orcids, affiliations, badges }
        const data = await post(`/IdentityVerification/getByUser`, args);
        const orcidDoc = data.orcids?.[0]?.orcid;
        const orcid = orcidDoc?.orcid;
        const orcidId = orcidDoc?._id;
        const verified = orcidDoc?.verified ?? false;
        const affiliation = data.affiliations?.[0]?.affiliation?.affiliation;
        const badges = data.badges?.map((b) => b.badge.badge) ?? [];
        return { orcid, orcidId, verified, affiliation, badges };
    },
    async initiateVerification(args) {
        const data = await post(`/IdentityVerification/initiateORCIDVerification`, args);
        return data;
    },
    async completeVerification(args) {
        const data = await post(`/IdentityVerification/completeORCIDVerification`, args);
        return data;
    },
    async getORCIDFromState(args) {
        const data = await post(`/IdentityVerification/getORCIDFromState`, args);
        return data;
    },
    async removeORCID(args) {
        const data = await post(`/IdentityVerification/removeORCID`, args);
        return data;
    },
};
export const session = {
    async register(args) {
        return await post(`/UserAuthentication/register`, args);
    },
    async login(args) {
        return await post(`/login`, args);
    },
    async logout(args) {
        return await post(`/logout`, args);
    },
    async getUsernameById(args) {
        const data = await post(`/UserAuthentication/_getUsernameById`, args);
        return data;
    },
};
export const groups = {
    async createGroup(args) {
        const data = await post(`/AccessControl/createGroup`, args);
        return data;
    },
    async updateGroup(args) {
        const data = await post(`/AccessControl/updateGroup`, args);
        return data;
    },
    async removeGroup(args) {
        const data = await post(`/AccessControl/removeGroup`, args);
        return data;
    },
    async getGroup(args) {
        const data = await post(`/AccessControl/getGroup`, args);
        return data;
    },
    async getGroupsForUser(args) {
        const data = await post(`/AccessControl/getGroupsForUser`, args);
        return { groups: data.groups.map(g => g.group) };
    },
    async getMembershipsByGroup(args) {
        // Sync returns { memberships: [{ membership: MembershipDoc }, ...] }
        const data = await post(`/AccessControl/getMembershipsByGroup`, args);
        // Unwrap memberships from { membership: MembershipDoc } format
        return { memberships: data.memberships.map(m => m.membership) };
    },
    async getMembershipsByUser(args) {
        // Sync returns { memberships: [{ membership: MembershipDoc }, ...] }
        const data = await post(`/AccessControl/getMembershipsByUser`, args);
        // Unwrap memberships from { membership: MembershipDoc } format
        return { memberships: data.memberships.map(m => m.membership) };
    },
    async inviteUser(args) {
        const data = await post(`/AccessControl/inviteUser`, args);
        return data;
    },
    async removeInvitation(args) {
        const data = await post(`/AccessControl/removeInvitation`, args);
        return data;
    },
    async acceptInvitation(args) {
        const data = await post(`/AccessControl/acceptInvitation`, args);
        return data;
    },
    async listPendingInvitationsByUser(args) {
        // Sync returns { invitations: [{ invitation: InvitationDoc }, ...] }
        const data = await post(`/AccessControl/listPendingInvitationsByUser`, args);
        // Unwrap invitations from { invitation: InvitationDoc } format
        return { invitations: data.invitations.map(i => i.invitation) };
    },
    async getInvitation(args) {
        const data = await post(`/AccessControl/getInvitation`, args);
        return data;
    },
    async revokeMembership(args) {
        const data = await post(`/AccessControl/revokeMembership`, args);
        return data;
    },
};

// Lightweight wrapper for AccessControl visibility query (used for UI badges)
export const accessControl = {
    async getResourceVisibility(args) {
        const data = await post(`/AccessControl/_getResourceVisibility`, args);
        const vis = (data[0] && data[0].visibility) || {};
        return {
            isPublic: vis.isPublic ?? false,
            groupId: vis.groupId ?? null,
        };
    },
};
