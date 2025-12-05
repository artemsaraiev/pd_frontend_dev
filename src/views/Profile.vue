<template>
  <div class="profile-page">
    <section class="card">
      <header class="header">
        <h2 class="title">Your profile</h2>
        <p class="subtitle">
          Manage how you appear in discussions. ORCID and badges are shown next to
          your threads and replies.
        </p>
      </header>
      <div class="identity-wrapper">
        <IdentityPanel />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import IdentityPanel from "@/components/IdentityPanel.vue";
</script>

<style scoped>
.profile-page {
  max-width: 720px;
  margin: 0 auto;
  padding-top: 8px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  padding: 24px 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.header {
  margin-bottom: 20px;
}

.title {
  margin: 0 0 6px 0;
  font-family: var(--font-serif);
  font-size: 26px;
  color: var(--brand);
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--muted);
}

.identity-wrapper {
  margin-top: 8px;
}
</style>


