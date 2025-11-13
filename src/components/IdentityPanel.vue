<template>
  <div class="panel">
    <button class="toggle" @click="open = !open">Identity {{ open ? '▾' : '▸' }}</button>
    <div v-if="open" class="content">
      <div class="row">
        <label>ORCID</label>
        <input v-model.trim="orcid" placeholder="0000-0001-2345-6789" />
      </div>
      <button :disabled="busyOrcid || !orcid" @click="onSaveOrcid">{{ busyOrcid ? 'Saving…' : 'Save' }}</button>
      <small v-if="busyOrcid">Loading…</small>
      <p v-if="orcidMsg" class="msg ok">{{ orcidMsg }}</p>
      <p v-if="orcidErr" class="msg err">{{ orcidErr }}</p>

      <div class="row">
        <label>Badge</label>
        <input v-model.trim="badge" placeholder="e.g., Author" />
      </div>
      <button :disabled="busyBadge || !badge" @click="onAddBadge">{{ busyBadge ? 'Adding…' : 'Add badge' }}</button>
      <small v-if="busyBadge">Loading…</small>
      <p v-if="badgeMsg" class="msg ok">{{ badgeMsg }}</p>
      <p v-if="badgeErr" class="msg err">{{ badgeErr }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import { identity } from '@/api/endpoints';

const session = useSessionStore();

const open = ref(false);
const orcid = ref('');
const busyOrcid = ref(false);
const orcidMsg = ref('');
const orcidErr = ref('');

const badge = ref('');
const busyBadge = ref(false);
const badgeMsg = ref('');
const badgeErr = ref('');

async function onSaveOrcid() {
  const orcidRe = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
  if (!orcidRe.test(orcid.value)) { orcidErr.value = 'Invalid ORCID'; return; }
  busyOrcid.value = true; orcidErr.value=''; orcidMsg.value='';
  try {
    await identity.addORCID({ userId: session.userId, orcid: orcid.value });
    orcidMsg.value = 'ORCID saved';
    orcid.value = '';
  } catch (e: any) {
    orcidErr.value = e?.message ?? String(e);
  } finally {
    busyOrcid.value = false;
  }
}

async function onAddBadge() {
  busyBadge.value = true; badgeErr.value=''; badgeMsg.value='';
  try {
    await identity.addBadge({ userId: session.userId, badge: badge.value });
    badgeMsg.value = 'Badge added';
    badge.value = '';
  } catch (e: any) {
    badgeErr.value = e?.message ?? String(e);
  } finally {
    busyBadge.value = false;
  }
}
</script>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 8px; }
.toggle { width: max-content; padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; background: #f8fafc; }
.row { display: grid; grid-template-columns: 100px 1fr; gap: 8px; align-items: center; }
input { padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px; }
button { padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; background: #111827; color: white; }
.msg { font-size: 12px; margin: 0; }
.ok { color: #11683a; }
.err { color: #9b1c1c; }
</style>


