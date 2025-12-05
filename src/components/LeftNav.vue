<template>
  <nav class="leftnav" :class="{ collapsed }">
    <button class="collapse-toggle" type="button" @click="onToggleCollapsed">
      <span v-if="collapsed">›</span>
      <span v-else>‹</span>
    </button>

    <div v-if="!collapsed" class="links">
      <router-link class="item" :class="{ active: at('/') }" to="/">Home</router-link>
      <router-link class="item" :class="{ active: at('/my') }" to="/my">My Papers</router-link>
      <router-link class="item" :class="{ active: at('/groups') }" to="/groups">Groups</router-link>
      <!-- Explore removed -->
    </div>

    <button
      v-if="isLoggedIn && !collapsed"
      class="profile-block"
      type="button"
      @click="goProfile"
    >
      <div class="avatar">
        <span>{{ initials }}</span>
      </div>
      <div class="profile-text">
        <div class="name">{{ displayName }}</div>
        <div class="hint">Profile &amp; identity</div>
      </div>
    </button>
    <button
      v-else-if="!collapsed"
      class="profile-block guest"
      type="button"
      @click="goLogin"
    >
      <div class="avatar">
        <span>?</span>
      </div>
      <div class="profile-text">
        <div class="name">Not signed in</div>
        <div class="hint">Sign in to manage profile</div>
      </div>
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-collapsed"): void;
}>();

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const collapsed = computed(() => !!props.collapsed);

function at(path: string) {
  return route.path === path;
}

const isLoggedIn = computed(() => !!session.token);
const displayName = computed(() => session.username || session.userId || "User");
const initials = computed(() => {
  const name = displayName.value.trim();
  if (!name) return "?";
  const parts = name.split("@")[0].split(/[.\s_]+/).filter(Boolean);
  if (!parts.length) return name[0]?.toUpperCase() ?? "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
});

function goProfile() {
  router.push({ name: "profile" });
}

function goLogin() {
  router.push({ name: "login" });
}

function onToggleCollapsed() {
  emit("toggle-collapsed");
}
</script>

<style scoped>
.leftnav {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
}

.leftnav.collapsed {
  align-items: center;
  gap: 8px;
}

.collapse-toggle {
  align-self: flex-end;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
}

.collapse-toggle:hover {
  background: #fef2f2;
  border-color: var(--brand);
  transform: translateY(-1px);
}

.links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

a {
  padding: 12px 16px;
  border-radius: 8px;
  color: var(--text);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  position: relative;
}

a:hover {
  background: #f9fafb;
  color: var(--brand);
}

a.active {
  background: linear-gradient(90deg, #fef2f2 0%, #ffffff 100%);
  color: var(--brand);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--brand);
}

.profile-block {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fafafa;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  width: 100%;
  text-align: left;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease;
}

.profile-block.guest {
  background: #fff;
}

.profile-block:hover {
  background: #f4f4f5;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: #111827;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  max-width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hint {
  font-size: 11px;
  color: var(--muted);
}
</style>

