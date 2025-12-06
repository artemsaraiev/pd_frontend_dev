<template>
  <div class="app">
    <TopNav :backendOk="backendOk" @search="onSearch" />
    <div class="layout" :class="{ 'left-collapsed': leftCollapsed, 'no-right-sidebar': !showRightSidebar }">
      <aside class="sidebar-left" :class="{ collapsed: leftCollapsed }">
        <LeftNav
          :collapsed="leftCollapsed"
          @toggle-collapsed="leftCollapsed = !leftCollapsed"
        />
      </aside>
      <main class="content">
        <router-view />
      </main>
      <aside v-if="showRightSidebar" class="sidebar-right">
        <RightSidebar />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { post } from "./api/client";
import TopNav from "@/components/TopNav.vue";
import LeftNav from "@/components/LeftNav.vue";
import RightSidebar from "@/components/RightSidebar.vue";

const route = useRoute();
const backendOk = ref(true);
const leftCollapsed = ref(false);

// Only show right sidebar on paper pages
const showRightSidebar = computed(() => {
  return route.name === 'paper' || route.name === 'annotate_test';
});

onMounted(async () => {
  try {
    await post<{ ok: boolean }>(`/health`, {});
    backendOk.value = true;
  } catch {
    backendOk.value = false;
  }
});

function onSearch(q: string) {
  if (!q) return;
  // heuristics: treat as id/doi
  window.location.assign(`/paper/${encodeURIComponent(q)}`);
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f9fafb;
}
.layout {
  display: grid;
  grid-template-columns: 170px 1fr 500px;
  gap: 10px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

.layout.left-collapsed {
  grid-template-columns: 52px 1fr 500px;
}
.layout.no-right-sidebar {
  grid-template-columns: 170px 1fr;
}
.layout.left-collapsed.no-right-sidebar {
  grid-template-columns: 52px 1fr;
}
.sidebar-left {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  overflow-wrap: break-word;
  word-wrap: break-word;
  min-width: 0;
}
.sidebar-left.collapsed {
  padding: 12px 8px;
}
.sidebar-right {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  overflow: auto;
}
@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 240px 1fr;
    gap: 16px;
  }
  .sidebar-right {
    display: none;
  }
}
@media (max-width: 780px) {
  .layout {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .sidebar-left {
    display: none;
  }
}
</style>
