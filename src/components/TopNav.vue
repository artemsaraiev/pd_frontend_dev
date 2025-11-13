<template>
  <header class="topbar">
    <div class="brand" @click="goHome">PubDiscuss</div>
    <div class="search">
      <input v-model.trim="q" placeholder="Search papers or authors" @keyup.enter="emitSearch" />
      <button class="primary" @click="emitSearch">Search</button>
    </div>
    <div class="right">
      <button class="ghost" @click="goNewThread">+ New Thread</button>
      <div class="status" :class="{ ok: backendOk, bad: !backendOk }">{{ backendOk ? 'Connected' : 'Offline' }}</div>
      <button v-if="!token" class="primary" @click="goLogin">Sign in</button>
      <div v-else class="user">Signed in <a href="#" @click.prevent="logout">Sign out</a></div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSessionStore } from '@/stores/session';
import { session } from '@/api/endpoints';

const props = defineProps<{ backendOk: boolean }>();
const emit = defineEmits<{ (e: 'search', q: string): void }>();
const q = ref('');
let store: ReturnType<typeof useSessionStore>;
try { store = useSessionStore(); } catch { /* during HMR pinia may not be active yet */ }
const token = computed(() => store?.token ?? null);

async function emitSearch() {
  const query = q.value.trim();
  if (!query) return;
  const idLike = /^\d{4}\.\d{4,5}(v\d+)?$/;
  if (idLike.test(query)) {
    window.location.assign(`/paper/${encodeURIComponent(query)}`);
    return;
  }
  window.location.assign(`/search?q=${encodeURIComponent(query)}`);
}
function goHome() { window.location.assign('/'); }
function goLogin() { window.location.assign('/login'); }
function goNewThread() { window.location.assign('/'); }
async function logout() {
  if (store?.token) {
    try { await session.logout({ session: store.token }); } catch {}
  }
  store?.clear?.();
  window.location.assign('/');
}
</script>

<style scoped>
.topbar { position: sticky; top: 0; z-index: 50; display: grid; grid-template-columns: 200px 1fr auto; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); background: #fff; }
.brand { color: var(--brand); font-weight: 700; font-family: var(--font-serif); cursor: pointer; }
.search { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; }
.right { display: flex; gap: 8px; align-items: center; }
.status { font-size: 12px; padding: 4px 8px; border-radius: 999px; background: #f4f4f5; color: #444; }
.status.ok { background: #e7f7ee; color: var(--ok); }
.status.bad { background: #fde8e8; color: var(--error); }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; }
@media (max-width: 780px) {
  .topbar { grid-template-columns: 1fr auto; }
  .brand { display: none; }
}
</style>


