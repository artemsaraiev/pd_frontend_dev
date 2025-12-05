<template>
  <div class="panel">
    <h3>Discussion</h3>
    <p class="hint" v-if="!paperId">Set a current paper first.</p>
    <div v-if="errorOpen" class="msg err">{{ errorOpen }}</div>

    <div class="row" v-if="!session.token">
      <label>Author</label>
      <input disabled placeholder="Sign in to post" />
    </div>
    <div class="compose-area">
      <div class="editor-toolbar">
        <button class="icon-btn" type="button" @click="formatThread('bold')"><strong>B</strong></button>
        <button class="icon-btn" type="button" @click="formatThread('italic')"><em>I</em></button>
        <button class="icon-btn" type="button" @click="formatThread('code')">{ }</button>
        <button class="icon-btn" type="button" @click="formatThread('blockquote')">""</button>
        <button class="icon-btn" type="button" @click="formatThread('olist')">1.</button>
        <button class="icon-btn" type="button" @click="formatThread('ulist')">•</button>
        <button class="icon-btn" type="button" @click="formatThread('inlineMath')">\(x\)</button>
        <button class="icon-btn" type="button" @click="formatThread('blockMath')">∑</button>
      </div>
      <div v-if="session.token" class="row">
        <label>Visibility</label>
        <div class="visibility-selector">
          <select v-model="threadVisibility" class="input">
            <option value="public">Public</option>
            <option v-for="groupId in groupsStore.myGroups" :key="groupId" :value="groupId">
              {{ groupsStore.groups[groupId]?.name || 'Loading...' }}
            </option>
          </select>
        </div>
      </div>
      <div v-if="attachments.length" class="attachments-preview">
        <div v-for="(url, i) in attachments" :key="url" class="attachment-thumb">
          <img :src="url" @click="openViewerFromAttachments(attachments, i)" />
          <button class="remove-btn" @click="removeAttachment(i, attachments)">×</button>
        </div>
      </div>
      <textarea
        ref="threadTextarea"
        v-model="body"
        rows="3"
        @paste="handlePaste($event, attachments)"
        placeholder="Start a discussion... (Paste images or click icon)"
      />
      <div class="toolbar">
         <button class="icon-btn" title="Add Image" @click="openThreadFilePicker">
           📷
         </button>
         <input
           ref="fileInput"
           type="file"
           accept="image/*"
           multiple
           style="display: none"
           @change="handleFileSelect($event, attachments)"
         />
      </div>
    </div>
    <div
      v-if="body || attachments.length"
      class="preview-container"
    >
      <div class="preview-label">Preview</div>
      <div
        class="preview-body"
        v-html="renderBodyPreview"
        @click="handleBodyClick"
      ></div>
    </div>
    <!-- Anchor is now implicit (set via Prompt); no manual field needed -->
    <button
      :disabled="busyThread || !pubId || (!body && !attachments.length) || !session.token"
      @click="onStartThread"
    >
      {{ !session.token ? 'Sign in to post' : (busyThread ? 'Posting…' : 'Start Thread') }}
    </button>
    <small v-if="busyThread">Loading…</small>
    <p v-if="threadMsg" class="msg ok">{{ threadMsg }}</p>
    <p v-if="errorThread" class="msg err">{{ errorThread }}</p>

    <h3>Threads</h3>
    <div v-if="!pubId && busyOpen" class="hint">Loading discussions…</div>
    <div v-if="!pubId && !busyOpen && errorOpen" class="hint">Failed to load discussions: {{ errorOpen }}</div>
    <div v-if="pubId">
      <div class="row">
        <label>Filter by anchor</label>
        <div class="filter">
          <input v-model.trim="anchorFilter" placeholder="anchorId (optional)" />
          <button class="ghost" v-if="anchorFilter" @click="anchorFilter = ''">Clear</button>
        </div>
      </div>
      <div v-if="session.token" class="row">
        <label>Visibility filter</label>
        <div class="filter">
          <select v-model="visibilityFilter" class="input">
            <option value="all">All threads</option>
            <option value="public">Public only</option>
            <option v-for="groupId in groupsStore.myGroups" :key="groupId" :value="groupId">
              {{ groupsStore.groups[groupId]?.name || 'Loading...' }}
            </option>
          </select>
        </div>
      </div>
      <div class="row">
        <label>Sort by</label>
        <div class="sort-dropdown-container">
          <button 
            class="sort-dropdown-btn" 
            @click="showSortDropdown = !showSortDropdown"
            :class="{ active: showSortDropdown }"
          >
            <span class="sort-label">{{ getSortLabel(threadSortBy) }}</span>
            <span class="sort-chevron">▼</span>
          </button>
          <div v-if="showSortDropdown" class="sort-dropdown-menu" @click.stop>
            <div 
              class="sort-option" 
              :class="{ selected: threadSortBy === 'createdAt' }"
              @click="setSort('createdAt'); showSortDropdown = false"
            >
              <span class="sort-icon">🕐</span>
              <span>Recent</span>
            </div>
            <div 
              class="sort-option" 
              :class="{ selected: threadSortBy === 'oldest' }"
              @click="setSort('oldest'); showSortDropdown = false"
            >
              <span class="sort-icon">📅</span>
              <span>Oldest</span>
            </div>
          </div>
        </div>
      </div>
      <ul class="threads" v-if="filteredThreads.length">
        <li 
          v-for="t in filteredThreads" 
          :key="t.id" 
          class="card"
          :class="{ 'highlighted-thread': highlightedAnchorId === t.anchorId }"
          :data-thread-id="t.id"
          @click="(e) => onThreadClick(e, t.anchorId)"
        >
          <div 
            class="collapse-toggle" 
            v-if="t.replies && t.replies.length" 
            @click.stop="toggleExpanded(t.id)"
          >
            <span class="toggle-icon">{{ expanded[t.id] === false ? '+' : '−' }}</span>
          </div>
          <div class="vote-section" @click.stop>
            <button 
              class="vote-btn upvote" 
              :class="{ active: threadVotes[t.id] === 1 }"
              @click="voteThread(t.id, 1)"
              :disabled="!session.token"
              title="Upvote"
            >▲</button>
            <span class="vote-count">{{ (t.upvotes ?? 0) - (t.downvotes ?? 0) }}</span>
            <button 
              class="vote-btn downvote" 
              :class="{ active: threadVotes[t.id] === -1 }"
              @click="voteThread(t.id, -1)"
              :disabled="!session.token"
              title="Downvote"
            >▼</button>
          </div>
          <div class="content-section">
          <div class="meta" @click.stop>
            <strong>{{ t.authorName || t.author }}</strong>
            <span class="count">{{ t.replies?.length ?? 0 }} replies</span>
            <a href="#" class="reply-link" @click.prevent="toggleReply(t.id)">Reply</a>
            <a
              v-if="session.userId === t.author && !t.deleted"
              href="#"
              class="delete-link"
              @click.prevent="deleteThread(t.id)"
            >
              Delete
            </a>
          </div>
          <div class="body" :class="{ deleted: t.deleted }" @click.stop>
            <div v-if="t.deleted" class="deleted-message">[deleted]</div>
            <div v-else v-html="renderBody(t.body)" @click="handleBodyClick"></div>
          </div>
          <div v-if="replyThreadId === t.id" class="compose-thread-reply" @click.stop>
            <div class="editor-toolbar">
              <button class="icon-btn" type="button" @click="formatReply('bold')"><strong>B</strong></button>
              <button class="icon-btn" type="button" @click="formatReply('italic')"><em>I</em></button>
              <button class="icon-btn" type="button" @click="formatReply('code')">{ }</button>
              <button class="icon-btn" type="button" @click="formatReply('blockquote')">“”</button>
              <button class="icon-btn" type="button" @click="formatReply('olist')">1.</button>
              <button class="icon-btn" type="button" @click="formatReply('ulist')">•</button>
              <button class="icon-btn" type="button" @click="formatReply('inlineMath')">\(x\)</button>
              <button class="icon-btn" type="button" @click="formatReply('blockMath')">∑</button>
            </div>
            <div v-if="replyAttachments.length" class="attachments-preview">
              <div v-for="(url, i) in replyAttachments" :key="url" class="attachment-thumb">
                <img :src="url" @click="openViewerFromAttachments(replyAttachments, i)" />
                <button class="remove-btn" @click="removeAttachment(i, replyAttachments)">×</button>
              </div>
            </div>
            <textarea
              v-model="replyBody"
              rows="2"
              placeholder="Reply to thread... (Paste images or click icon)"
              @paste="handlePaste($event, replyAttachments)"
            />
            <div v-if="replyBody || replyAttachments.length" class="preview-container">
              <div class="preview-label">Preview</div>
              <div class="preview-body" v-html="renderReplyPreview" @click="handleBodyClick"></div>
            </div>
            <div class="actions-row">
              <label class="icon-btn" title="Add Image">
                📷
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style="display: none"
                  @change="handleFileSelect($event, replyAttachments)"
                />
              </label>
              <button class="primary small" :disabled="(!replyBody && !replyAttachments.length) || !session.token || busyReply" @click="onReply">{{ !session.token ? 'Sign in' : (busyReply ? 'Sending…' : 'Reply') }}</button>
              <button class="ghost small" @click="replyThreadId = ''">Cancel</button>
            </div>
          </div>
          <p v-if="!t.replies || t.replies.length === 0" class="hint">No replies yet.</p>
          <ReplyTree 
            v-if="expanded[t.id] !== false" 
            :nodes="t.replies" 
            :threadId="t.id" 
            :highlightedAnchorId="highlightedAnchorId"
            :focusedReplyId="focusedReplyId"
            :paperId="props.paperId"
            @refresh="loadThreads"
            @replyClicked="onReplyClicked"
          />
          </div>
        </li>
      </ul>
      <p v-else-if="threads.length && anchorFilter">No threads match this filter.</p>
      <p v-else>No threads yet.</p>
    </div>
    <ImageViewer
      v-if="viewerImages.length"
      :images="viewerImages"
      :start-index="viewerIndex"
      @close="viewerImages = []"
    />
    <!-- Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="confirm-dialog-overlay" @click="showDeleteConfirm = false">
      <div class="confirm-dialog" @click.stop>
        <p>Delete this thread and its replies?</p>
        <div class="confirm-actions">
          <button class="ghost" @click="showDeleteConfirm = false">Cancel</button>
          <button class="primary delete" @click="confirmDeleteThread">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useSessionStore } from '@/stores/session';
