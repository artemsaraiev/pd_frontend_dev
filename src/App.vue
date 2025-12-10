<template>
  <div class="app">
    <TopNav :backendOk="backendOk" @search="onSearch" />
    <div class="layout" :class="{ 'left-collapsed': leftCollapsed, 'no-left-sidebar': !showLeftSidebar, 'no-right-sidebar': !showRightSidebar }" :style="layoutStyles">
      <aside v-if="showLeftSidebar" class="sidebar-left" :class="{ collapsed: leftCollapsed }">
        <LeftNav
          :collapsed="leftCollapsed"
          @toggle-collapsed="leftCollapsed = !leftCollapsed"
        />
      </aside>
      <main class="content">
        <router-view />
      </main>
      <div v-if="showRightSidebar" class="divider" @mousedown="startDrag"></div>
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
import { useSessionStore } from "@/stores/session";

const route = useRoute();
const backendOk = ref(true);
const leftCollapsed = ref(false);
const session = useSessionStore();

// Resizable divider state
const rightSidebarWidth = ref(500); // Default width in pixels
const isDragging = ref(false);

// Check if user is logged in
const isLoggedIn = computed(() => !!session.token);

// Left sidebar nav was moved into the top bar, so we hide it
const showLeftSidebar = computed(() => false);

// Use the original right sidebar for the discussion panel on paper pages
const showRightSidebar = computed(() => {
  return route.name === 'paper' || route.name === 'annotate_test';
});

// Dynamic layout styles for resizable sidebar
const layoutStyles = computed(() => {
  if (!showRightSidebar.value) return {};
  return {
    '--right-sidebar-width': `${rightSidebarWidth.value}px`
  };
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

// Resizable divider handlers
function startDrag(e: MouseEvent) {
  e.preventDefault();
  isDragging.value = true;
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  
  const windowWidth = window.innerWidth;
  const newWidth = windowWidth - e.clientX - 20; // 20px for padding
  
  // Constrain width between 300px and 800px
  rightSidebarWidth.value = Math.max(300, Math.min(800, newWidth));
}

function stopDrag() {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
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
  grid-template-columns: 170px minmax(0, 1fr) 500px;
  gap: 10px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

.layout.left-collapsed {
  grid-template-columns: 52px minmax(0, 1fr) 500px;
}
.layout.no-left-sidebar {
  grid-template-columns: minmax(0, 1fr) 0px var(--right-sidebar-width, 500px);
  gap: 0;
}
.layout.no-right-sidebar {
  grid-template-columns: 170px minmax(0, 1fr);
}
.layout.no-left-sidebar.no-right-sidebar {
  grid-template-columns: minmax(0, 1fr);
}
.layout.left-collapsed.no-right-sidebar {
  grid-template-columns: 52px minmax(0, 1fr);
}
.divider {
  width: 8px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.divider:hover {
  background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1), transparent);
}
.divider::before {
  content: '';
  position: absolute;
  width: 2px;
  height: 40px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}
.divider:hover::before {
  opacity: 1;
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
  /* Allow the grid column to shrink even if PDF pages are very wide */
  min-width: 0;
  /* Keep scrolling inside the paper area, not the whole column */
  overflow-y: auto;
  overflow-x: hidden;
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
