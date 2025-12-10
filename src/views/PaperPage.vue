<template>
  <div class="paper">
    <header class="card header">
      <div class="title-row">
        <h2 class="title">{{ header.title || externalPaperId }}</h2>
        <div class="actions">
          <a
            class="ghost"
            :href="externalAbsLink"
            target="_blank"
            rel="noreferrer"
            >Open on {{ sourceName }}</a
          >
          <div class="save-wrapper">
            <button class="ghost" @click.stop="toggleFolderPicker">
              <span v-if="isAlreadyInLibrary">In Library</span>
              <span v-else>Save to Library</span>
            </button>
            <div v-if="folderPickerOpen" class="folder-picker" @click.stop>
              <div class="folder-picker-header">Add tags</div>
              <div class="folder-picker-body">
                <div
                  v-if="allTags.length"
                  class="folder-picker-list"
                >
                  <button
                    v-for="tag in allTags"
                    :key="tag.id"
                    type="button"
                    class="tag-toggle"
                    @click="toggleFolderSelection(tag.id)"
                  >
                    <span
                      class="tag-circle"
                      :class="{ active: selectedFolderIds.includes(tag.id) }"
                    ></span>
                    <span class="tag-label">{{ tag.name }}</span>
                  </button>
                </div>
                <p v-else class="folder-empty">
                  No tags yet. Save without a tag or create one below.
                </p>
                <form class="new-tag-inline" @submit.prevent="createInlineTag">
                  <input
                    v-model="inlineTagName"
                    type="text"
                    placeholder="New tag name"
                  />
                  <button class="primary small" type="submit">Add</button>
                </form>
              </div>
              <button class="primary full-width" @click="saveToLibrary">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="meta">
        <span v-if="header.doi"
          ><a :href="header.link" target="_blank" rel="noreferrer">{{
            header.doi
          }}</a></span
        >
        <span v-if="header.authors"> · {{ header.authors }}</span>
        <span v-if="currentFolderNames.length" class="in-library-pill">
          · Tags: {{ currentFolderNames.join(", ") }}
        </span>
      </div>
      <p v-if="banner" class="banner">{{ banner }}</p>
      <div v-if="showSuccessNotice" class="success-notice">
        Saved to library!
      </div>
      <div v-if="showErrorNotice" class="error-notice">Already in library!</div>
    </header>

    <div class="paper-content">
        <!-- bioRxiv: Try proxy first, fallback to upload if proxy fails -->
        <div
          v-if="paperSource === 'biorxiv' && !localPdfUrl && pdfLoadError"
          class="upload-prompt card"
        >
          <div class="upload-icon">📄</div>
          <h3>PDF Not Available</h3>
          <p class="error-message">
            Unable to load PDF automatically. You can upload your own copy:
          </p>
          <ol class="upload-steps">
            <li>
              <a
                :href="externalPdfLink"
                target="_blank"
                rel="noreferrer"
                class="download-link"
              >
                Download PDF from bioRxiv
              </a>
            </li>
            <li>Upload it here to view with shared annotations</li>
          </ol>
          <label class="upload-btn primary">
            Choose PDF File
            <input
              type="file"
              accept=".pdf,application/pdf"
              @change="onPdfUpload"
              hidden
            />
          </label>
          <p class="privacy-note">Your PDF stays on your device only</p>
          <div class="discussion-hint">
            <p v-if="discussionCount > 0">
              <strong>{{ discussionCount }}</strong> discussion{{
                discussionCount === 1 ? "" : "s"
              }}
              available in the sidebar
            </p>
            <p v-else>
              <a :href="externalAbsLink" target="_blank" rel="noreferrer"
                >View abstract on bioRxiv</a
              >
            </p>
          </div>
        </div>
        <!-- bioRxiv with uploaded PDF (manual fallback) -->
        <div
          v-else-if="paperSource === 'biorxiv' && localPdfUrl"
          class="pdf-scroll"
          @wheel="onPdfWheel"
        >
          <div class="toolbar">
            <div class="colors">
              <button
                v-for="color in colors"
                :key="color.value"
                :style="{ backgroundColor: color.value }"
                :class="[
                  'color-btn',
                  { active: selectedColor === color.value },
                ]"
                @click="selectedColor = color.value"
              ></button>
            </div>
            <div class="toolbar-right">
              <button
                class="ghost remove-pdf"
                @click="removePdf"
                title="Remove uploaded PDF"
              >
                Remove PDF
              </button>
              <div class="zoom">
                <button class="ghost" @click="zoomOut">-</button>
                <input
                  class="z-input"
                  type="number"
                  :value="Math.round(zoom * 100)"
                  min="30"
                  max="300"
                  @change="onZoomInput"
                />
                <button class="ghost" @click="zoomIn">+</button>
              </div>
            </div>
            <div class="toolbar-hint">
              <span>Option/Alt + drag: create a box highlight.</span>
              <span>Cmd/Ctrl + click a box: open its discussion.</span>
              <HelpPopover label="Highlight help" title="Working with highlights">
                <p><strong>Create highlights</strong></p>
                <ul>
                  <li>Select text to open the popup, then choose <em>Highlight</em> or <em>Prompt</em> to start a discussion.</li>
                  <li>Use Option/Alt + drag to draw a box highlight around figures or equations where text selection is hard.</li>
                </ul>
                <p><strong>Open discussions from the paper</strong></p>
                <ul>
                  <li>Press Cmd (Mac) or Ctrl (Win/Linux) and click a highlight box to jump to its thread in the sidebar.</li>
                  <li>If several highlights overlap, Cmd/Ctrl + click shows a small picker so you can choose which thread to open.</li>
                </ul>
              </HelpPopover>
            </div>
          </div>
          <PdfAnnotator
            :src="localPdfUrl"
            :paper-id="externalPaperId"
            :active-color="selectedColor"
            :zoom="zoom"
            :highlight-visibility="highlightVisibility"
            :highlight-click-mode="true"
            :highlighted-anchor-id="highlightedAnchorId"
            @highlight-clicked="onHighlightClicked"
            @highlights-overlap-clicked="onHighlightsOverlapClicked"
          />
        </div>
        <!-- bioRxiv and arXiv PDFs via proxy (automatic) -->
        <div v-else class="pdf-scroll" @wheel="onPdfWheel">
          <div class="toolbar">
            <div class="colors">
              <button
                v-for="color in colors"
                :key="color.value"
                :style="{ backgroundColor: color.value }"
                :class="[
                  'color-btn',
                  { active: selectedColor === color.value },
                ]"
                @click="selectedColor = color.value"
              ></button>
            </div>
            <div class="zoom">
              <button class="ghost" @click="zoomOut">-</button>
              <input
                class="z-input"
                type="number"
                :value="Math.round(zoom * 100)"
                min="30"
                max="300"
                @change="onZoomInput"
              />
              <button class="ghost" @click="zoomIn">+</button>
            </div>
            <div class="toolbar-hint">
              <span>Option/Alt + drag: create a box highlight.</span>
              <span>Cmd/Ctrl + click a box: open its discussion.</span>
              <HelpPopover label="Highlight help" title="Working with highlights">
                <p><strong>Create highlights</strong></p>
                <ul>
                  <li>Select text to open the popup, then choose <em>Highlight</em> or <em>Prompt</em> to start a discussion.</li>
                  <li>Use Option/Alt + drag to draw a box highlight around figures or equations where text selection is hard.</li>
                </ul>
                <p><strong>Open discussions from the paper</strong></p>
                <ul>
                  <li>Press Cmd (Mac) or Ctrl (Win/Linux) and click a highlight box to jump to its thread in the sidebar.</li>
                  <li>If several highlights overlap, Cmd/Ctrl + click shows a small picker so you can choose which thread to open.</li>
                </ul>
              </HelpPopover>
            </div>
          </div>
          <PdfAnnotator
            :src="pdfProxyLink"
            :paper-id="externalPaperId"
            :active-color="selectedColor"
            :zoom="zoom"
            :highlight-visibility="highlightVisibility"
            :highlight-click-mode="true"
            :highlighted-anchor-id="highlightedAnchorId"
            @highlight-clicked="onHighlightClicked"
            @highlights-overlap-clicked="onHighlightsOverlapClicked"
          />
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, computed } from "vue";
import PdfAnnotator from "@/components/PdfAnnotator.vue";
import HelpPopover from "@/components/HelpPopover.vue";
import { paper, discussion } from "@/api/endpoints";
import { BASE_URL } from "@/api/client";
import { storePdf, getPdf, deletePdf } from "@/utils/pdfStorage";
import {
  ensureLibrary,
  saveLibrary,
  listTags,
  assignPaperToTags,
  getTagsForPaper,
  isPaperInLibrary,
  type LibraryTag,
  type LibraryData,
} from "@/utils/library";

