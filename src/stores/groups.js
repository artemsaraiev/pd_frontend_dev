import { defineStore } from 'pinia';
import { groups as groupsApi, session as sessionApi } from '@/api/endpoints';
import { useSessionStore } from './session';
export const useGroupsStore = defineStore('groups', {
    state: () => ({
        myGroups: [],
        groups: {},
        memberships: [],
        invitations: [],
        groupMembers: {},
        usernames: {},
    }),
    actions: {
        async ensureUsername(userId) {
            if (this.usernames[userId]) {
                return this.usernames[userId];
            }
            const sessionStore = useSessionStore();
            if (!sessionStore.token) {
                return userId;
            }
            try {
                const { username } = await sessionApi.getUsernameById({
                    session: sessionStore.token,
                    user: userId,
                });
                if (username) {
                    this.usernames[userId] = username;
                    return username;
                }
            }
            catch (error) {
                console.error('Failed to load username for', userId, error);
            }
            return userId;
        },
        async loadMyGroups() {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                return;
            try {
                const data = await groupsApi.getGroupsForUser({ session: sessionStore.token });
                this.myGroups = data.groups;
                // Load group details for each group
                await Promise.all(data.groups.map(async (groupId) => {
                    if (!this.groups[groupId]) {
                        const groupData = await groupsApi.getGroup({ group: groupId });
                        if (groupData.group) {
                            this.groups[groupId] = groupData.group;
                            if (groupData.group.admin) {
                                await this.ensureUsername(groupData.group.admin);
                            }
                        }
                    }
                }));
            }
            catch (error) {
                console.error('Failed to load groups:', error);
            }
        },
        async loadMemberships() {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                return;
            try {
                const data = await groupsApi.getMembershipsByUser({ session: sessionStore.token });
                this.memberships = data.memberships;
            }
            catch (error) {
                console.error('Failed to load memberships:', error);
            }
        },
        async loadInvitations() {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                return;
            try {
                const data = await groupsApi.listPendingInvitationsByUser({ session: sessionStore.token });
                this.invitations = data.invitations;
                // Load group details for invitations
                await Promise.all(data.invitations.map(async (inv) => {
                    if (!this.groups[inv.groupId]) {
                        const groupData = await groupsApi.getGroup({ group: inv.groupId });
                        if (groupData.group) {
                            this.groups[inv.groupId] = groupData.group;
                            if (groupData.group.admin) {
                                await this.ensureUsername(groupData.group.admin);
                            }
                        }
                    }
                }));
            }
            catch (error) {
                console.error('Failed to load invitations:', error);
            }
        },
        async refresh() {
            await Promise.all([
                this.loadMyGroups(),
                this.loadMemberships(),
                this.loadInvitations(),
            ]);
        },
        async createGroup(name, description) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            const data = await groupsApi.createGroup({ session: sessionStore.token, name, description });
            await this.refresh();
            return data.newGroup;
        },
        async removeGroup(groupId) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            await groupsApi.removeGroup({ session: sessionStore.token, group: groupId });
            await this.refresh();
        },
        async inviteUser(groupId, invitee, message) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            await groupsApi.inviteUser({ session: sessionStore.token, group: groupId, invitee, message });
            await this.loadInvitations();
        },
        async acceptInvitation(invitationId) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            await groupsApi.acceptInvitation({ session: sessionStore.token, invitation: invitationId });
            await this.refresh();
        },
        async removeInvitation(invitationId) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            await groupsApi.removeInvitation({ session: sessionStore.token, invitation: invitationId });
            await this.loadInvitations();
        },
        async leaveGroup(membershipId) {
            const sessionStore = useSessionStore();
            if (!sessionStore.token)
                throw new Error('Not authenticated');
            await groupsApi.revokeMembership({ session: sessionStore.token, membership: membershipId });
            await this.refresh();
        },
        async loadGroupMembers(groupId) {
            try {
                const { memberships } = await groupsApi.getMembershipsByGroup({ group: groupId });
                this.groupMembers[groupId] = memberships;
                await Promise.all(memberships.map((m) => this.ensureUsername(m.user)));
            }
            catch (error) {
                console.error('Failed to load group members:', error);
            }
        },
    },
});
