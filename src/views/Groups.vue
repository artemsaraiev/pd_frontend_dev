<template>
  <div class="page">
    <!-- Sign-in prompt for non-authenticated users -->
    <div v-if="!isLoggedIn" class="auth-guard">
      <div class="auth-message">Sign in to view Groups</div>
      <button class="sign-in-button" @click="goLogin">Sign in</button>
    </div>

    <!-- Main content for authenticated users -->
    <template v-else>
      <h2>Groups & Invitations</h2>

      <!-- Create Group Section -->
      <section class="section">
      <h3>Create New Group</h3>
      <form @submit.prevent="handleCreateGroup" class="form">
        <input v-model="newGroupName" type="text" placeholder="Group name" required class="input" />
        <textarea v-model="newGroupDescription" placeholder="Description" class="textarea" rows="3"></textarea>
        <button type="submit" class="button">Create Group</button>
      </form>
      <p v-if="createError" class="error">{{ createError }}</p>
    </section>

    <!-- Pending Invitations Section -->
    <section class="section" v-if="store.invitations.length > 0">
      <h3>Pending Invitations</h3>
      <div class="cards">
        <div v-for="inv in store.invitations" :key="inv._id" class="card">
          <div class="card-content">
            <h4>{{ store.groups[inv.groupId]?.name || 'Loading...' }}</h4>
            <p class="description">{{ store.groups[inv.groupId]?.description || '' }}</p>
            <p v-if="inv.message" class="message">{{ inv.message }}</p>
            <p class="meta">Invited by: {{ inv.inviter }}</p>
          </div>
          <div class="card-actions">
            <button @click="handleAcceptInvitation(inv._id)" class="button button-primary">Accept</button>
            <button @click="handleRemoveInvitation(inv._id)" class="button button-ghost">Decline</button>
          </div>
        </div>
      </div>
    </section>

    <!-- My Groups Section -->
    <section class="section">
      <h3>My Groups</h3>
      <div v-if="store.myGroups.length === 0" class="hint">You are not a member of any groups yet.</div>
      <div v-else class="cards">
        <div v-for="groupId in store.myGroups" :key="groupId" class="card">
          <div class="card-content">
            <h4>{{ store.groups[groupId]?.name || 'Loading...' }}</h4>
            <p class="description">{{ store.groups[groupId]?.description || '' }}</p>
            <p class="meta">
              Admin:
              <span class="admin-name">
                {{ getAdminName(groupId) }}
              </span>
              <span v-if="isAdmin(groupId)" class="badge">Admin</span>
            </p>
            <div
              v-if="isAdmin(groupId) && showMembers[groupId]"
              class="members-panel"
            >
              <div class="members-header">
                <span class="members-title">Members</span>
                <span class="members-count">
                  ({{ (store as any).groupMembers?.[groupId]?.length || 0 }})
                </span>
              </div>
              <ul class="members-list">
                <li
                  v-for="m in ((store as any).groupMembers?.[groupId] || [])"
                  :key="m._id"
                  class="member-row"
                >
                  <div class="member-main">
                    <span class="member-name">
                      {{ getUsername(m.user) }}
                    </span>
                    <span
                      v-if="m.isAdmin"
                      class="member-badge"
                    >
                      Admin
                    </span>
                    <span
                      v-else
                      class="member-role"
                    >
                      Member
                    </span>
                  </div>
                  <button
                    v-if="!m.isAdmin"
                    class="button button-ghost member-remove"
                    @click="handleRemoveMember(m._id, getUsername(m.user))"
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div class="card-actions">
            <button
              v-if="isAdmin(groupId)"
              @click="handleInviteUser(groupId)"
              class="button button-primary"
            >
              Invite User
            </button>
            <button
              v-if="isAdmin(groupId)"
              @click="toggleMembers(groupId)"
              class="button button-ghost"
            >
              {{ showMembers[groupId] ? 'Hide members' : 'Manage members' }}
            </button>
            <button
              v-if="!isAdmin(groupId)"
              @click="handleLeaveGroup(groupId)"
              class="button button-ghost"
            >
              Leave Group
            </button>
            <button
              v-if="isAdmin(groupId)"
              @click="handleRemoveGroup(groupId)"
              class="button button-danger"
            >
              Delete Group
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Invite User Modal -->
    <div v-if="showInviteModal" class="modal-overlay" @click="showInviteModal = false">
      <div class="modal" @click.stop>
        <h3>Invite User to {{ store.groups[inviteGroupId]?.name }}</h3>
        <form @submit.prevent="handleSubmitInvite" class="form">
          <input v-model="inviteUsername" type="text" placeholder="Username (email)" required class="input" />
          <textarea v-model="inviteMessage" placeholder="Optional message" class="textarea" rows="3"></textarea>
          <div class="form-actions">
            <button type="submit" class="button button-primary">Send Invitation</button>
            <button type="button" @click="showInviteModal = false" class="button button-ghost">Cancel</button>
          </div>
        </form>
        <p v-if="inviteError" class="error">{{ inviteError }}</p>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useGroupsStore } from '@/stores/groups';
import { useSessionStore } from '@/stores/session';

const store = useGroupsStore();
const sessionStore = useSessionStore();

const isLoggedIn = computed(() => !!sessionStore.token);

function goLogin() {
  window.location.assign("/login");
}

const newGroupName = ref('');
const newGroupDescription = ref('');
const createError = ref('');