import { useGroupsStore } from '@/stores/groups';
import { discussion, anchored } from '@/api/endpoints';
import { BASE_URL } from '@/api/client';
import ReplyTree from '@/components/ReplyTree.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import { renderMarkdown, buildBodyWithImages } from '@/utils/markdown';
import { getUsernameById, prefetchUsernames } from '@/utils/usernameCache';

const props = defineProps<{ paperId: string | null; anchorFilterProp?: string | null }>();

const emit = defineEmits<{
  (e: 'deletedAnchorsChanged', anchors: Set<string>): void;
}>();

const session = useSessionStore();
const groupsStore = useGroupsStore();
const pubId = ref<string | null>(null);
const pubOpened = ref(false);
const busyOpen = ref(false);
const errorOpen = ref('');
const pubMsg = ref('');

const author = ref(session.userId);
const body = ref('');
const anchorId = ref('');
const threadVisibility = ref<string>('public');
const visibilityFilter = ref<string>('all');
const busyThread = ref(false);
const errorThread = ref('');
const threadMsg = ref('');

const attachments = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const viewerImages = ref<string[]>([]);
const viewerIndex = ref(0);

const replyThreadId = ref('');
const replyBody = ref('');
const replyAttachments = ref<string[]>([]);
const replyAnchorId = ref('');
const busyReply = ref(false);
const errorReply = ref('');
const replyMsg = ref('');
const showDeleteConfirm = ref(false);
const pendingDeleteThreadId = ref<string | null>(null);

