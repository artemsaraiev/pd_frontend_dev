<template>
  <div class="paper">
    <header class="card header">
      <div class="title-row">
        <h2 class="title">{{ header.title || id }}</h2>
        <div class="actions">
          <a class="ghost" :href="pdfArxivLink" target="_blank" rel="noreferrer">Open PDF</a>
          <button class="primary" @click="scrollToAnchors">Add Anchor</button>
          <button class="ghost" @click="saveToLibrary">Add to library</button>
          <a class="ghost" href="/">Back to Feed</a>
        </div>
      </div>
      <div class="meta">
        <span v-if="header.doi"><a :href="header.link" target="_blank" rel="noreferrer">{{ header.doi }}</a></span>
        <span v-if="header.authors"> · {{ header.authors }}</span>
      </div>
      <p v-if="banner" class="banner">{{ banner }} <button class="primary inline" @click="ensurePaper">Ensure</button></p>
    </header>

    <div class="columns">
      <section class="center">
        <div class="pdf-scroll">
          <div class="toolbar">
            <button class="ghost" @click="zoomOut">-</button>
            <span class="z">{{ Math.round(zoom * 100) }}%</span>
            <button class="ghost" @click="zoomIn">+</button>
            <button class="ghost" @click="fitWidth">Fit width</button>
          </div>
          <PdfView :paperId="id" :sources="[pdfProxyLink, pdfArxivLink]" :zoom="zoom" :fit="fit" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue';
import PdfView from '@/components/PdfView.vue';
import { paper } from '@/api/endpoints';
import { BASE_URL } from '@/api/client';

const props = defineProps<{ id: string }>();
const resolvedId = ref<string>(props.id);
const header = reactive<{ title?: string; doi?: string; link?: string; authors?: string }>({});
import { useSessionStore } from '@/stores/session';
const session = useSessionStore();
const banner = ref('');

const pdfProxyLink = computed(() => `${BASE_URL}/pdf/${encodeURIComponent(resolvedId.value)}`);
const pdfArxivLink = computed(() => `https://arxiv.org/pdf/${encodeURIComponent(resolvedId.value)}.pdf`);

const zoom = ref(1);
const fit = ref(true);

onMounted(async () => {
  try {
    const idLike = /^\d{4}\.\d{4,5}(v\d+)?$/;
    if (!idLike.test(props.id)) {
      // Redirect to search results instead of auto-selecting the first match
      window.location.assign(`/search?q=${encodeURIComponent(props.id)}`);
      return;
    }
    const { id, title } = await paper.get({ id: resolvedId.value });
    header.title = title;
    header.doi = resolvedId.value;
    header.link = `https://arxiv.org/abs/${encodeURIComponent(resolvedId.value)}`;
    if (!title) {
      banner.value = 'This paper is not yet in your index.';
    }
  } catch {}
});

function scrollToAnchors() { /* no-op, discussion moved to right sidebar */ }

const id = computed(() => resolvedId.value);

function saveToLibrary() {
  if (!session.userId) { alert('Please sign in first.'); return; }
  const key = `library:${session.userId}`;
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  if (!ids.includes(id.value)) {
    ids.push(id.value);
    localStorage.setItem(key, JSON.stringify(ids));
  }
}

async function ensurePaper() {
  try {
    await paper.ensure({ id: resolvedId.value });
    const { title } = await paper.get({ id: resolvedId.value });
    header.title = title;
    banner.value = '';
  } catch (e: any) {
    banner.value = String(e?.message ?? 'Failed to ensure paper');
  }
}

function zoomIn() { fit.value = false; zoom.value = Math.min(zoom.value + 0.1, 3); }
function zoomOut() { fit.value = false; zoom.value = Math.max(zoom.value - 0.1, 0.3); }
function fitWidth() { fit.value = true; }
</script>

<style scoped>
.paper { display: grid; gap: 12px; }
.header .title { font-family: var(--font-serif); }
.title-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.actions { display: flex; gap: 8px; }
.inline { padding: 2px 8px; }
.columns { display: grid; grid-template-columns: 1fr; gap: 16px; }
.center { display: block; }
.pdf-scroll { height: calc(100vh - 220px); overflow: auto; position: relative; }
.card { border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; text-decoration: none; }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; text-decoration: none; }
.banner { margin-top: 8px; color: var(--error); }
.divider { height: 1px; background: var(--border); margin: 12px 0; }
.toolbar { position: sticky; top: 0; display: flex; gap: 8px; padding: 8px 0; background: #fff; z-index: 5; border-bottom: 1px solid var(--border); }
.toolbar .z { width: 52px; text-align: center; line-height: 28px; }
@media (max-width: 1100px) {
  .columns { grid-template-columns: 1fr; }
}
</style>


