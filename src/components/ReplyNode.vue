<template>
  <li class="reply" :style="{ marginLeft: (depth * 16) + 'px' }">
    <div class="meta"><strong>{{ node.author }}</strong></div>
    <p class="body">{{ node.body }}</p>
    <div class="actions">
      <button class="ghost small" @click="replying = !replying">Reply</button>
    </div>
    <div v-if="replying" class="compose">
      <textarea v-model.trim="body" rows="2" placeholder="Reply..." />
      <button class="primary small" :disabled="!body || !sessionStore.token || sending" @click="send">{{ !sessionStore.token ? 'Sign in to reply' : (sending ? 'Sending…' : 'Reply') }}</button>
    </div>
    <ul class="children" v-if="node.children && node.children.length">
      <ReplyNode
        v-for="child in node.children"
        :key="child._id"
        :node="child"
        :threadId="threadId"
        :depth="depth + 1"
        @replied="$emit('replied')" />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { discussion } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{
  node: any;
  threadId: string;
  depth: number;
}>();

const emit = defineEmits<{ (e: 'replied'): void }>();

const replying = ref(false);
const body = ref('');
const sending = ref(false);
const sessionStore = useSessionStore();

async function send() {
  if (!body.value || sending.value) return; // Prevent double-submit
  sending.value = true;
  try {
    await discussion.replyTo({
      threadId: props.threadId,
      parentId: props.node._id,
      author: sessionStore.userId || 'anonymous',
      body: body.value,
      session: sessionStore.token || undefined,
    });
    body.value = '';
    replying.value = false;
    emit('replied');
  } finally {
    sending.value = false;
  }
}

function onTextSelected(e: Event) {
  const custom = e as CustomEvent<string>;
  const text = custom.detail;
  if (!text) return;
  
  // Find the focused textarea
  const active = document.activeElement as HTMLTextAreaElement | null;
  if (active && active.tagName === 'TEXTAREA') {
    // Insert at cursor position
    const start = active.selectionStart || 0;
    const end = active.selectionEnd || 0;
    const current = active.value;
    const before = current.substring(0, start);
    const after = current.substring(end);
    const quote = `> ${text}\n\n`;
    active.value = before + quote + after;
    active.selectionStart = active.selectionEnd = start + quote.length;
    active.focus();
    // Trigger Vue reactivity
    active.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

onMounted(() => {
  window.addEventListener('text-selected', onTextSelected);
});

onBeforeUnmount(() => {
  window.removeEventListener('text-selected', onTextSelected);
});
</script>

<style scoped>
.reply { border-left: 2px solid var(--border); padding-left: 8px; }
.meta { font-size: 12px; color: #444; }
.body { margin: 4px 0 6px; }
.actions { display: flex; gap: 6px; }
.compose { display: grid; gap: 6px; margin: 6px 0; }
textarea { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; }
.small { padding: 4px 8px; font-size: 12px; }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--brand); border-radius: 6px; }
.children { list-style: none; padding-left: 0; display: grid; gap: 6px; margin-top: 6px; }
</style>

