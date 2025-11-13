<template>
  <div class="panel">
    <h3>Anchors ({{ anchors.length }})</h3>
    <p v-if="!paperId" class="hint">Set a current paper first.</p>
    <ul v-else class="list">
      <li v-for="a in anchors" :key="a._id">
        <button class="chip" @click="$emit('filter-by-anchor', a._id)">
          {{ a.kind }} · {{ a.ref }}
        </button>
        <span class="snip">{{ a.snippet }}</span>
      </li>
    </ul>
    <p v-if="err" class="msg err">{{ err }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { anchored, type AnchorKind } from '@/api/endpoints';

const props = defineProps<{ paperId: string | null }>();
defineEmits<{ (e: 'filter-by-anchor', anchorId: string): void }>();

const anchors = ref<{ _id: string; kind: AnchorKind; ref: string; snippet: string }[]>([]);
const err = ref('');

watchEffect(async () => {
  err.value = '';
  anchors.value = [];
  if (!props.paperId) return;
  try {
    const { anchors: list } = await anchored.listByPaper({ paperId: props.paperId });
    anchors.value = list;
  } catch (e: any) {
    err.value = e?.message ?? String(e);
  }
});
</script>

<style scoped>
.list { padding-left: 0; list-style: none; display: grid; gap: 6px; }
.chip { padding: 2px 8px; border: 1px solid var(--border); border-radius: 999px; background: var(--chip-bg); }
.snip { margin-left: 8px; color: #555; font-size: 12px; }
.msg.err { color: var(--error); font-size: 12px; }
</style>


