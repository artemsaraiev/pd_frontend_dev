<template>
  <div class="page">
    <!-- Sign-in prompt for non-authenticated users -->
    <div v-if="!isLoggedIn" class="auth-guard">
      <div class="auth-message">Sign in to view Saved Papers</div>
      <button class="sign-in-button" @click="goLogin">Sign in</button>
    </div>

    <!-- Main content for authenticated users -->
    <template v-else>
      <h2>Saved Library</h2>
      <div class="layout">
        <aside class="sidebar">
          <div class="sidebar-header">Tags</div>
          <div class="primary-filters">
            <button class="ghost full" @click="selectAll">
              <span :class="{ active: activeFilter === 'all' }">All saved</span>
            </button>
            <button class="ghost full" @click="selectUntagged">
              <span :class="{ active: activeFilter === 'untagged' }">
                Untagged
              </span>
            </button>
            <button class="ghost full" @click="selectDiscussed">
              <span :class="{ active: activeFilter === 'discussed' }">
                Discussed by you
              </span>
            </button>
          </div>
          <div class="tag-list">
            <div
              v-for="t in tags"
              :key="t.id"
              class="tag-row"
            >
              <button
                class="tag-toggle"
                type="button"
                @click="toggleTag(t.id)"
              >
                <span
                  class="tag-circle"
                  :class="{ active: selectedTagIds.includes(t.id) }"
                ></span>
                <span class="tag-label">{{ t.name }}</span>
              </button>
              <button
                class="tag-delete"
                title="Delete tag"
                @click.stop="deleteTag(t.id)"
              >
                ×
              </button>
            </div>
          </div>
          <form class="new-tag" @submit.prevent="createNewTag">
            <input
              v-model="newFolderName"
              type="text"
              placeholder="New tag"
            />
            <button class="primary small" type="submit">Add</button>
          </form>
        </aside>

        <div class="cards">
          <div v-for="p in papers" :key="p.paperId" class="card">
            <h3 class="title">
              <a :href="`/paper/${encodeURIComponent(p.paperId)}`">{{
                p.title || p.paperId
              }}</a>
            </h3>
            <div class="meta-row">
              <span
                v-for="tag in p.tags"
                :key="tag.id"
                class="meta-pill tag-pill"
              >
                <span class="tag-name">{{ tag.name }}</span>
                <button
                  class="tag-pill-delete"
                  title="Remove tag from this paper"
                  @click.stop="removeTagFromPaper(p.paperId, tag.id)"
                >
                  ×
                </button>
              </span>
            </div>
            <button
              class="add-tag-link"
              type="button"
              @click="openTagEditor(p.paperId)"
            >
              + Add tag
            </button>
            <div
              v-if="activeTagEditor === p.paperId"
              class="card-tag-editor"
            >
              <div class="tag-editor-list">
                <button
                  v-for="t in tags"
                  :key="t.id"
                  type="button"
                  class="tag-toggle"
                  @click="toggleEditorTag(t.id)"
                >
                  <span
                    class="tag-circle"
                    :class="{ active: editorSelectedTagIds.includes(t.id) }"
                  ></span>
                  <span class="tag-label">{{ t.name }}</span>
                </button>
              </div>
              <div class="tag-editor-actions">
                <button
                  class="ghost"
                  type="button"
                  @click="closeTagEditor"
                >
                  Cancel
                </button>
                <button
                  class="primary small"
                  type="button"
                  @click="applyTagsToPaper(p.paperId)"
                >
                  Save tags
                </button>
              </div>
            </div>
            <div class="card-footer">
              <a
                class="primary"
                :href="`/paper/${encodeURIComponent(p.paperId)}`"
                >View discussion</a
              >
              <button class="ghost" @click="remove(p.paperId)">Remove</button>
            </div>
          </div>
          <p v-if="!papers.length" class="hint">
            No saved papers in this folder.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { paper, discussion } from "@/api/endpoints";
import { useSessionStore } from "@/stores/session";
import {
  ensureLibrary,
  saveLibrary,
  listTags,
  listEntriesForTag,
  removePaper as removeFromLibrary,
  getTagsForPaper,
  deleteTag as deleteTagFromStore,
  assignPaperToTags,
  getDiscussedPaperIds,
  type LibraryTag,
  type LibraryData,
} from "@/utils/library";

interface UiPaper {
  paperId: string;
  title?: string;
  tags: { id: string; name: string }[];
  discussed: boolean;
}

const papers = ref<UiPaper[]>([]);
const store = useSessionStore();

const isLoggedIn = computed(() => !!store.token);

const selectedTagIds = ref<string[]>([]);
const activeFilter = ref<"all" | "untagged" | "tags" | "discussed">("all");
const newFolderName = ref("");

const library = ref<LibraryData | null>(null);
const tags = ref<LibraryTag[]>([]);
const activeTagEditor = ref<string | null>(null);
const editorSelectedTagIds = ref<string[]>([]);
const discussedPaperIds = ref<string[]>([]);

function goLogin() {
  window.location.assign("/login");
}

