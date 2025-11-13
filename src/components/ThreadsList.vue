<template>
  <div class="panel">
    <div class="row">
      <label>Filter by anchor</label>
      <input v-model.trim="anchorFilter" placeholder="anchorId (optional)" />
      <button @click="refresh" :disabled="loading">{{ loading ? 'Loading…' : 'Reload' }}</button>
    </div>
    <ul class="threads" v-if="threads.length">
      <li v-for="t in threads" :key="t._id" class="card">
        <div class="meta">
          <strong>{{ t.author }}</strong>
          <span v-if="t.anchorId" class="anchor">#{{ t.anchorId }}</span>
          <small>{{ new Date(t.createdAt).toLocaleString() }}</small>
        </div>
        <p class="body">{{ t.body }}</p>
        <details>
          <summary>Replies ({{ replies[t._id]?.length ?? 0 }})</summary>
          <ul class="replies">
            <li v-for="r in replies[t._id] ?? []" :key="r._id">
              <strong>{{ r.author }}</strong> — {{ r.body }} <small>{{ new Date(r.createdAt).toLocaleString() }}</small>
            </li>
          </ul>
          <div class="reply-box">
            <input v-model.trim="replyDraft[t._id]" placeholder="Write a reply…" />
            <button @click="sendReply(t._id)" :disabled="!replyDraft[t._id] || sending[t._id]">
              {{ sending[t._id] ? 'Sending…' : 'Reply' }}
            </button>
          </div>
        </details>
      </li>
    </ul>
    <p v-if="err" class="msg err">{{ err }}</p>
    <p v-if="!threads.length && !loading" class="hint">No threads yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { discussion } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';

const props = defineProps<{ paperId: string | null }>();
const session = useSessionStore();

const pubId = ref<string | null>(null);
const anchorFilter = ref('');
const threads = ref<Array<{ _id: string; author: string; body: string; anchorId?: string; createdAt: number }>>([]);
const replies = ref<Record<string, Array<{ _id: string; author: string; body: string; createdAt: number }>>>({});
const replyDraft = ref<Record<string, string>>({});
const sending = ref<Record<string, boolean>>({});
const loading = ref(false);
const err = ref('');

async function loadPubId() {
  pubId.value = null;
  if (!props.paperId) return;
  const { pubId: maybe } = await discussion.getPubIdByPaper({ paperId: props.paperId });
  pubId.value = maybe;
}

async function loadThreads() {
  if (!pubId.value) { threads.value = []; return; }
  const { threads: list } = await discussion.listThreads({ pubId: pubId.value, anchorId: anchorFilter.value || undefined });
  threads.value = list;
  const all: Record<string, any[]> = {};
  for (const t of list) {
    const { replies: rs } = await discussion.listReplies({ threadId: t._id });
    all[t._id] = rs;
  }
  replies.value = all;
}

async function refresh() {
  err.value = '';
  loading.value = true;
  try {
    await loadPubId();
    await loadThreads();
  } catch (e: any) {
    err.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

async function sendReply(threadId: string) {
  if (!replyDraft.value[threadId]) return;
  sending.value[threadId] = true;
  try {
    const res = await discussion.reply({ threadId, author: session.userId, body: replyDraft.value[threadId] });
    replies.value[threadId] = (replies.value[threadId] ?? []).concat([{ _id: res.replyId, author: session.userId, body: replyDraft.value[threadId], createdAt: Date.now() }]);
    replyDraft.value[threadId] = '';
  } catch (e) {
  } finally {
    sending.value[threadId] = false;
  }
}

watchEffect(refresh);
</script>

<style scoped>
.row { display: grid; grid-template-columns: 160px 1fr auto; gap: 8px; align-items: center; margin-bottom: 8px; }
.threads { list-style: none; padding-left: 0; display: grid; gap: 8px; }
.card { border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
.meta { display: flex; gap: 8px; align-items: baseline; }
.anchor { background: var(--chip-bg); border: 1px solid var(--border); border-radius: 999px; padding: 0 6px; font-size: 12px; }
.body { margin: 6px 0; }
.replies { padding-left: 16px; }
.reply-box { display: grid; grid-template-columns: 1fr auto; gap: 6px; margin-top: 6px; }
.msg.err { color: var(--error); font-size: 12px; }
</style>