type PaperSource = "arxiv" | "biorxiv";

const props = defineProps<{ id: string }>();
// id is the external paperId (from route)
const externalPaperId = ref<string>(props.id);
// internal _id (from ensure) - used for PdfHighlighter operations
const internalPaperId = ref<string | null>(null);
const header = reactive<{
  title?: string;
  doi?: string;
  link?: string;
  authors?: string;
}>({});
import { useSessionStore } from "@/stores/session";
const session = useSessionStore();
const banner = ref("");
const discussionCount = ref(0);
const showSuccessNotice = ref(false);
const showErrorNotice = ref(false);
const library = ref<LibraryData | null>(null);
const allTags = ref<LibraryTag[]>([]);
const folderPickerOpen = ref(false);
const selectedFolderIds = ref<string[]>([]);
const inlineTagName = ref("");

// Local PDF upload state (for bioRxiv papers - fallback only)
const localPdfUrl = ref<string | null>(null);
const localPdfLoading = ref(false);
const pdfLoadError = ref(false);

// Detect paper source from ID format
// bioRxiv DOIs: 10.1101/YYYY.MM.DD.NNNNNN or just the suffix
// arXiv IDs: YYMM.NNNNN or YYMM.NNNNNvN
const paperSource = computed<PaperSource>(() => {
  const id = externalPaperId.value;
  // bioRxiv DOI patterns
  if (id.startsWith("10.1101/") || /^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(id)) {
    return "biorxiv";
  }
  return "arxiv";
});

