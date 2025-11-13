<template>
  <div class="search-results">
    <header class="card">
      <h2>Search results</h2>
      <form class="bar" @submit.prevent="run">
        <input v-model="q" placeholder="Search arXiv (e.g. Attention Is All You Need)" />
        <button class="primary" :disabled="loading">Search</button>
      </form>
      <p v-if="hint" class="hint">{{ hint }}</p>
    </header>

    <div class="cards">
      <div v-for="r in results" :key="r.id" class="card result">
        <h3 class="title"><a :href="`/paper/${encodeURIComponent(r.id)}`">{{ r.title || r.id }}</a></h3>
        <div class="meta">
          <a :href="`https://arxiv.org/abs/${encodeURIComponent(r.id)}`" target="_blank" rel="noreferrer">arXiv</a>
          <span> · </span>
          <a :href="`https://arxiv.org/pdf/${encodeURIComponent(r.id)}.pdf`" target="_blank" rel="noreferrer">PDF</a>
        </div>
      </div>
      <p v-if="!loading && !results.length" class="hint">No results. Try a different query.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { paper } from '@/api/endpoints';

const route = useRoute();
const router = useRouter();
const q = ref<string>((route.query.q as string) || '');
const results = ref<Array<{ id: string; title?: string }>>([]);
const loading = ref(false);
const hint = ref('');

async function run() {
  const query = q.value.trim();
  if (!query) return;
  loading.value = true;
  hint.value = '';
  results.value = [];
  try {
    // sync the URL so it's shareable
    if (route.query.q !== query) {
      router.replace({ path: '/search', query: { q: query } });
    }
    const { papers } = await paper.searchArxiv({ q: query });
    results.value = papers;
    if (papers.length > 0) {
      hint.value = `Showing ${papers.length} result${papers.length === 1 ? '' : 's'} for “${query}”`;
    } else {
      hint.value = `No results for “${query}”`;
    }
  } catch (e: any) {
    hint.value = String(e?.message ?? 'Search failed');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (q.value) run();
});

watch(() => route.query.q, (val) => {
  const s = (val as string) || '';
  if (s !== q.value) {
    q.value = s;
    if (q.value) run();
  }
});
</script>

<style scoped>
.search-results { display: grid; gap: 12px; }
.bar { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-top: 8px; }
input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; }
.cards { display: grid; gap: 12px; }
.card { border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.result .title { margin: 0 0 4px; }
.meta { font-size: 13px; color: #666; }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; }
.hint { color: #666; margin-top: 6px; }
</style>


