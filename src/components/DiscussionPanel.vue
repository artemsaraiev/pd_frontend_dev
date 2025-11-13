<template>
  <div class="panel">
    <h3>Open Discussion</h3>
    <p class="hint" v-if="!paperId">Set a current paper first.</p>
    <div class="row">
      <label>Paper</label>
      <input :value="paperId ?? ''" disabled />
    </div>
    <button :disabled="busyOpen || !paperId || pubOpened || !session.token" @click="onOpenPub">{{ !session.token ? 'Sign in to open' : (pubOpened ? 'Pub opened' : (busyOpen ? 'Opening…' : 'Open Pub')) }}</button>
    <small v-if="busyOpen">Loading…</small>
    <p v-if="pubMsg" class="msg ok">{{ pubMsg }}</p>
    <p v-if="errorOpen" class="msg err">{{ errorOpen }}</p>

    <h3>Start a thread</h3>
    <div class="row" v-if="!session.token">
      <label>Author</label>
      <input disabled placeholder="Sign in to post" />
    </div>
    <div class="row">
      <label>Topic</label>
      <textarea v-model.trim="body" rows="3" />
    </div>
    <div class="row">
      <label>Anchor Id</label>
      <input v-model.trim="anchorId" placeholder="optional" />
    </div>
    <button :disabled="busyThread || !pubId || !body || !session.token" @click="onStartThread">{{ !session.token ? 'Sign in to post' : (busyThread ? 'Posting…' : 'Start Thread') }}</button>
    <small v-if="busyThread">Loading…</small>
    <p v-if="threadMsg" class="msg ok">{{ threadMsg }}</p>
    <p v-if="errorThread" class="msg err">{{ errorThread }}</p>

    <h3>Quick reply</h3>
    <div class="row">
      <label>Thread Id</label>
      <input v-model.trim="replyThreadId" />
    </div>
    <div class="row">
      <label>Reply Body</label>
      <textarea v-model.trim="replyBody" rows="2" />
    </div>
    <button :disabled="busyReply || !replyThreadId || !replyBody || !session.token" @click="onReply">{{ !session.token ? 'Sign in to reply' : (busyReply ? 'Replying…' : 'Reply') }}</button>
    <small v-if="busyReply">Loading…</small>
    <p v-if="replyMsg" class="msg ok">{{ replyMsg }}</p>
    <p v-if="errorReply" class="msg err">{{ errorReply }}</p>

    <h3>Threads</h3>
    <div v-if="!pubId" class="hint">Open the pub for this paper to view threads.</div>
    <div v-else>
      <div class="row">
        <label>Filter by anchor</label>
        <div class="filter">
          <input v-model.trim="anchorFilter" placeholder="anchorId (optional)" />
          <button class="ghost" v-if="anchorFilter" @click="anchorFilter = ''">Clear</button>
        </div>
      </div>
      <ul class="threads" v-if="filteredThreads.length">
        <li v-for="t in filteredThreads" :key="t.id" class="card">
          <div class="meta">
            <strong>{{ t.author }}</strong>
            <span v-if="t.anchorId" class="anchor">#{{ t.anchorId }}</span>
            <span class="count">{{ t.replies?.length ?? 0 }} replies</span>
            <a
              v-if="t.replies && t.replies.length"
              href="#"
              class="toggle-link"
              @click.prevent="toggleExpanded(t.id)"
            >{{ expanded[t.id] ? 'Hide replies' : 'View replies' }}</a>
            <a href="#" class="reply-link" @click.prevent="replyTo(t.id)">Reply</a>
          </div>
          <p class="body">{{ t.body }}</p>
          <p v-if="!t.replies || t.replies.length === 0" class="hint">No replies yet.</p>
          <ReplyTree v-if="expanded[t.id]" :nodes="t.replies" :threadId="t.id" @refresh="loadThreads" />
        </li>
      </ul>
      <p v-else-if="threads.length && anchorFilter">No threads match this filter.</p>
      <p v-else>No threads yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue';
import { useSessionStore } from '@/stores/session';
import { discussion } from '@/api/endpoints';
import ReplyTree from '@/components/ReplyTree.vue';

const props = defineProps<{ paperId: string | null; anchorFilterProp?: string | null }>();

const session = useSessionStore();
const pubId = ref<string | null>(null);
const pubOpened = ref(false);
const busyOpen = ref(false);
const errorOpen = ref('');
const pubMsg = ref('');

const author = ref(session.userId);
const body = ref('');
const anchorId = ref('');
const busyThread = ref(false);
const errorThread = ref('');
const threadMsg = ref('');

const replyThreadId = ref('');
const replyBody = ref('');
const quickReplyBox = ref<HTMLElement | null>(null);
const busyReply = ref(false);
const errorReply = ref('');
const replyMsg = ref('');

const actions = ref<string[]>([]);
type ReplyNode = { _id: string; author: string; body: string; children?: ReplyNode[] };
type Thread = { id: string; author: string; body: string; anchorId?: string; replies: ReplyNode[] };
const threads = ref<Thread[]>([]);
const anchorFilter = ref('');
const expanded = ref<Record<string, boolean>>({});
const filteredThreads = computed(() =>
  (props.anchorFilterProp ?? anchorFilter.value)
    ? threads.value.filter(t => t.anchorId === (props.anchorFilterProp ?? anchorFilter.value))
    : threads.value
);

function toggleExpanded(id: string) {
  expanded.value = { ...expanded.value, [id]: !expanded.value[id] };
}