const sourceName = computed(() =>
  paperSource.value === "biorxiv" ? "bioRxiv" : "arXiv"
);

const pdfProxyLink = computed(() => {
  if (paperSource.value === "biorxiv") {
    // Use S3-backed proxy for bioRxiv PDFs
    const suffix = externalPaperId.value.startsWith("10.1101/")
      ? externalPaperId.value.slice("10.1101/".length)
      : externalPaperId.value;
    return `${BASE_URL}/biorxiv-pdf/${encodeURIComponent(suffix)}`;
  }
  return `${BASE_URL}/pdf/${encodeURIComponent(externalPaperId.value)}`;
});

const externalAbsLink = computed(() => {
  if (paperSource.value === "biorxiv") {
    const doi = externalPaperId.value.startsWith("10.1101/")
      ? externalPaperId.value
      : `10.1101/${externalPaperId.value}`;
    return `https://www.biorxiv.org/content/${doi}`;
  }
  return `https://arxiv.org/abs/${encodeURIComponent(externalPaperId.value)}`;
});

const externalPdfLink = computed(() => {
  if (paperSource.value === "biorxiv") {
    const doi = externalPaperId.value.startsWith("10.1101/")
      ? externalPaperId.value
      : `10.1101/${externalPaperId.value}`;
    return `https://www.biorxiv.org/content/${doi}.full.pdf`;
  }
  return `https://arxiv.org/pdf/${encodeURIComponent(
    externalPaperId.value
  )}.pdf`;
});

const zoom = ref(1);
const colors = [
  { name: "Yellow", value: "#ffeb3b" },
  { name: "Green", value: "#a5d6a7" },
  { name: "Blue", value: "#90caf9" },
  { name: "Red", value: "#ef9a9a" },
  { name: "Purple", value: "#ce93d8" },
];
const selectedColor = ref(colors[0].value);