const showInviteModal = ref(false);
const inviteGroupId = ref('');
const inviteUsername = ref('');
const inviteMessage = ref('');
const inviteError = ref('');

const showMembers = ref<Record<string, boolean>>({});

function isAdmin(groupId: string): boolean {
  const membership = store.memberships.find(m => m.groupId === groupId);
  return membership?.isAdmin ?? false;
}

function getUsername(userId: string): string {
  const map = (store as any).usernames as Record<string, string> | undefined;
  if (!map) return userId;
  return map[userId] || userId;
}

function getAdminName(groupId: string): string {
  const group = store.groups[groupId];
  if (!group?.admin) return '';
  return getUsername(group.admin);
}

async function toggleMembers(groupId: string) {
  showMembers.value[groupId] = !showMembers.value[groupId];
  if (showMembers.value[groupId]) {
    await store.loadGroupMembers(groupId);
  }
}

async function handleCreateGroup() {
  if (!newGroupName.value.trim()) return;
  createError.value = '';
  try {
    await store.createGroup(newGroupName.value.trim(), newGroupDescription.value.trim());
    newGroupName.value = '';
    newGroupDescription.value = '';
  } catch (error: any) {
    createError.value = error.message || 'Failed to create group';
  }
}

async function handleRemoveGroup(groupId: string) {
  if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;
  try {
    await store.removeGroup(groupId);
  } catch (error: any) {
    alert(error.message || 'Failed to remove group');
  }
}

function handleInviteUser(groupId: string) {
  inviteGroupId.value = groupId;
  inviteUsername.value = '';
  inviteMessage.value = '';
  inviteError.value = '';
  showInviteModal.value = true;
}

async function handleSubmitInvite() {
  if (!inviteUsername.value.trim()) return;
  inviteError.value = '';
  try {
    await store.inviteUser(inviteGroupId.value, inviteUsername.value.trim(), inviteMessage.value.trim() || undefined);
    showInviteModal.value = false;
    inviteUsername.value = '';
    inviteMessage.value = '';
  } catch (error: any) {
    inviteError.value = error.message || 'Failed to send invitation';
  }
}

async function handleAcceptInvitation(invitationId: string) {
  try {
    await store.acceptInvitation(invitationId);
  } catch (error: any) {
    alert(error.message || 'Failed to accept invitation');
  }
}

async function handleRemoveInvitation(invitationId: string) {
  try {
    await store.removeInvitation(invitationId);
  } catch (error: any) {
    alert(error.message || 'Failed to remove invitation');
  }
}

async function handleLeaveGroup(groupId: string) {
  if (!confirm('Are you sure you want to leave this group?')) return;
  const membership = store.memberships.find(m => m.groupId === groupId);
  if (!membership) return;
  try {
    await store.leaveGroup(membership._id);
  } catch (error: any) {
    alert(error.message || 'Failed to leave group');
  }
}

async function handleRemoveMember(membershipId: string, username: string) {
  if (!confirm(`Remove ${username} from this group?`)) return;
  try {
    await store.leaveGroup(membershipId);
  } catch (error: any) {
    alert(error.message || 'Failed to remove member');
  }
}

onMounted(async () => {
  if (sessionStore.token) {
    await store.refresh();
  }
});
</script>

<style scoped>
.auth-guard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 400px;
  padding: 60px 20px;
}

.auth-message {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  font-family: var(--font-serif);
  text-align: center;
}

.sign-in-button {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 14px 32px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-in-button:hover {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}

.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.section {
  margin-bottom: 32px;
}

.section h3 {
  margin-bottom: 16px;
  font-size: 1.25rem;
  font-weight: 600;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input, .textarea {
  padding: 8px 12px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.button {
  padding: 8px 16px;
  border: 1px solid var(--border, #ddd);
  border-radius: 6px;
  background: #fff;
  color: var(--text, #333);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.button-primary {
  background: var(--brand, #0066cc);
  color: #fff;
  border-color: var(--brand, #0066cc);
}

.button-ghost {
  background: transparent;
  border-color: var(--border, #ddd);
}

.button-danger {
  background: #111827;
  color: #fff;
  border-color: #111827;
}

.button:hover {
  opacity: 0.9;
}

.cards {
  display: grid;
  gap: 16px;
}

.card {
  border: 1px solid var(--border, #ddd);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.card-content {
  flex: 1;
}

.card-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.description {
  margin: 8px 0;
  color: var(--text-secondary, #666);
  font-size: 14px;
}

.message {
  margin: 8px 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 14px;
  font-style: italic;
}

.meta {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: var(--brand, #0066cc);
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.members-panel {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border, #eee);
}

.members-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 4px;
}

.members-title {
  font-weight: 600;
  font-size: 13px;
}

.members-count {
  font-size: 12px;
  color: var(--text-secondary, #777);
}

.members-list {
  list-style: none;
  padding-left: 0;
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.member-main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-name {
  font-weight: 500;
}

.member-badge {
  padding: 2px 6px;
  border-radius: 999px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 600;
}

.member-role {
  font-size: 11px;
  color: var(--text-secondary, #777);
}

.member-remove {
  padding: 4px 10px;
  font-size: 12px;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-actions .button {
  white-space: nowrap;
  min-width: 100px;
}

.hint {
  color: var(--text-secondary, #999);
  font-style: italic;
  padding: 16px;
  text-align: center;
}

.error {
  color: #dc3545;
  font-size: 14px;
  margin-top: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin: 0 0 16px 0;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>