const actions = ref<string[]>([]);
type ReplyNode = { _id: string; author: string; authorName?: string; body: string; anchorId?: string; children?: ReplyNode[]; deleted?: boolean; upvotes?: number; downvotes?: number };
type Thread = { id: string; author: string; authorName?: string; body: string; anchorId?: string; replies: ReplyNode[]; deleted?: boolean; upvotes?: number; downvotes?: number };
const threads = ref<Thread[]>([]);
const anchorFilter = ref('');
const threadSortBy = ref<string>('createdAt'); // Default to 'createdAt' for "New"
const showSortDropdown = ref(false);
const expanded = ref<Record<string, boolean>>({});
const threadVotes = ref<Record<string, 1 | -1 | null>>({});
const highlightedAnchorId = ref<string | null>(null);
const focusedReplyId = ref<string | null>(null);
const pendingAnchors = ref<Record<string, { ref: string; snippet?: string; color?: string; parentContext?: string | null }>>({});
function threadHasAnchor(t: Thread, anchorId: string): boolean {
  if (t.anchorId === anchorId) return true;
  function walk(nodes: ReplyNode[]) {
    for (const n of nodes) {
      if (n.anchorId === anchorId) return true;
      if (n.children && n.children.length && walk(n.children)) return true;
    }
    return false;
  }
  return walk(t.replies || []);
}

async function ensureAnchor(anchorId?: string): Promise<string | undefined> {
  if (!anchorId || !anchorId.startsWith('temp-')) return anchorId;
  const pending = pendingAnchors.value[anchorId];
  if (!pending) return anchorId;
  if (!props.paperId || !session.token) return anchorId; // cannot persist; leave temp
  try {
    const res = await anchored.create({
      paperId: props.paperId,
      kind: 'Lines',
      ref: pending.ref,
      snippet: pending.snippet,
      color: pending.color,
      parentContext: pending.parentContext ?? undefined,
      session: session.token,
    });
    const newAnchor = res.anchorId;
    delete pendingAnchors.value[anchorId];
    try {
      window.dispatchEvent(new CustomEvent('replace-temp-anchor', { detail: { tempId: anchorId, newId: newAnchor } }));
    } catch {
      // ignore
    }
    return newAnchor;
  } catch (e) {
    console.error('Failed to persist anchor', e);
    return anchorId;
  }
}

const filteredThreads = computed(() => {
  let filtered = (props.anchorFilterProp ?? anchorFilter.value)
    ? threads.value.filter(t => t.anchorId === (props.anchorFilterProp ?? anchorFilter.value))
    : threads.value;
  
  // If an anchor is highlighted, move matching thread (thread anchor or any reply anchor) to top
  if (highlightedAnchorId.value) {
    const highlighted = filtered.find(t => threadHasAnchor(t, highlightedAnchorId.value!));
    if (highlighted) {
      filtered = [highlighted, ...filtered.filter(t => t.id !== highlighted.id)];
    }
  }
  
  // Sort threads
  if (threadSortBy.value === 'oldest') {
    // Oldest: oldest first (ascending createdAt)
    filtered = [...filtered].sort((a, b) => a.createdAt - b.createdAt);
  } else {
    // Recent: most recent first (descending createdAt)
    filtered = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
  }
  
  // Re-apply highlighted thread to top after sorting
  if (highlightedAnchorId.value) {
    const highlighted = filtered.find(t => threadHasAnchor(t, highlightedAnchorId.value!));
    if (highlighted) {
      filtered = [highlighted, ...filtered.filter(t => t.id !== highlighted.id)];
    }
  }
  
  return filtered;
});

function getSortLabel(sortBy: string): string {
  switch (sortBy) {
    case 'oldest': return 'Oldest';
    case 'createdAt': return 'Recent';
    default: return 'Recent';
  }
}

function setSort(sortBy: string) {
  threadSortBy.value = sortBy;
}

const deletedAnchors = computed(() => {
  const deleted = new Set<string>();

  // Helper to recursively collect anchorIds from replies that are themselves deleted
  function collectReplyAnchors(replies: ReplyNode[]) {
    for (const r of replies) {
      // Only gray out highlights for replies that are explicitly deleted
      if (r.deleted && r.anchorId) {
        deleted.add(r.anchorId);
      }
      if (r.children && r.children.length > 0) {
        collectReplyAnchors(r.children);
      }
    }
  }

  for (const t of threads.value) {
    // Gray out the thread's own anchor when the thread is deleted
    if (t.deleted && t.anchorId) {
      deleted.add(t.anchorId);
    }
    // Independently track any replies that were deleted (even if the parent thread is not)
    if (t.replies && t.replies.length > 0) {
      collectReplyAnchors(t.replies);
    }
  }

  return deleted;
});

const threadTextarea = ref<HTMLTextAreaElement | null>(null);
const replyTextarea = ref<HTMLTextAreaElement | null>(null);

const renderBodyPreview = computed(() =>
  renderMarkdown(buildBodyWithImages(body.value, attachments.value)),
);

const renderReplyPreview = computed(() =>
  renderMarkdown(buildBodyWithImages(replyBody.value, replyAttachments.value)),
);

