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
      <router-link class="item" :class="{ active: at('/profile') }" to="/profile">Profile</router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle-collapsed"): void;
}>();

const route = useRoute();

const collapsed = computed(() => !!props.collapsed);

function at(path: string) {
  return route.path === path;
}

function onToggleCollapsed() {
  emit("toggle-collapsed");
}
</script>

<style scoped>
.leftnav {
  display: flex;
  flex-direction: column;
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
</style>

