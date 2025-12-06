<template>
  <div class="rs">
    <!-- Only show discussion panel when viewing a paper -->
    <div v-if="paperId" class="card">
      <DiscussionPanel :paperId="paperId" :anchorFilterProp="anchorFilter" />
    </div>
    <!-- Hide right sidebar content on non-paper pages -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { useRoute } from "vue-router";
import DiscussionPanel from "@/components/DiscussionPanel.vue";

const route = useRoute();
const paperId = ref<string | null>(null);
const anchorFilter = ref<string | null>(null);

function sync() {
  // Only show discussion panel on paper pages
  const isPaperPage = route.name === 'paper' || route.name === 'annotate_test';
  const id = (route.params as any)?.id as string | undefined;
  paperId.value = isPaperPage && id ? id : null;
}

function onAnchorCreated(e: Event) {
  const custom = e as CustomEvent<string>;
  if (custom.detail) {
    anchorFilter.value = custom.detail;
  }
}

onMounted(() => {
  sync();
  window.addEventListener("anchor-created", onAnchorCreated);
});
onBeforeUnmount(() => {
  window.removeEventListener("anchor-created", onAnchorCreated);
});
watch(() => route.fullPath, sync);
</script>

<style scoped>
.rs {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
h3 {
  margin: 0 0 12px 0;
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--brand);
}
.list {
  list-style: none;
  padding-left: 0;
  display: grid;
  gap: 8px;
}
small {
  color: var(--muted);
  font-style: italic;
}
</style>