// Helpers to detect arXiv / bioRxiv IDs (mirroring HomeFeed)
function isArxivId(id: string): boolean {
  return /^\d{4}\.\d{4,5}(v\d+)?$/.test(id);
}

function isBiorxivId(id: string): boolean {
  if (id.startsWith("10.1101/")) return true;
  return /^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(id);
}

async function fetchArxivTitle(id: string): Promise<string | null> {
  try {
    const { papers: results } = await paper.searchArxiv({ q: id });
    const match = results.find(
      (r) => r.id === id || r.id.startsWith(id)
    );
    return match?.title || null;
  } catch {
    return null;
  }
}

async function fetchBiorxivTitle(idOrDoi: string): Promise<string | null> {
  try {
    const query = idOrDoi.startsWith("10.1101/")
      ? idOrDoi.slice("10.1101/".length)
      : idOrDoi;
    const { papers: results } = await paper.searchBiorxiv({ q: query });
    const match = results.find(
      (r) => r.id === query || r.doi === idOrDoi || r.doi === `10.1101/${query}`
    );
    return match?.title || null;
  } catch {
    return null;
  }
}

async function load() {
  if (!store.userId) {
    papers.value = [];
    library.value = null;
    tags.value = [];
    return;
  }

  const lib = ensureLibrary(store.userId);
  library.value = lib;
  tags.value = listTags(lib);

  let entries = lib.entries;
  const discussedSet = new Set(discussedPaperIds.value);

  if (activeFilter.value === "discussed") {
    entries = lib.entries.filter((e) => discussedSet.has(e.paperId));
  } else if (activeFilter.value === "untagged") {
    entries = lib.entries.filter((e) => !e.tagIds.length);
  } else if (selectedTagIds.value.length > 0) {
    entries = lib.entries.filter((e) =>
      e.tagIds.some((id) => selectedTagIds.value.includes(id))
    );
  }

  const uiPapers: UiPaper[] = [];

  await Promise.all(
    entries.map(async (entry) => {
      const id = entry.paperId;
      const result = await paper.get({ id });
      let title = result.title;

      if (!title) {
        if (isArxivId(result.paperId)) {
          title = await fetchArxivTitle(result.paperId);
        } else if (isBiorxivId(result.paperId)) {
          title = await fetchBiorxivTitle(result.paperId);
        }
        if (title) {
          paper.updateMeta({ id: result.paperId, title }).catch(() => {});
        }
      }

      const tagsForPaper = getTagsForPaper(lib, id);
      uiPapers.push({
        paperId: result.paperId,
        title,
        tags: tagsForPaper.map((t) => ({ id: t.id, name: t.name })),
        discussed: discussedSet.has(entry.paperId),
      });
    })
  );

  papers.value = uiPapers;
}

function remove(paperId: string) {
  if (!store.userId || !library.value) return;
  removeFromLibrary(library.value, paperId);
  saveLibrary(store.userId, library.value);
  load();
}

function selectAll() {
  activeFilter.value = "all";
  selectedTagIds.value = [];
  load();
}

function selectUntagged() {
  activeFilter.value = "untagged";
  selectedTagIds.value = [];
  load();
}

function toggleTag(id: string) {
  activeFilter.value = "tags";
  if (selectedTagIds.value.includes(id)) {
    selectedTagIds.value = selectedTagIds.value.filter((x) => x !== id);
  } else {
    selectedTagIds.value = [...selectedTagIds.value, id];
  }
  load();
}

function createNewTag() {
  const name = newFolderName.value.trim();
  if (!name || !store.userId) return;
  if (!library.value) {
    library.value = ensureLibrary(store.userId);
  }
  const lib = library.value;
  const newTag: LibraryTag = {
    id: crypto.randomUUID(),
    name,
    parentId: null,
  };
  lib.tags.push(newTag);
  saveLibrary(store.userId, lib);
  tags.value = listTags(lib);
  newFolderName.value = "";
}

function deleteTag(id: string) {
  if (!store.userId || !library.value) return;
  if (!confirm("Delete this tag from your library? Papers will stay saved, just without this tag.")) {
    return;
  }
  deleteTagFromStore(library.value, id);
  saveLibrary(store.userId, library.value);
  tags.value = listTags(library.value);
  selectedTagIds.value = selectedTagIds.value.filter((x) => x !== id);
  load();
}

function selectDiscussed() {
  activeFilter.value = "discussed";
  selectedTagIds.value = [];
  load();
}

async function loadDiscussed() {
  if (!store.userId) {
    discussedPaperIds.value = [];
    return;
  }
  // First, get locally-tracked discussed papers (reliable)
  const localIds = getDiscussedPaperIds(store.userId);
  
  // Also try to get from backend (may have older data)
  let backendIds: string[] = [];
  try {
    const { paperIds } = await discussion.listPapersDiscussedByUser({
      userId: store.userId,
    });
    backendIds = paperIds;
  } catch {
    // Ignore backend errors
  }
  
  // Merge both sources (deduplicate)
  discussedPaperIds.value = Array.from(new Set([...localIds, ...backendIds]));
}

