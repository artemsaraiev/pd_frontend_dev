import { defineStore } from 'pinia';
import { groups as groupsApi, session as sessionApi } from '@/api/endpoints';
import { useSessionStore } from './session';

export interface Group {
  _id: string;
  name: string;
  description: string;
  admin: string;
}

export interface Membership {
  _id: string;
  groupId: string;
  user: string;
  isAdmin: boolean;
}

export interface Invitation {
  _id: string;
  groupId: string;
  inviter: string;
  invitee: string;
  message?: string;
  createdAt: number;
}

export const useGroupsStore = defineStore('groups', {
  state: () => ({
    myGroups: [] as string[],
    groups: {} as Record<string, Group>,
    memberships: [] as Membership[],
    invitations: [] as Invitation[],
    groupMembers: {} as Record<string, Membership[]>,
    usernames: {} as Record<string, string>,
  }),
  actions: {
    async ensureUsername(userId: string): Promise<string> {
      if (this.usernames[userId]) return this.usernames[userId];
      const sessionStore = useSessionStore();
      if (!sessionStore.token) return userId;
      try {
        const { username } = await sessionApi.getUsernameById({
          session: sessionStore.token,
          user: userId,
        });
        if (username) {
          this.usernames[userId] = username;
          return username;
        }
      } catch (error) {
        console.error('Failed to load username for', userId, error);
      }
      return userId;
    },
    async loadMyGroups() {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) return;
      try {
        const data = await groupsApi.getGroupsForUser({ session: sessionStore.token });
        this.myGroups = data.groups;
        // Load group details for each group
        await Promise.all(data.groups.map(async (groupId) => {
          if (!this.groups[groupId]) {
            const groupData = await groupsApi.getGroup({ group: groupId });
            if (groupData.group) {
              this.groups[groupId] = groupData.group;
              // Preload admin username for nicer display
              if (groupData.group.admin) {
                await this.ensureUsername(groupData.group.admin);
              }
            }
          }
        }));
      } catch (error) {
        console.error('Failed to load groups:', error);
      }
    },
    async loadMemberships() {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) return;
      try {
        const data = await groupsApi.getMembershipsByUser({ session: sessionStore.token });
        this.memberships = data.memberships;
      } catch (error) {
        console.error('Failed to load memberships:', error);
      }
    },
    async loadInvitations() {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) return;
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
      } catch (error) {
        console.error('Failed to load invitations:', error);
      }
    },
    async loadGroupMembers(groupId: string) {
      try {
        const { memberships } = await groupsApi.getMembershipsByGroup({ group: groupId });
        this.groupMembers[groupId] = memberships;
        await Promise.all(
          memberships.map((m) => this.ensureUsername(m.user)),
        );
      } catch (error) {
        console.error('Failed to load group members:', error);
      }
    },
    async refresh() {
      await Promise.all([
        this.loadMyGroups(),
        this.loadMemberships(),
        this.loadInvitations(),
      ]);
    },
    async createGroup(name: string, description: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      const data = await groupsApi.createGroup({ session: sessionStore.token, name, description });
      await this.refresh();
      return data.newGroup;
    },
    async removeGroup(groupId: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      await groupsApi.removeGroup({ session: sessionStore.token, group: groupId });
      await this.refresh();
    },
    async inviteUser(groupId: string, invitee: string, message?: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      await groupsApi.inviteUser({ session: sessionStore.token, group: groupId, invitee, message });
      await this.loadInvitations();
    },
    async acceptInvitation(invitationId: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      await groupsApi.acceptInvitation({ session: sessionStore.token, invitation: invitationId });
      await this.refresh();
    },
    async removeInvitation(invitationId: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      await groupsApi.removeInvitation({ session: sessionStore.token, invitation: invitationId });
      await this.loadInvitations();
    },
    async leaveGroup(membershipId: string) {
      const sessionStore = useSessionStore();
      if (!sessionStore.token) throw new Error('Not authenticated');
      await groupsApi.revokeMembership({ session: sessionStore.token, membership: membershipId });
      await this.refresh();
    },
  },
});