const activeAnchorId = ref<string | null>(null);
const highlightedAnchorId = ref<string | null>(null);
const highlightVisibility = computed<
  Record<string, "self" | "ancestor" | "descendant" | "other">
>(() => {
  const idVal = activeAnchorId.value;
  return idVal ? { [idVal]: "self" } : {};
});

function onHighlightPdfAnchors(e: Event) {
  const custom = e as CustomEvent<string>;
  const anchorId = custom.detail;
  console.log("[PaperPage] onHighlightPdfAnchors received:", anchorId);
  highlightedAnchorId.value = anchorId;
  activeAnchorId.value = anchorId;
}

function onAnchorFocus(e: Event) {
  const custom = e as CustomEvent<string>;
  activeAnchorId.value = custom.detail || null;
}

function onHighlightClicked(highlightId: string) {
  // Set highlighted anchor for PDF visual feedback
  highlightedAnchorId.value = highlightId;
  activeAnchorId.value = highlightId;

  // Dispatch event to DiscussionPanel to highlight and reorder thread/reply
  try {
    window.dispatchEvent(
      new CustomEvent("anchor-highlight-clicked", { detail: highlightId })
    );
  } catch {
    // ignore
  }
}

function onHighlightsOverlapClicked(payload: {
  ids: string[];
  x: number;
  y: number;
}) {
  // Dispatch event to DiscussionPanel to show picker for overlapping highlights
  try {
    window.dispatchEvent(
      new CustomEvent("highlights-overlap-clicked", { detail: payload })
    );
  } catch {
    // ignore
  }
}

function onClickOutside() {
  // Clear highlights when clicking outside
  highlightedAnchorId.value = null;
  activeAnchorId.value = null;
  try {
    window.dispatchEvent(new CustomEvent("anchor-highlight-cleared"));
  } catch {
    // ignore
  }
}

// Check if ID is a valid paper ID pattern (arXiv or bioRxiv)
function isValidPaperId(id: string): boolean {
  // arXiv: YYMM.NNNNN or YYMM.NNNNNvN
  const arxivPattern = /^\d{4}\.\d{4,5}(v\d+)?$/;
  // bioRxiv DOI: 10.1101/... or just the suffix YYYY.MM.DD.NNNNNN
  const biorxivFullDoi = /^10\.1101\//;
  const biorxivSuffix = /^\d{4}\.\d{2}\.\d{2}\.\d+$/;

  return (
    arxivPattern.test(id) || biorxivFullDoi.test(id) || biorxivSuffix.test(id)
  );
}

function loadLibraryState() {
  if (!session.userId) {
    library.value = null;
    allTags.value = [];
    selectedFolderIds.value = [];
    return;
  }
  const lib = ensureLibrary(session.userId);
  library.value = lib;
  allTags.value = listTags(lib);
  const entryTags = getTagsForPaper(lib, externalPaperId.value);
  selectedFolderIds.value = entryTags.map((t) => t.id);
}