async function loadThreads() {
  if (!pubId.value) { threads.value = []; return; }
  const activeFilter = (props.anchorFilterProp ?? anchorFilter.value) || undefined;
  const { threads: list } = await discussion.listThreads({ pubId: pubId.value, anchorId: activeFilter });
  const built: Thread[] = [];
  for (const t of list) {
    // Prefer the tree API; fall back to flat list if tree is empty for any reason.
    let nodes: any[] = (await discussion.listRepliesTree({ threadId: t._id })).replies as any[];
    if (!nodes || nodes.length === 0) {
      const flat = await discussion.listReplies({ threadId: t._id });
      nodes = flat.replies.map(r => ({ _id: r._id, author: r.author, body: r.body, children: [] as any[] }));
    }
    built.push({ id: t._id, author: t.author, body: t.body, anchorId: t.anchorId, replies: nodes as any });
  }
  threads.value = built;
  // Note: expanded state is preserved across reloads (not reset)
}

watch(() => props.paperId, () => { pubId.value = null; pubMsg.value=''; pubOpened.value = false; });

// Resolve existing pub and load threads on enter / change
watch(
  () => props.paperId,
  async (pid) => {
    threads.value = [];
    if (!pid) return;
    try {
      const { pubId: maybe } = await discussion.getPubIdByPaper({ paperId: pid });
      if (maybe) {
        pubId.value = maybe;
        pubOpened.value = true;
        await loadThreads();
      }
    } catch { /* ignore */ }
  },
  { immediate: true }
);

// Reload when filter changes and pub is present
watch(
  () => [props.anchorFilterProp, anchorFilter.value, pubId.value],
  async () => { if (pubId.value) await loadThreads(); }
);

async function onOpenPub() {
  if (!props.paperId) return;
  busyOpen.value = true; errorOpen.value=''; pubMsg.value='';
  try {
    const res = await discussion.open({ paperId: props.paperId, session: session.token || undefined });
    pubId.value = res.pubId;
    pubMsg.value = `Pub opened (pubId: ${res.pubId})`;
    pubOpened.value = true;
    actions.value.unshift(`Pub ${res.pubId} opened for paper ${props.paperId}`);
  } catch (e: any) {
    // If already opened or any 400, try to resolve pub id and continue
    try {
      const { pubId: maybe } = await discussion.getPubIdByPaper({ paperId: props.paperId });
      if (maybe) {
        pubId.value = maybe;
        pubOpened.value = true;
        pubMsg.value = `Pub already exists (pubId: ${maybe})`;
        errorOpen.value = '';
      } else {
        errorOpen.value = e?.message ?? String(e);
      }
    } catch {
      errorOpen.value = e?.message ?? String(e);
    }
  } finally {
    busyOpen.value = false;
  }
}

async function onStartThread() {
  if (!pubId.value || busyThread.value) return; // Prevent double-submit
  busyThread.value = true; errorThread.value=''; threadMsg.value='';
  try {
    const res = await discussion.startThread({ pubId: pubId.value, author: session.userId || 'anonymous', body: body.value, anchorId: anchorId.value || undefined, session: session.token || undefined });
    threadMsg.value = `Thread created (id: ${res.threadId})`;
    actions.value.unshift(`Thread ${res.threadId} created${anchorId.value ? ` (anchor: ${anchorId.value})` : ''}`);
    body.value = '';
    anchorId.value = '';
    replyThreadId.value = res.threadId;
    await loadThreads();
  } catch (e: any) {
    errorThread.value = e?.message ?? String(e);
  } finally {
    busyThread.value = false;
  }
}

async function onReply() {
  if (busyReply.value) return; // Prevent double-submit
  busyReply.value = true; errorReply.value=''; replyMsg.value='';
  try {
    // Use reply (not replyTo) for top-level replies to threads
    const res = await discussion.reply({ threadId: replyThreadId.value, author: session.userId || 'anonymous', body: replyBody.value, session: session.token || undefined });
    replyMsg.value = `Reply created (id: ${res.replyId})`;
    actions.value.unshift(`Reply ${res.replyId} added to ${replyThreadId.value}`);
    replyBody.value = '';
    await loadThreads();
  } catch (e: any) {
    errorReply.value = e?.message ?? String(e);
  } finally {
    busyReply.value = false;
  }
}

function replyTo(tid: string) {
  replyThreadId.value = tid;
  // Focus Quick reply textarea and scroll it into view
  const el = document.querySelector('.panel textarea[rows="2"]') as HTMLTextAreaElement | null;
  el?.focus();
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function onTextSelected(e: Event) {
  const custom = e as CustomEvent<string>;
  const text = custom.detail;
  if (!text) return;
  
  // Find the focused textarea or the quick reply textarea
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
  } else {
    // Fall back to quick reply body
    replyBody.value = `> ${text}\n\n` + replyBody.value;
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
.panel { display: flex; flex-direction: column; gap: 8px; }
.row { display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: center; }
.filter { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
input, textarea { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; }
button { padding: 6px 10px; border: 1px solid var(--brand); border-radius: 6px; background: var(--brand); color: white; }
button:disabled { opacity: 0.6; }
.msg { font-size: 12px; margin: 0; }
.ok { color: var(--ok); }
.err { color: var(--error); }
.recent ul { margin: 0; padding-left: 16px; }
.threads { list-style: none; padding-left: 0; display: grid; gap: 8px; }
.card { border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
.meta { display: flex; gap: 8px; align-items: baseline; }
.reply-link { margin-left: auto; font-size: 12px; }
.toggle-link { font-size: 12px; }
.anchor { background: var(--chip-bg); border: 1px solid var(--border); border-radius: 999px; padding: 0 6px; font-size: 12px; }
.body { margin: 6px 0; }
.replies { padding-left: 16px; }
</style>

 