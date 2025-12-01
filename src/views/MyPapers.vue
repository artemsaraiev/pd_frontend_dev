<template>
  <div class="page">
    <h2>My Papers</h2>
    <div class="cards">
      <div v-for="p in papers" :key="p.id" class="card">
        <h3 class="title">
          <a :href="`/paper/${encodeURIComponent(p.paperId)}`">{{
            p.title || p.paperId
          }}</a>
        </h3>
        <div class="ctas">
          <a class="primary" :href="`/paper/${encodeURIComponent(p.paperId)}`"
            >View discussion</a
          >
          <button class="ghost" @click="remove(p.paperId)">Remove</button>
        </div>
      </div>
      <p v-if="!papers.length" class="hint">No saved papers yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { paper } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';

const papers = ref<Array<{ id: string; paperId: string; title?: string }>>([]);
const store = useSessionStore();

function load() {
  if (!store.userId) { papers.value = []; return; }
  const key = `library:${store.userId}`;
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  papers.value = [];
  Promise.all(ids.map(async (id) => {
    // id from localStorage is the external paperId
    const result = await paper.get({ id });
    papers.value.push({ id: result.id, paperId: result.paperId, title: result.title });
  }));
}

function remove(paperId: string) {
  if (!store.userId) return;
  const key = `library:${store.userId}`;
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  // Remove by external paperId (what's stored in localStorage)
  const next = ids.filter(x => x !== paperId);
  localStorage.setItem(key, JSON.stringify(next));
  load();
}

onMounted(load);
watch(() => store.userId, load);
</script>

<style scoped>
h2 {
  font-family: var(--font-serif);
  font-size: 32px;
  margin-bottom: 24px;
  color: var(--brand);
}

/* Cards Grid */
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
.hint {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--muted);
  font-style: italic;
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