function renderBody(text: string) {
  return renderMarkdown(text);
}

async function handleUpload(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.url || null;
  } catch (err) {
    console.error('Image upload failed', err);
    return null;
  }
}

async function handlePaste(e: ClipboardEvent, list: string[]) {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile();
      if (!blob) continue;
      const url = await handleUpload(blob);
      if (url) list.push(url);
    }
  }
}

async function handleFileSelect(e: Event, list: string[]) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  
  for (const file of input.files) {
    const url = await handleUpload(file);
    if (url) list.push(url);
  }
  input.value = ''; // Reset
}

function removeAttachment(index: number, list: string[]) {
  list.splice(index, 1);
}

function openThreadFilePicker() {
  fileInput.value?.click();
}

function toggleExpanded(id: string) {
  const current = expanded.value[id];
  // Default state is expanded (undefined => true). Toggle between true/false.
  expanded.value = { ...expanded.value, [id]: current === false };
}

async function loadThreads() {
  if (!pubId.value) { threads.value = []; return; }
  const activeFilter = (props.anchorFilterProp ?? anchorFilter.value) || undefined;
  // Use loose typing here to avoid TS friction; backend supports includeDeleted, session, and groupFilter.
  // Pass session for access control filtering on the backend
  // Always send session (even empty string) so the session-based sync matches
  // The backend will handle invalid/empty sessions by returning only public threads
  // Pass groupFilter to filter by visibility (all, public, or specific groupId)
  const { threads: list } = await (discussion as any).listThreads({ 
    pubId: pubId.value, 
    anchorId: activeFilter, 
    includeDeleted: true,
    session: session.token || '',
    groupFilter: visibilityFilter.value || 'all',
    sortBy: threadSortBy.value || 'createdAt',
  });
  console.log('[DiscussionPanel] Loaded threads raw:', JSON.stringify(list, null, 2));
  console.log('[DiscussionPanel] Current user ID:', session.userId);
  const built: Thread[] = [];

  // Collect all unique author IDs for prefetching
  const authorIds = new Set<string>();
  for (const t of list) {
    authorIds.add(t.author);
    const replies = (await (discussion as any).listRepliesTree({ threadId: t._id, includeDeleted: true })).replies as any[];
    function collectAuthors(nodes: any[]) {
      for (const node of nodes) {
        authorIds.add(node.author);
        if (node.children) collectAuthors(node.children);
      }
    }
    collectAuthors(replies);
  }

  // Prefetch all usernames
  await prefetchUsernames(Array.from(authorIds));

  // Build threads with usernames (already prefetched, so getUsernameById will return from cache)
  for (const t of list) {
    // Prefer the tree API; fall back to flat list if tree is empty for any reason.
    const treeResponse = await (discussion as any).listRepliesTree({ threadId: t._id, includeDeleted: true });
    console.log('[DiscussionPanel] listRepliesTree response for thread', t._id, ':', JSON.stringify(treeResponse, null, 2));
    let nodes: any[] = treeResponse.replies as any[];
    if (!nodes || nodes.length === 0) {
      const flat = await (discussion as any).listReplies({ threadId: t._id, includeDeleted: true });
      nodes = await Promise.all(flat.replies.map(async (r: any) => ({
        _id: r._id,
        author: r.author,
        authorName: await getUsernameById(r.author),
        body: r.body,
        anchorId: r.anchorId,
        children: [] as any[],
        deleted: r.deleted ?? false
      })));
    } else {
      // Add authorName to tree nodes recursively
      async function addAuthorNames(nodes: any[]) {
        for (const node of nodes) {
          node.authorName = await getUsernameById(node.author);
          if (node.children) await addAuthorNames(node.children);
        }
      }
      await addAuthorNames(nodes);
    }
    const authorName = await getUsernameById(t.author);
    built.push({ 
      id: t._id, 
      author: t.author, 
      authorName, 
      body: t.body, 
      anchorId: t.anchorId, 
      replies: nodes as any, 
      deleted: t.deleted,
      upvotes: t.upvotes ?? 0,
      downvotes: t.downvotes ?? 0,
    });
  }
  threads.value = built;
  // Note: expanded state is preserved across reloads (not reset)
  // Emit deleted anchors for highlight styling
  console.log('[DiscussionPanel] deletedAnchors:', Array.from(deletedAnchors.value));
  emit('deletedAnchorsChanged', deletedAnchors.value);
  // Also broadcast a global snapshot so PdfAnnotator (in a different
  // part of the layout) can gray out any associated highlights.
  try {
    console.log('[DiscussionPanel] dispatching anchor-deleted-visual-snapshot', Array.from(deletedAnchors.value));
    window.dispatchEvent(
      new CustomEvent('anchor-deleted-visual-snapshot', {
        detail: Array.from(deletedAnchors.value),
      }),
    );
  } catch {
    // ignore
  }
}

watch(deletedAnchors, () => {
  emit('deletedAnchorsChanged', deletedAnchors.value);
  try {
    window.dispatchEvent(
      new CustomEvent('anchor-deleted-visual-snapshot', {
        detail: Array.from(deletedAnchors.value),
      }),
    );
  } catch {
    // ignore
  }
}, { deep: true });

