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
        const data = await post(`/PaperIndex/get`, args);
        const r = data.result ?? { _id: args.id };
        return { id: r._id, title: r.title };
    },
    async listRecent(args) {
        const data = await post(`/PaperIndex/listRecent`, args ?? {});
        return { papers: data.result.map(r => ({ id: r._id, title: r.title, createdAt: r.createdAt })) };
    },
    async searchArxiv(args) {
        const data = await post(`/PaperIndex/searchArxiv`, args);
        return { papers: data.result };
    },
};
export const anchored = {
    async create(args) {
        const data = await post(`/AnchoredContext/create`, args);
        return { anchorId: data.result };
    },
    async listByPaper(args) {
        const data = await post(`/AnchoredContext/listByPaper`, args);
        return { anchors: data.result };
    },
};
export const discussion = {
    async open(args) {
        const data = await post(`/DiscussionPub/open`, args);
        return { pubId: data.result };
    },
    async startThread(args) {
        const data = await post(`/DiscussionPub/startThread`, args);
        return { threadId: data.result };
    },
    async reply(args) {
        const data = await post(`/DiscussionPub/reply`, args);
        return { replyId: data.result };
    },
    async replyTo(args) {
        const data = await post(`/DiscussionPub/replyTo`, args);
        return { replyId: data.result };
    },
    async getPubIdByPaper(args) {
        const data = await post(`/DiscussionPub/getPubIdByPaper`, args);
        return { pubId: data.result };
    },
    async listThreads(args) {
        const data = await post(`/DiscussionPub/listThreads`, args);
        return { threads: data.result };
    },
    async listReplies(args) {
        const data = await post(`/DiscussionPub/listReplies`, args);
        return { replies: data.result };
    },
    async listRepliesTree(args) {
        const data = await post(`/DiscussionPub/listRepliesTree`, args);
        return { replies: data.result };
    },
};
export const identity = {
    async addORCID(args) {
        await post(`/IdentityVerification/addORCID`, args);
    },
    async addBadge(args) {
        await post(`/IdentityVerification/addBadge`, args);
    },
    async get(args) {
        const data = await post(`/IdentityVerification/get`, args);
        const r = data.result ?? {};
        return { orcid: r.orcid, affiliation: r.affiliation, badges: r.badges ?? [] };
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
};