onMounted(async () => {
  try {
    if (!isValidPaperId(props.id)) {
      // Redirect to search results instead of auto-selecting the first match
      window.location.assign(`/search?q=${encodeURIComponent(props.id)}`);
      return;
    }
    
    // Always try to get paper info and title
    try {
      const { id, title } = await paper.get({ id: externalPaperId.value });
      if (title) {
        header.title = title;
      }
      header.doi = externalPaperId.value;
      header.link = externalAbsLink.value;
    } catch (e) {
      console.error("Failed to get paper:", e);
    }
    
    // If title is still missing, try to fetch from source
    if (!header.title) {
      try {
        if (paperSource.value === 'arxiv') {
          const { papers } = await paper.searchArxiv({ q: externalPaperId.value });
          const match = papers.find(p => p.id === externalPaperId.value);
          if (match?.title) {
            header.title = match.title;
            // Update paper metadata
            paper.updateMeta({ id: externalPaperId.value, title: match.title }).catch(() => {});
          }
        } else if (paperSource.value === 'biorxiv') {
          // For bioRxiv, the paperId may be a full DOI (10.1101/...) or just the suffix.
          // The backend search is more reliable if we query by suffix, so strip the prefix.
          const query = externalPaperId.value.startsWith("10.1101/")
            ? externalPaperId.value.slice("10.1101/".length)
            : externalPaperId.value;
          const { papers } = await paper.searchBiorxiv({ q: query });
          const match = papers.find(
            (p) =>
              p.id === query ||
              p.doi === externalPaperId.value ||
              p.doi === `10.1101/${query}`
          );
          if (match?.title) {
            header.title = match.title;
            // Update paper metadata for future loads (paperId is the external id/DOI)
            paper
              .updateMeta({ id: externalPaperId.value, title: match.title })
              .catch(() => {});
          }
        }
      } catch (e) {
        console.error("Failed to fetch title from source:", e);
      }
    }
  } catch {}
  window.addEventListener("anchor-focus", onAnchorFocus);
  window.addEventListener("highlight-pdf-anchors", onHighlightPdfAnchors);
  // Handle clicks outside to clear highlights
  document.addEventListener("click", onDocumentClick);

  loadLibraryState();

  // Auto-ensure paper exists in local index so we can attach discussions
  // This also gives us the internal _id which we need for PdfHighlighter operations
  try {
    const ensured = await paper.ensure({
      id: externalPaperId.value,
      source: paperSource.value,
    });
    // Store internal _id for PdfHighlighter operations
    internalPaperId.value = ensured.id;
    // Always refresh title to ensure it's up to date
    try {
      const { title } = await paper.get({ id: externalPaperId.value });
      if (title) {
        header.title = title;
      }
    } catch (e) {
      console.error("Failed to fetch paper title:", e);
    }
  } catch (e) {
    console.error("Failed to ensure paper:", e);
  }

  // For bioRxiv papers: try loading from IndexedDB first (manual uploads)
  // If not found, we'll use the proxy automatically (like arXiv)
  if (paperSource.value === "biorxiv") {
    localPdfLoading.value = true;
    try {
      const storedBlob = await getPdf(externalPaperId.value);
      if (storedBlob) {
        localPdfUrl.value = URL.createObjectURL(storedBlob);
      }
    } catch (e) {
      console.error("Failed to load PDF from storage:", e);
    } finally {
      localPdfLoading.value = false;
    }

    // Note: We'll let PdfAnnotator try to load via proxy first
    // If it fails, we can show the upload fallback
    // pdfLoadError will be set by PdfAnnotator's error event if needed

    // Fetch discussion count
    try {
      const { pubId } = await discussion.getPubIdByPaper({
        paperId: externalPaperId.value,
      });
      if (pubId) {
        const { threads } = await discussion.listThreads({ pubId });
        discussionCount.value = threads.length;
      }
    } catch {
      // Ignore - discussion count is optional
    }
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("anchor-focus", onAnchorFocus);
  window.removeEventListener("highlight-pdf-anchors", onHighlightPdfAnchors);
  document.removeEventListener("click", onDocumentClick);
  // Revoke blob URL to free memory
  if (localPdfUrl.value) {
    URL.revokeObjectURL(localPdfUrl.value);
  }
});

function onDocumentClick(e: MouseEvent) {
  // Don't clear if clicking on PDF highlights or discussion panel
  const target = e.target as HTMLElement;
  if (target.closest(".pdf-annotator") || target.closest(".panel")) {
    return;
  }
  onClickOutside();
}

const id = computed(() => externalPaperId.value);

const isAlreadyInLibrary = computed(() =>
  library.value
    ? isPaperInLibrary(library.value, externalPaperId.value)
    : false
);

const currentFolderNames = computed(() => {
  if (!library.value) return [];
  const tags = getTagsForPaper(library.value, externalPaperId.value);
  return tags.map((t) => t.name);
});

function toggleFolderPicker() {
  if (!session.userId) {
    alert("Please sign in first.");
    return;
  }
  if (!library.value) {
    loadLibraryState();
  }
  folderPickerOpen.value = !folderPickerOpen.value;
}

function toggleFolderSelection(folderId: string) {
  const idx = selectedFolderIds.value.indexOf(folderId);
  if (idx === -1) {
    selectedFolderIds.value.push(folderId);
  } else {
    selectedFolderIds.value.splice(idx, 1);
  }
}

function createInlineTag() {
  const name = inlineTagName.value.trim();
  if (!name || !session.userId) return;
  if (!library.value) {
    library.value = ensureLibrary(session.userId);
  }
  const lib = library.value;
  if (!lib.tags) {
    lib.tags = [];
  }
  const existing = lib.tags.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
  const tag = existing ?? {
    id: crypto.randomUUID(),
    name,
    parentId: null,
  } as LibraryTag;
  if (!existing) {
    lib.tags.push(tag);
    saveLibrary(session.userId, lib);
  }
  if (!selectedFolderIds.value.includes(tag.id)) {
    selectedFolderIds.value.push(tag.id);
  }
  allTags.value = listTags(lib);
  inlineTagName.value = "";
}

function saveToLibrary() {
  if (!session.userId) {
    alert("Please sign in first.");
    return;
  }
  if (!library.value) {
    library.value = ensureLibrary(session.userId);
  }
  const lib = library.value;
  assignPaperToTags(lib, externalPaperId.value, selectedFolderIds.value);
  saveLibrary(session.userId, lib);
  showSuccessNotice.value = true;
  showErrorNotice.value = false;
  folderPickerOpen.value = false;
  setTimeout(() => {
    showSuccessNotice.value = false;
  }, 2000);
  loadLibraryState();
}

function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.1, 3);
}
function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.1, 0.3);
}

function onZoomInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const val = Number(input.value);
  if (Number.isNaN(val)) return;
  const clamped = Math.min(300, Math.max(30, val));
  zoom.value = clamped / 100;
}

function onPdfWheel(e: WheelEvent) {
  // Only treat Cmd/Ctrl + wheel as zoom; plain wheel still scrolls.
  if (!(e.metaKey || e.ctrlKey)) return;
  e.preventDefault();
  const delta = e.deltaY;
  const step = 0.05;
  if (delta > 0) {
    zoom.value = Math.max(0.3, zoom.value - step);
  } else if (delta < 0) {
    zoom.value = Math.min(3, zoom.value + step);
  }
}

// Handle PDF file upload (bioRxiv)
async function onPdfUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  // Validate it's a PDF
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    alert("Please upload a PDF file");
    return;
  }

  try {
    // Store in IndexedDB for persistence
    await storePdf(externalPaperId.value, file);

    // Create blob URL for display
    if (localPdfUrl.value) {
      URL.revokeObjectURL(localPdfUrl.value);
    }
    localPdfUrl.value = URL.createObjectURL(file);
  } catch (e) {
    console.error("Failed to store PDF:", e);
    alert("Failed to store PDF. Please try again.");
  }

  // Reset input so same file can be re-selected
  input.value = "";
}

// Remove uploaded PDF
async function removePdf() {
  if (!confirm("Remove the uploaded PDF? You can upload it again later."))
    return;

  try {
    await deletePdf(externalPaperId.value);
    if (localPdfUrl.value) {
      URL.revokeObjectURL(localPdfUrl.value);
      localPdfUrl.value = null;
    }
  } catch (e) {
    console.error("Failed to remove PDF:", e);
  }
}
</script>