async function ensurePub() {
  if (!props.paperId) return;
  busyOpen.value = true;
  errorOpen.value = '';
  try {
    // Try to get existing pub first
    const { pubId: maybe } = await discussion.getPubIdByPaper({ paperId: props.paperId });
    if (maybe) {
      pubId.value = maybe;
      pubOpened.value = true;
      await loadThreads();
    } else {
      // Create if doesn't exist
      const res = await discussion.open({ paperId: props.paperId, session: session.token || undefined });
      pubId.value = res.pubId;
      pubOpened.value = true;
      await loadThreads();
    }
  } catch (e: any) {
     try {
      const { pubId: maybe } = await discussion.getPubIdByPaper({ paperId: props.paperId });
      if (maybe) {
        pubId.value = maybe;
        pubOpened.value = true;
        await loadThreads();
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

watch(() => props.paperId, () => {
  pubId.value = null;
  pubMsg.value = '';
  pubOpened.value = false;
  ensurePub();
}, { immediate: true });

// Reload when filter changes and pub is present
watch(
  () => [props.anchorFilterProp, anchorFilter.value, visibilityFilter.value, threadSortBy.value],
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
    const finalBody = buildBodyWithImages(body.value, attachments.value);
    const anchorToUse = await ensureAnchor(anchorId.value);

    const res = await discussion.startThread({
      pubId: pubId.value,
      author: session.userId || 'anonymous',
      body: finalBody,
      anchorId: anchorToUse || undefined,
      groupId: threadVisibility.value !== 'public' ? threadVisibility.value : undefined,
      session: session.token || undefined,
    });
    threadMsg.value = `Thread created${anchorId.value ? ` (anchor: ${anchorId.value})` : ''}`;
    actions.value.unshift(`Thread created${anchorId.value ? ` (anchor: ${anchorId.value})` : ''}`);
    body.value = '';
    attachments.value = [];
    anchorId.value = '';
    // Clear parent anchor in PdfAnnotator so new prompts start fresh
    try {
      window.dispatchEvent(new Event('clear-parent-anchor'));
    } catch {
      // ignore
    }
    
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
    const finalBody = buildBodyWithImages(replyBody.value, replyAttachments.value);
    const anchorToUse = await ensureAnchor(replyAnchorId.value);

    // Use reply (not replyTo) for top-level replies to threads
    const res = await discussion.reply({ 
      threadId: replyThreadId.value, 
      author: session.userId || 'anonymous', 
      body: finalBody,
      anchorId: anchorToUse || undefined,
      session: session.token || undefined 
    });
    replyMsg.value = `Reply created (id: ${res.replyId})`;
    actions.value.unshift(`Reply ${res.replyId} added to ${replyThreadId.value}`);
    replyBody.value = '';
    replyAttachments.value = [];
    replyAnchorId.value = '';
    replyThreadId.value = ''; // Close box after sending
    await loadThreads();
  } catch (e: any) {
    errorReply.value = e?.message ?? String(e);
  } finally {
    busyReply.value = false;
  }
}

function handleBodyClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'IMG' && target.classList.contains('post-image')) {
    const container = target.closest('.body');
    if (!container) return;
    const imgs = Array.from(
      container.querySelectorAll<HTMLImageElement>('img.post-image'),
    );
    viewerImages.value = imgs.map((img) => img.src);
    const idx = imgs.findIndex((img) => img === target);
    viewerIndex.value = idx >= 0 ? idx : 0;
  }
}

function openViewerFromAttachments(list: string[], idx: number) {
  if (!list.length) return;
  viewerImages.value = [...list];
  viewerIndex.value = idx;
}

type FormatKind = 'bold' | 'italic' | 'code' | 'blockquote' | 'olist' | 'ulist' | 'inlineMath' | 'blockMath';

function surroundSelection(
  el: HTMLTextAreaElement | null,
  model: { value: string },
  left: string,
  right: string = left,
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const text = model.value ?? '';
  const before = text.slice(0, start);
  const sel = text.slice(start, end);
  const after = text.slice(end);
  model.value = before + left + sel + right + after;
  nextTick(() => {
    const cursorStart = start + left.length;
    const cursorEnd = cursorStart + sel.length;
    el.focus();
    el.selectionStart = cursorStart;
    el.selectionEnd = cursorEnd;
  });
}

function formatBlock(
  el: HTMLTextAreaElement | null,
  model: { value: string },
  prefix: string,
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const text = model.value ?? '';
  const before = text.slice(0, start);
  const sel = text.slice(start, end) || '';
  const after = text.slice(end);
  const lines = sel.split('\n');
  const formatted = lines.map((l, idx) => (l ? `${prefix}${l}` : idx === 0 ? `${prefix}` : l)).join('\n');
  model.value = before + formatted + after;
  nextTick(() => {
    el.focus();
  });
}

function applyFormat(kind: FormatKind, el: HTMLTextAreaElement | null, model: { value: string }) {
  switch (kind) {
    case 'bold':
      surroundSelection(el, model, '**');
      break;
    case 'italic':
      surroundSelection(el, model, '_');
      break;
    case 'code':
      surroundSelection(el, model, '`');
      break;
    case 'inlineMath':
      surroundSelection(el, model, '$');
      break;
    case 'blockMath':
      surroundSelection(el, model, '$$\n', '\n$$');
      break;
    case 'blockquote':
      formatBlock(el, model, '> ');
      break;
    case 'olist':
      formatBlock(el, model, '1. ');
      break;
    case 'ulist':
      formatBlock(el, model, '- ');
      break;
  }
}

function formatThread(kind: FormatKind) {
  applyFormat(kind, threadTextarea.value, body);
}

function formatReply(kind: FormatKind) {
  applyFormat(kind, replyTextarea.value, replyBody);
}

function toggleReply(tid: string) {
  if (replyThreadId.value === tid) {
    replyThreadId.value = '';
    replyAnchorId.value = '';
  } else {
    replyThreadId.value = tid;
    replyBody.value = '';
    replyAnchorId.value = '';
  }
}

function focusAnchor(aid?: string) {
  if (!aid) return;
  try {
    window.dispatchEvent(new CustomEvent('anchor-focus', { detail: aid }));
  } catch {
    // ignore
  }
}

function deleteThread(threadId: string) {
  if (!pubId.value || !session.token) return;
  pendingDeleteThreadId.value = threadId;
  showDeleteConfirm.value = true;
}

async function confirmDeleteThread() {
  if (!pendingDeleteThreadId.value || !pubId.value || !session.token) {
    showDeleteConfirm.value = false;
    pendingDeleteThreadId.value = null;
    return;
  }
  
  const threadId = pendingDeleteThreadId.value;
  showDeleteConfirm.value = false;
  pendingDeleteThreadId.value = null;
  
  try {
    // Remember the anchor for visual highlight updates
    const t = threads.value.find((th) => th.id === threadId);
    const aid = t?.anchorId;
    console.log('[DiscussionPanel] deleteThread found anchorId:', aid, 'for thread:', threadId);

    await discussion.deleteThread({ threadId, session: session.token });

    // Notify PDF annotator so it can stripe the associated highlight
    if (aid) {
      try {
        console.log('[DiscussionPanel] dispatching immediate anchor-deleted-visual for', aid);
        window.dispatchEvent(
          new CustomEvent('anchor-deleted-visual', { detail: aid }),
        );
      } catch {
        // ignore
      }
    }

    await loadThreads();
  } catch (e: any) {
    alert(e?.message ?? 'Failed to delete thread');
  }
}

function onTextSelected(e: Event) {
  const custom = e as CustomEvent<string>;
  const text = custom.detail;
  if (!text) return;
  // Legacy quote-to-textarea behavior disabled; we just ignore the
  // text-selected event now to avoid auto-inserting text.
}

function onStartThreadWithHighlight(e: Event) {
  const custom = e as CustomEvent<{ anchorId: string; text: string; isChild?: boolean; ref?: string; color?: string; parentContext?: string | null }>;
  const { anchorId: aid, text, isChild, ref, color, parentContext } = custom.detail;
  if (aid && ref) {
    pendingAnchors.value[aid] = {
      ref,
      snippet: text?.slice(0, 300),
      color,
      parentContext: parentContext ?? null,
    };
  }
  
  // If a reply box is open, set the anchorId for the reply instead of thread
  if (replyThreadId.value) {
    replyAnchorId.value = aid;
    console.log('[DiscussionPanel] Set reply anchor:', aid);
    // Focus the reply textarea
    setTimeout(() => {
      const el = document.querySelector('.compose-thread-reply textarea') as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return;
  }
  
  // Otherwise, handle for thread creation
  // If this is the first prompt OR it's a child of the current anchor, 
  // track it appropriately
  if (!anchorId.value) {
    // First prompt becomes the parent anchor
    anchorId.value = aid;
    console.log('[DiscussionPanel] Set parent anchor:', aid);
  } else if (isChild) {
    // This is a child highlight nested under the parent - just log it
    console.log('[DiscussionPanel] Added child anchor:', aid, 'under parent:', anchorId.value);
  } else {
    // New independent prompt - this replaces the parent
    anchorId.value = aid;
    console.log('[DiscussionPanel] Replaced parent anchor:', aid);
  }
  
  // Broadcast current parent anchor so PdfAnnotator knows where to nest new prompts
  try {
    window.dispatchEvent(
      new CustomEvent('current-parent-anchor', { detail: anchorId.value }),
    );
  } catch {
    // ignore
  }
  
  // Do not prefill the body with quoted text anymore; just focus the box.
  setTimeout(() => {
    const el = document.querySelector('.panel textarea[rows="3"]') as HTMLTextAreaElement | null;
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

function onRequestDeletedAnchorsStatus() {
  // Reply with current state
  try {
    console.log('[DiscussionPanel] Replying to status request with', Array.from(deletedAnchors.value));
    window.dispatchEvent(
      new CustomEvent('anchor-deleted-visual-snapshot', {
        detail: Array.from(deletedAnchors.value),
      }),
    );
  } catch {
    // ignore
  }
}

function onThreadClick(e: MouseEvent, anchorId?: string) {
  // Don't trigger if clicking on buttons, links, or interactive elements
  const target = e.target as HTMLElement;
  if (target.closest('button') || target.closest('a') || target.closest('.vote-section') || target.closest('.compose-thread-reply')) {
    return;
  }
  
  if (!anchorId) return;
  highlightedAnchorId.value = anchorId;
  // Dispatch event to highlight PDF anchors and update panel state
  try {
    window.dispatchEvent(
      new CustomEvent('highlight-pdf-anchors', { detail: anchorId })
    );
    window.dispatchEvent(
      new CustomEvent('anchor-highlight-clicked', { detail: anchorId })
    );
  } catch {
    // ignore
  }
}

function onReplyClicked(payload: { anchorId?: string; replyId: string; threadId: string }) {
  const { anchorId, replyId, threadId } = payload;

  console.log('[DiscussionPanel] onReplyClicked received:', payload);

  // Always focus this specific reply in the UI
  focusedReplyId.value = replyId;

  // Find the thread and the reply path within it so we can walk ancestors
  const thread = threads.value.find(t => t.id === threadId);
  if (!thread) {
    console.log('[DiscussionPanel] Thread not found:', threadId);
    return;
  }
  console.log('[DiscussionPanel] Found thread:', thread.id, 'thread.anchorId:', thread.anchorId);

  type ReplyNode = Thread['replies'][number];

  function findPath(nodes: ReplyNode[], targetId: string, path: ReplyNode[] = []): ReplyNode[] | null {
    for (const n of nodes) {
      const nextPath = [...path, n];
      if (n._id === targetId) return nextPath;
      if (n.children && n.children.length) {
        const found = findPath(n.children as ReplyNode[], targetId, nextPath);
        if (found) return found;
      }
    }
    return null;
  }

  let effectiveAnchor = anchorId;

  if (!effectiveAnchor) {
    const path = findPath(thread.replies || [], replyId) || [];
    // Walk ancestors from closest parent upward to find the first with an anchor
    for (let i = path.length - 2; i >= 0 && !effectiveAnchor; i--) {
      const ancestor = path[i];
      if (ancestor.anchorId) {
        effectiveAnchor = ancestor.anchorId;
      }
    }
    // If still none, fall back to the thread's anchor
    if (!effectiveAnchor && thread.anchorId) {
      effectiveAnchor = thread.anchorId;
    }
  }

  console.log('[DiscussionPanel] effectiveAnchor determined:', effectiveAnchor, 'from payload.anchorId:', anchorId);

  if (effectiveAnchor) {
    highlightedAnchorId.value = effectiveAnchor;
    // Ensure thread is expanded so the focused reply is visible
    expanded.value = { ...expanded.value, [threadId]: true };
    // Tell the PDF to highlight this anchor
    console.log('[DiscussionPanel] Dispatching highlight-pdf-anchors event with:', effectiveAnchor);
    try {
      window.dispatchEvent(
        new CustomEvent('highlight-pdf-anchors', { detail: effectiveAnchor })
      );
    } catch {
      // ignore
    }
  } else {
    console.log('[DiscussionPanel] No effectiveAnchor found, not highlighting');
  }
}

function onAnchorHighlightClicked(e: Event) {
  const custom = e as CustomEvent<string>;
  const anchorId = custom.detail;
  highlightedAnchorId.value = anchorId;
  // Scroll to the thread/reply if it exists (thread anchor or any reply anchor)
  nextTick(() => {
    const thread = threads.value.find(t => threadHasAnchor(t, anchorId));
    if (!thread) return;

    // Try to find the most specific reply node for this anchor
    function findReplyByAnchor(nodes: ReplyNode[]): ReplyNode | null {
      for (const n of nodes) {
        if (n.anchorId === anchorId) return n;
        if (n.children && n.children.length) {
          const found = findReplyByAnchor(n.children as ReplyNode[]);
          if (found) return found;
        }
      }
      return null;
    }
    const reply = findReplyByAnchor(thread.replies || []);
    focusedReplyId.value = reply?._id ?? null;

    // Always expand the thread so its replies are visible when a box is clicked
    expanded.value = { ...expanded.value, [thread.id]: true };

    // Prefer scrolling directly to the specific reply (if this is a reply anchor)
    const replyEl = document.querySelector(
      `[data-reply-anchor-id="${anchorId}"]`,
    );
    if (replyEl) {
      replyEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Fallback: scroll to the thread card itself
    const element = document.querySelector(
      `[data-thread-id="${thread.id}"]`,
    );
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

function onReplySelected(e: Event) {
  const custom = e as CustomEvent<string>;
  focusedReplyId.value = custom.detail || null;
}

function onAnchorHighlightCleared() {
  highlightedAnchorId.value = null;
}

async function voteThread(threadId: string, vote: 1 | -1) {
  if (!session.token || !session.userId) return;
  try {
    const result = await discussion.voteThread({
      threadId,
      userId: session.userId,
      vote,
      session: session.token,
    });
    if (result.ok) {
      threadVotes.value[threadId] = result.userVote;
      // Update vote counts immediately without full reload
      const thread = threads.value.find(t => t.id === threadId);
      if (thread) {
        thread.upvotes = result.upvotes;
        thread.downvotes = result.downvotes;
      }
    }
  } catch (e: any) {
    console.error('Failed to vote:', e);
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.sort-dropdown-container')) {
    showSortDropdown.value = false;
  }
  // Clear highlights when clicking outside discussion panel
  if (!target.closest('.panel') && !target.closest('.pdf-annotator')) {
    highlightedAnchorId.value = null;
    try {
      window.dispatchEvent(new CustomEvent('anchor-highlight-cleared'));
    } catch {
      // ignore
    }
  }
}

onMounted(async () => {
  window.addEventListener('text-selected', onTextSelected);
  window.addEventListener('start-thread-with-highlight', onStartThreadWithHighlight);
  window.addEventListener('request-deleted-anchors-status', onRequestDeletedAnchorsStatus);
  window.addEventListener('anchor-highlight-clicked', onAnchorHighlightClicked);
  window.addEventListener('anchor-highlight-cleared', onAnchorHighlightCleared);
  document.addEventListener('click', handleClickOutside);
  
  // Load groups if user is logged in
  if (session.token) {
    await groupsStore.loadMyGroups();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('text-selected', onTextSelected);
  window.removeEventListener('start-thread-with-highlight', onStartThreadWithHighlight);
  window.removeEventListener('request-deleted-anchors-status', onRequestDeletedAnchorsStatus);
  window.removeEventListener('anchor-highlight-clicked', onAnchorHighlightClicked);
  window.removeEventListener('anchor-highlight-cleared', onAnchorHighlightCleared);
  window.removeEventListener('reply-selected', onReplySelected);
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 12px; }
.row { display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: center; }
.filter { display: grid; grid-template-columns: 1fr auto; gap: 6px; }
input, textarea {
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  transition: all 0.2s ease;
  font-size: 14px;
}
input:hover, textarea:hover { border-color: #d1d5db; }
input:focus, textarea:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}
button {
  padding: 8px 16px;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  background: var(--brand);
  color: white;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
button:hover:not(:disabled) {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}
button:disabled { opacity: 0.5; cursor: not-allowed; }
.hint {
  color: var(--muted);
  font-style: italic;
  padding: 12px;
  text-align: center;
}
.msg { font-size: 13px; margin: 0; padding: 8px 12px; border-radius: 6px; }
.ok { color: var(--ok); background: #e7f7ee; }
.err { color: var(--error); background: #fde8e8; }
.recent ul { margin: 0; padding-left: 16px; }
.threads { list-style: none; padding-left: 0; display: grid; gap: 12px; }
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  display: flex;
  gap: 12px;
}
.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #d1d5db;
}
.highlighted-thread {
  background: linear-gradient(135deg, #fef2f2 0%, #fff 50%);
  border-color: var(--brand);
  border-width: 2px;
  box-shadow: 0 4px 16px rgba(179, 27, 27, 0.2);
  transform: translateY(-2px);
  transition: all 0.3s ease;
}
.vote-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 40px;
  padding-top: 4px;
}
.collapse-toggle {
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
  font-size: 14px;
  color: #999;
  cursor: pointer;
  user-select: none;
  margin-right: 4px;
}
.toggle-icon {
  display: inline-block;
  width: 14px;
  text-align: center;
}
.vote-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #888;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  line-height: 1;
}
.vote-btn:hover:not(:disabled) {
  background: #f5f5f5;
}
.vote-btn.upvote:hover:not(:disabled) {
  color: #ff4500;
}
.vote-btn.downvote:hover:not(:disabled) {
  color: #7193ff;
}
.vote-btn.active.upvote {
  color: #ff4500;
}
.vote-btn.active.downvote {
  color: #7193ff;
}
.vote-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vote-count {
  font-weight: 600;
  font-size: 14px;
  color: var(--text);
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.content-section {
  flex: 1;
}
.meta { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.reply-link { margin-left: auto; font-size: 13px; color: var(--brand); font-weight: 500; }
.reply-link:hover { color: #9a1717; }
.delete-link { font-size: 13px; color: var(--error); font-weight: 500; }
.delete-link:hover { color: #c82333; }
.toggle-link { font-size: 13px; color: var(--brand); font-weight: 500; }
.toggle-link:hover { color: #9a1717; }
.compose-thread-reply { margin: 12px 0; display: grid; gap: 8px; }
.actions-row { display: flex; gap: 8px; }
.small { padding: 6px 12px; font-size: 13px; }
.anchor {
  background: #fef2f2;
  border: 1px solid var(--brand);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand);
  cursor: pointer;
  transition: all 0.2s ease;
}
.anchor:hover {
  background: var(--brand);
  color: white;
}
.count {
  font-size: 12px;
  color: var(--muted);
  font-weight: 500;
}
.body { margin: 10px 0; line-height: 1.6; }
.body.deleted { opacity: 0.6; font-style: italic; }
.deleted-message { color: #888; font-size: 13px; }
/* Deep selector because v-html renders dynamic content */
.body :deep(.post-image) {
  display: inline-block;
  width: calc(50% - 6px);
  margin: 3px;
  border-radius: 6px;
  cursor: zoom-in;
  max-height: 220px;
  object-fit: cover;
}
.replies { padding-left: 16px; }

.ghost {
  background: #fff;
  color: var(--brand);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
.ghost:hover {
  border-color: var(--brand);
  background: #fef2f2;
}
.primary {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
.primary:hover:not(:disabled) {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}
.compose-area {
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 4px;
  background: #fff;
  transition: border-color 0.2s ease;
}
.compose-area:focus-within {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}
.compose-area textarea {
  border: none;
  width: 100%;
  resize: vertical;
  padding: 8px;
  outline: none;
}
.editor-toolbar {
  border-bottom: 1px solid var(--border);
  padding: 8px 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}
.toolbar {
  border-top: 1px solid var(--border);
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 6px 8px;
  border-radius: 6px;
  color: #666;
  transition: all 0.15s ease;
  font-weight: 500;
}
.icon-btn:hover {
  background: #fef2f2;
  color: var(--brand);
}
.attachments-preview {
  display: flex;
  gap: 10px;
  padding: 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  background: #fafafa;
}
.attachment-thumb {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}
.attachment-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
  border: 1.5px solid var(--border);
  transition: all 0.2s ease;
}
.attachment-thumb img:hover {
  border-color: var(--brand);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--error, #dc3545);
  color: white;
  border: 2px solid white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
.remove-btn:hover {
  background: #c82333;
  transform: scale(1.1);
}
.preview-container {
  margin: 12px 0;
  border: 1.5px dashed var(--border);
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
  transition: all 0.2s ease;
}
.preview-container:hover {
  border-color: var(--brand);
  background: #fef2f2;
}
.preview-label {
  font-size: 11px;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--brand);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.preview-body {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
}

.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.confirm-dialog {
  background: white;
  border-radius: 12px;
  padding: 28px;
  max-width: 420px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.confirm-dialog p {
  margin: 0 0 24px 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-actions button {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  border: 1.5px solid;
  transition: all 0.2s ease;
}

.confirm-actions .delete {
  background: var(--error, #dc3545);
  color: white;
  border-color: var(--error, #dc3545);
}

.confirm-actions .delete:hover {
  background: #c82333;
  border-color: #c82333;
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  transform: translateY(-1px);
}

.sort-dropdown-container {
  position: relative;
}

.sort-dropdown-btn {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 140px;
  justify-content: space-between;
}

.sort-dropdown-btn:hover {
  border-color: var(--brand);
  background: #fef2f2;
}

.sort-dropdown-btn.active {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}

.sort-label {
  flex: 1;
  text-align: left;
}

.sort-chevron {
  font-size: 10px;
  transition: transform 0.2s ease;
  color: var(--muted);
}

.sort-dropdown-btn.active .sort-chevron {
  transform: rotate(180deg);
}

.sort-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  overflow: hidden;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.15s ease;
  font-size: 14px;
}

.sort-option:hover {
  background: #fef2f2;
}

.sort-option.selected {
  background: #fef2f2;
  color: var(--brand);
  font-weight: 600;
}

.sort-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

</style>

 