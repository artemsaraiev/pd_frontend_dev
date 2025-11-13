<template>
  <ul class="replies">
    <ReplyNode
      v-for="node in nodes"
      :key="node._id"
      :node="node"
      :threadId="threadId"
      :depth="0"
      @replied="$emit('refresh')" />
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { discussion } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';
import ReplyNode from './ReplyNode.vue';

defineProps<{ nodes: any[]; threadId: string }>();
defineEmits<{ (e: 'refresh'): void }>();
</script>

<style scoped>
.replies { list-style: none; padding-left: 0; display: grid; gap: 6px; }
.reply { border-left: 2px solid var(--border); padding-left: 8px; }
.meta { font-size: 12px; color: #444; }
.body { margin: 4px 0 6px; }
.actions { display: flex; gap: 6px; }
.compose { display: grid; gap: 6px; margin: 6px 0; }
textarea { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; }
.small { padding: 4px 8px; font-size: 12px; }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--brand); border-radius: 6px; }
</style>