<style scoped>
.paper {
  display: grid;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
}
.header .title {
  font-family: var(--font-serif);
  margin: 0;
  font-size: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-wrap: break-word;
  overflow-wrap: break-word;
  max-width: 100%;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.save-wrapper {
  position: relative;
}
.folder-picker {
  position: absolute;
  right: 0;
  top: 110%;
  z-index: 20;
  width: 260px;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.folder-picker-header {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
}
.folder-picker-body {
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 10px;
}
.folder-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.folder-option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.folder-empty {
  font-size: 13px;
  color: var(--muted);
}
.tag-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
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
.new-tag-inline {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.new-tag-inline input {
  flex: 1;
  border-radius: 6px;
  border: 1px solid var(--border);
  padding: 4px 8px;
  font-size: 13px;
}
.meta {
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
}
.meta a {
  color: var(--brand);
  text-decoration: none;
}
.meta a:hover {
  text-decoration: underline;
}
.in-library-pill {
  display: inline-block;
  margin-left: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  font-size: 12px;
}
.inline {
  padding: 2px 8px;
}
.paper-content {
  display: block;
  max-width: 100%;
}
.pdf-scroll {
  width: 100%;
  height: calc(100vh - 220px);
  overflow: auto;
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #fff;
  max-width: 100%;
  box-sizing: border-box;
}
.pdf-scroll :deep(.pdf-annotator),
.pdf-scroll :deep(.viewer),
.pdf-scroll :deep(.pages) {
  max-width: 100%;
  box-sizing: border-box;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  cursor: pointer;
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
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}
.ghost:hover {
  border-color: var(--brand);
  background: #fef2f2;
}
.banner {
  margin-top: 8px;
  color: var(--error);
}
.success-notice {
  margin-top: 12px;
  padding: 12px 16px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  font-weight: 500;
  animation: fadeInOut 2s ease-in-out;
}
.error-notice {
  margin-top: 12px;
  padding: 12px 16px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  font-weight: 500;
  animation: fadeInOut 2s ease-in-out;
}
@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  15% {
    opacity: 1;
    transform: translateY(0);
  }
  85% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px);
  }
}
.divider {
  height: 1px;
  background: var(--border);
  margin: 12px 0;
}
.toolbar {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  background: #fff;
  z-index: 5;
  border-bottom: 1px solid var(--border);
  margin: 20px;
}
.toolbar .z {
  width: 52px;
  text-align: center;
  line-height: 28px;
}
.colors {
  display: flex;
  gap: 8px;
}
.color-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.1s;
}
.color-btn:hover {
  transform: scale(1.1);
}
.color-btn.active {
  border-color: #333;
}
.zoom {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-hint {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 11px;
  color: var(--muted);
  margin-left: auto;
  text-align: right;
  gap: 2px;
}

.toolbar-hint .help-popover-wrapper {
  margin-top: 4px;
}
@media (max-width: 1100px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
.biorxiv-fallback {
  text-align: center;
  padding: 48px 24px;
}
.biorxiv-fallback h3 {
  margin: 0 0 12px;
  font-size: 1.25rem;
}
.biorxiv-fallback p {
  color: #666;
  margin: 0 0 24px;
}
.biorxiv-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
/* Upload prompt for bioRxiv */
.upload-prompt {
  text-align: center;
  padding: 48px 24px;
  max-width: 480px;
  margin: 0 auto;
}
.upload-prompt .upload-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}
.upload-prompt h3 {
  margin: 0 0 20px;
  font-size: 1.35rem;
  color: #333;
}
.error-message {
  color: #d32f2f;
  margin: 0 0 16px;
  font-size: 0.95rem;
}
.upload-steps {
  text-align: left;
  margin: 0 auto 24px;
  padding-left: 24px;
  max-width: 320px;
}
.upload-steps li {
  margin-bottom: 12px;
  color: #555;
  line-height: 1.5;
}
.upload-steps .download-link {
  color: var(--brand);
  font-weight: 500;
}
.upload-btn {
  display: inline-block;
  cursor: pointer;
  font-size: 1rem;
  padding: 10px 24px;
}
.upload-btn:hover {
  opacity: 0.9;
}
.privacy-note {
  margin-top: 16px;
  font-size: 0.85rem;
  color: #888;
}
.discussion-hint {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}
.discussion-hint p {
  margin: 0;
  color: #555;
}
.discussion-hint strong {
  color: var(--brand);
}
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.remove-pdf {
  font-size: 0.85rem;
  padding: 4px 8px;
  color: #888;
  border-color: #ccc;
}
.remove-pdf:hover {
  color: #c00;
  border-color: #c00;
}
</style>