function openTagEditor(paperId: string) {
  activeTagEditor.value = paperId;
  if (!library.value) return;
  const entry = library.value.entries.find((e) => e.paperId === paperId);
  editorSelectedTagIds.value = entry ? [...(entry.tagIds ?? [])] : [];
}

function closeTagEditor() {
  activeTagEditor.value = null;
  editorSelectedTagIds.value = [];
}

function toggleEditorTag(id: string) {
  const idx = editorSelectedTagIds.value.indexOf(id);
  if (idx === -1) {
    editorSelectedTagIds.value.push(id);
  } else {
    editorSelectedTagIds.value.splice(idx, 1);
  }
}

function applyTagsToPaper(paperId: string) {
  if (!store.userId || !library.value) return;
  assignPaperToTags(library.value, paperId, editorSelectedTagIds.value);
  saveLibrary(store.userId, library.value);
  activeTagEditor.value = null;
  editorSelectedTagIds.value = [];
  load();
}

function removeTagFromPaper(paperId: string, tagId: string) {
  if (!store.userId || !library.value) return;
  if (
    !confirm(
      "Remove this tag from this paper? The tag will remain for other papers.",
    )
  ) {
    return;
  }
  const entry = library.value.entries.find((e) => e.paperId === paperId);
  if (!entry || !entry.tagIds) return;
  entry.tagIds = entry.tagIds.filter((id) => id !== tagId);
  saveLibrary(store.userId, library.value);
  load();
}

onMounted(async () => {
  await loadDiscussed();
  await load();
});
watch(
  () => store.userId,
  async () => {
    await loadDiscussed();
    await load();
  },
);
</script>

<style scoped>
.auth-guard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 400px;
  padding: 60px 20px;
}

.auth-message {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  font-family: var(--font-serif);
  text-align: center;
}

.sign-in-button {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 14px 32px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-in-button:hover {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}

h2 {
  font-family: var(--font-serif);
  font-size: 32px;
  margin-bottom: 16px;
  color: var(--brand);
}

.layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
}

.sidebar {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-header {
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.primary-filters {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tag-row + .tag-row {
  margin-top: 4px;
}

.tag-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tag-delete {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
}

.tag-delete:hover {
  color: #dc2626;
}

.new-tag {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.new-tag input {
  flex: 1;
  border-radius: 6px;
  border: 1px solid var(--border);
  padding: 6px 8px;
  font-size: 13px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--brand), #d42e2e);
  opacity: 0;
  transition: opacity 0.3s ease;
}
.card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
  border-color: #d1d5db;
}
.card:hover::before {
  opacity: 1;
}
.title {
  font-family: var(--font-serif);
  margin: 0 0 8px 0;
  font-size: 18px;
  line-height: 1.4;
}
.title a {
  color: var(--text);
  text-decoration: none;
  transition: color 0.2s ease;
}
.title a:hover {
  color: var(--brand);
}
.ctas {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.primary {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 8px 16px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  display: inline-block;
}
.primary:hover {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}
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

.ghost.full {
  width: 100%;
  justify-content: flex-start;
}

.ghost span.active {
  font-weight: 600;
}

.primary.small {
  padding: 6px 12px;
  font-size: 13px;
}

.meta-row {
  margin-top: 4px;
  font-size: 12px;
  color: var(--muted);
}

.meta-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
}

.tag-pill {
  margin-right: 4px;
}

.tag-name {
  margin-right: 4px;
}

.tag-pill-delete {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
}

.tag-pill-delete:hover {
  color: #dc2626;
}

.add-tag-link {
  margin-top: 4px;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  color: var(--brand);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.add-tag-link:hover {
  text-decoration: underline;
}

.card-tag-editor {
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 8px 10px;
  background: #f9fafb;
  margin-top: 4px;
}

.tag-editor-list {
  max-height: 160px;
  overflow-y: auto;
}

.tag-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.tag-pill {
  margin-right: 4px;
}

.tag-name {
  margin-right: 4px;
}

.tag-pill-delete {
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 12px;
  padding: 0 2px;
}

.tag-pill-delete:hover {
  color: #dc2626;
}

.add-tag-link {
  margin-top: 4px;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  color: var(--brand);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.add-tag-link:hover {
  text-decoration: underline;
}

.card-tag-editor {
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 8px 10px;
  background: #f9fafb;
  margin-top: 4px;
}

.tag-editor-list {
  max-height: 160px;
  overflow-y: auto;
}

.tag-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.card-footer {
  display: flex;
  gap: 10px;
  margin-top: auto;
  padding-top: 16px;
  align-items: flex-start;
}

.tag-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 0;
}

.tag-circle {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.tag-circle.active {
  border-color: var(--brand);
  background: radial-gradient(circle, var(--brand) 40%, transparent 41%);
}

.tag-label {
  font-size: 13px;
  color: var(--text);
}
.hint {
  text-align: center;
  color: var(--muted);
  font-style: italic;
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: -1;
  }

  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
