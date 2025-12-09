<template>
  <div class="search-results">
    <header class="card">
      <h2>Search results</h2>
      <form class="bar" @submit.prevent="run">
        <input
          v-model="q"
          placeholder="Search all papers (e.g. machine learning, CRISPR)"
        />
        <button class="primary" :disabled="loading">Search</button>
      </form>
      <p v-if="hint" class="hint">{{ hint }}</p>
      
      <!-- Source filter buttons - shown after search -->
      <div v-if="allResults.length > 0" class="filters">
        <span class="filter-label">Filter by source:</span>
        <button
          :class="['filter-btn', { active: sourceFilter === 'all' }]"
          @click="sourceFilter = 'all'"
        >
          All ({{ allResults.length }})
        </button>
        <button
          :class="['filter-btn', { active: sourceFilter === 'arxiv' }]"
          @click="sourceFilter = 'arxiv'"
        >
          arXiv ({{ arxivResults.length }})
        </button>
        <button
          :class="['filter-btn', { active: sourceFilter === 'biorxiv' }]"
          @click="sourceFilter = 'biorxiv'"
        >
          bioRxiv ({{ biorxivResults.length }})
        </button>
      </div>
    </header>

    <div class="cards">
      <div v-for="r in filteredResults" :key="`${r.source}-${r.id}`" class="card result">
        <div class="source-badge" :class="r.source">
          {{ r.source === 'arxiv' ? 'arXiv' : 'bioRxiv' }}
        </div>
        <h3 class="title">
          <a :href="getPaperUrl(r)">{{ r.title || r.id }}</a>
        </h3>
        <div class="meta">
          <template v-if="r.source === 'arxiv'">
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
      <p v-if="!loading && filteredResults.length === 0 && allResults.length > 0" class="hint">
        No {{ sourceFilter === 'all' ? '' : sourceFilter }} results match the current filter.
      </p>
      <p v-if="!loading && allResults.length === 0" class="hint">No results. Try a different query.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { paper } from '@/api/endpoints';

type PaperSource = 'arxiv' | 'biorxiv';

interface ResultWithSource {
  id: string;
  title?: string;
  doi?: string;
  source: PaperSource;
}

const route = useRoute();
const router = useRouter();
const q = ref<string>((route.query.q as string) || '');
const sourceFilter = ref<'all' | 'arxiv' | 'biorxiv'>((route.query.filter as 'all' | 'arxiv' | 'biorxiv') || 'all');
const allResults = ref<ResultWithSource[]>([]);
const loading = ref(false);
const hint = ref('');

// Computed: filter results based on source filter
const filteredResults = computed(() => {
  if (sourceFilter.value === 'all') return allResults.value;
  return allResults.value.filter(r => r.source === sourceFilter.value);
});

// Computed: count results by source
const arxivResults = computed(() => allResults.value.filter(r => r.source === 'arxiv'));
const biorxivResults = computed(() => allResults.value.filter(r => r.source === 'biorxiv'));

function getPaperUrl(r: ResultWithSource) {
  const paperId = r.source === 'biorxiv' && r.doi ? r.doi : r.id;
  return `/paper/${encodeURIComponent(paperId)}`;
}

function getBiorxivAbsUrl(r: ResultWithSource) {
  const doi = r.doi || `10.1101/${r.id}`;
  return `https://www.biorxiv.org/content/${doi}`;
}

function getBiorxivPdfUrl(r: ResultWithSource) {
  const doi = r.doi || `10.1101/${r.id}`;
  return `https://www.biorxiv.org/content/${doi}.full.pdf`;
}

async function run() {
  const query = q.value.trim();
  if (!query) return;
  loading.value = true;
  hint.value = '';
  allResults.value = [];
  
  try {
    // sync the URL so it's shareable
    const newQuery: Record<string, string> = { q: query };
    if (sourceFilter.value !== 'all') {
      newQuery.filter = sourceFilter.value;
    }
    if (route.query.q !== query || route.query.filter !== newQuery.filter) {
      router.replace({ path: '/search', query: newQuery });
    }

    // Search BOTH sources in parallel
    const [arxivRes, biorxivRes] = await Promise.allSettled([
      paper.searchArxiv({ q: query }),
      paper.searchBiorxiv({ q: query }),
    ]);

    const results: ResultWithSource[] = [];

    // Add arXiv results
    if (arxivRes.status === 'fulfilled') {
      results.push(...arxivRes.value.papers.map(p => ({ ...p, source: 'arxiv' as PaperSource })));
    }

    // Add bioRxiv results
    if (biorxivRes.status === 'fulfilled') {
      results.push(...biorxivRes.value.papers.map(p => ({ ...p, source: 'biorxiv' as PaperSource })));
    }

    allResults.value = results;
    
    const arxivCount = arxivResults.value.length;
    const biorxivCount = biorxivResults.value.length;
    const total = results.length;
    
    if (total > 0) {
      hint.value = `Found ${total} result${total === 1 ? '' : 's'}: ${arxivCount} from arXiv, ${biorxivCount} from bioRxiv`;
    } else {
      hint.value = `No results found for "${query}"`;
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

// Watch for URL query changes
watch(() => route.query.q, (val) => {
  const s = (val as string) || '';
  if (s !== q.value) {
    q.value = s;
    if (q.value) run();
  }
});

watch(() => route.query.filter, (val) => {
  const filter = (val as 'all' | 'arxiv' | 'biorxiv') || 'all';
  if (filter !== sourceFilter.value) {
    sourceFilter.value = filter;
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
  grid-template-columns: 1fr auto;
  gap: 8px;
  margin-top: 8px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}

.filter-btn {
  padding: 6px 14px;
  border: 1.5px solid var(--border);
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text);
}

.filter-btn:hover {
  border-color: var(--brand);
  background: #fef2f2;
}

.filter-btn.active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
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

.result {
  position: relative;
}

.source-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.source-badge.arxiv {
  background: #f3f4f6;
  color: #374151;
}

.source-badge.biorxiv {
  background: #dbeafe;
  color: #1e40af;
}

.result .title {
  font-family: var(--font-serif);
  margin: 0 0 8px 0;
  font-size: 18px;
  line-height: 1.4;
  padding-right: 80px; /* Make room for badge */
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
