<template>
  <div class="page">
    <h2>My Papers</h2>
    <div class="cards">
      <div v-for="p in papers" :key="p.id" class="card">
        <h3 class="title"><a :href="`/paper/${encodeURIComponent(p.id)}`">{{ p.title || p.id }}</a></h3>
        <button class="ghost" @click="remove(p.id)">Remove</button>
      </div>
      <p v-if="!papers.length" class="hint">No saved papers yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { paper } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';

const papers = ref<Array<{ id: string; title?: string }>>([]);
const store = useSessionStore();

function load() {
  if (!store.userId) { papers.value = []; return; }
  const key = `library:${store.userId}`;
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  papers.value = [];
  Promise.all(ids.map(async (id) => {
    const { title } = await paper.get({ id });
    papers.value.push({ id, title });
  }));
}

function remove(id: string) {
  if (!store.userId) return;
  const key = `library:${store.userId}`;
  const ids: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  const next = ids.filter(x => x !== id);
  localStorage.setItem(key, JSON.stringify(next));
  load();
}

onMounted(load);
watch(() => store.userId, load);
</script>

<style scoped>
.cards { display: grid; gap: 12px; }
.card { border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 12px 16px; }
.title { font-family: var(--font-serif); }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; }
</style>


