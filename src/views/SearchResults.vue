<template>
  <div class="search-results">
    <header class="card">
      <h2>Search results</h2>
      <form class="bar" @submit.prevent="run">
        <select v-model="source" class="source-select">
          <option value="arxiv">arXiv</option>
          <option value="biorxiv">bioRxiv</option>
        </select>
        <input
          v-model="q"
          :placeholder="source === 'arxiv' ? 'Search arXiv (e.g. Attention Is All You Need)' : 'Search bioRxiv (e.g. CRISPR gene editing)'"
        />
        <button class="primary" :disabled="loading">Search</button>
      </form>
      <p v-if="hint" class="hint">{{ hint }}</p>
    </header>

    <div class="cards">
      <div v-for="r in results" :key="r.id" class="card result">
        <h3 class="title">
          <a :href="getPaperUrl(r)">{{ r.title || r.id }}</a>
        </h3>
        <div class="meta">
          <!-- Use resultSource (source when results were fetched) not source (current dropdown) -->
          <template v-if="resultSource === 'arxiv'">
            <a :href="`https://arxiv.org/abs/${encodeURIComponent(r.id)}`" target="_blank" rel="noreferrer">arXiv</a>
            <span> · </span>
            <a :href="`https://arxiv.org/pdf/${encodeURIComponent(r.id)}.pdf`" target="_blank" rel="noreferrer">PDF</a>
          </template>
          <template v-else>
            <a :href="getBiorxivAbsUrl(r)" target="_blank" rel="noreferrer">bioRxiv</a>
            <span> · </span>
            <a :href="getBiorxivPdfUrl(r)" target="_blank" rel="noreferrer">PDF</a>
          </template>
        </div>
        <div class="ctas">
          <a class="primary" :href="getPaperUrl(r)">View discussion</a>
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

type PaperSource = 'arxiv' | 'biorxiv';

const route = useRoute();
const router = useRouter();
const q = ref<string>((route.query.q as string) || '');
const source = ref<PaperSource>((route.query.source as PaperSource) || 'arxiv');
// Track what source was used for current results (so changing dropdown doesn't affect displayed results)
const resultSource = ref<PaperSource>('arxiv');
const results = ref<Array<{ id: string; title?: string; doi?: string }>>([]);
const loading = ref(false);
const hint = ref('');

function getPaperUrl(r: { id: string; doi?: string }) {
  // Use resultSource, not source, for generating URLs
  const paperId = resultSource.value === 'biorxiv' && r.doi ? r.doi : r.id;
  return `/paper/${encodeURIComponent(paperId)}`;
}

function getBiorxivAbsUrl(r: { id: string; doi?: string }) {
  // bioRxiv abstract URL: https://www.biorxiv.org/content/{doi}
  const doi = r.doi || `10.1101/${r.id}`;
  return `https://www.biorxiv.org/content/${doi}`;
}

function getBiorxivPdfUrl(r: { id: string; doi?: string }) {
  // bioRxiv PDF URL: https://www.biorxiv.org/content/{doi}.full.pdf
  const doi = r.doi || `10.1101/${r.id}`;
  return `https://www.biorxiv.org/content/${doi}.full.pdf`;
}

async function run() {
  const query = q.value.trim();
  if (!query) return;
  loading.value = true;
  hint.value = '';
  results.value = [];
  
  // Capture the source at time of search
  const searchSource = source.value;
  
  try {
    // sync the URL so it's shareable
    const newQuery = { q: query, source: searchSource };
    if (route.query.q !== query || route.query.source !== searchSource) {
      router.replace({ path: '/search', query: newQuery });
    }

    // Call the appropriate search API based on source
    let papers: Array<{ id: string; title?: string; doi?: string }>;
    if (searchSource === 'biorxiv') {
      const res = await paper.searchBiorxiv({ q: query });
      papers = res.papers;
    } else {
      const res = await paper.searchArxiv({ q: query });
      papers = res.papers;
    }

    results.value = papers;
    resultSource.value = searchSource; // Store the source used for these results
    
    const sourceName = searchSource === 'arxiv' ? 'arXiv' : 'bioRxiv';
    if (papers.length > 0) {
      hint.value = `Showing ${papers.length} ${sourceName} result${papers.length === 1 ? '' : 's'} for "${query}"`;
    } else {
      hint.value = `No ${sourceName} results for "${query}"`;
    }
  } catch (e: any) {
    hint.value = String(e?.message ?? 'Search failed');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  // Initialize resultSource from URL if available
  resultSource.value = (route.query.source as PaperSource) || 'arxiv';
  if (q.value) run();
});

// Watch for URL query changes
watch(() => route.query.q, (val) => {
  const s = (val as string) || '';
  if (s !== q.value) {
    q.value = s;
    if (q.value) run();
  }
});

watch(() => route.query.source, (val) => {
  const s = (val as PaperSource) || 'arxiv';
  if (s !== source.value) {
    source.value = s;
    if (q.value) run();
  }
});
</script>

<style scoped>
.search-results {
  display: grid;
  gap: 20px;
}

.bar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  margin-top: 8px;
}

.source-select {
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-select:hover {
  border-color: #d1d5db;
}

.source-select:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
}

input {
  padding: 10px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

input:hover {
  border-color: #d1d5db;
}

input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(179, 27, 27, 0.1);
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

.result .title {
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

.meta {
  color: var(--muted);
  font-size: 13px;
  margin-top: 8px;
  font-weight: 500;
}

.meta a {
  color: var(--brand);
  text-decoration: none;
  transition: opacity 0.2s ease;
}

.meta a:hover {
  opacity: 0.8;
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

.hint {
  color: var(--muted);
  margin-top: 6px;
  font-style: italic;
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
