<template>
  <div class="profile-page">
    <!-- Sign-in prompt for non-authenticated users -->
    <div v-if="!isLoggedIn" class="auth-guard">
      <div class="auth-message">Sign in to view Profile</div>
      <button class="sign-in-button" @click="goLogin">Sign in</button>
    </div>

    <!-- Main content for authenticated users -->
    <section v-else class="card">
      <header class="header">
        <h2 class="title">Your profile</h2>
      </header>

      <div class="profile-display">
        <img
          src="@/assets/images/profile.png"
          alt="Profile"
          class="profile-avatar"
        />
        <div class="profile-text">
          <div class="profile-username">{{ displayName || "User" }}</div>
          <button class="sign-out-button" @click="logout">Sign out</button>
        </div>
      </div>

      <div class="identity-wrapper">
        <IdentityPanel />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import IdentityPanel from "@/components/IdentityPanel.vue";
import { useSessionStore } from "@/stores/session";
import { session } from "@/api/endpoints";
import { getUsernameById } from "@/utils/usernameCache";

const displayName = ref<string>("");

let store: ReturnType<typeof useSessionStore>;
try {
  store = useSessionStore();
} catch {
  /* during HMR pinia may not be active yet */
}

const isLoggedIn = computed(() => !!store?.token);

function goLogin() {
  window.location.assign("/login");
}

// Fetch and display the username
onMounted(async () => {
  if (store?.userId && store?.token) {
    try {
      const username = await getUsernameById(store.userId);
      displayName.value = username;
    } catch (e) {
      console.error("Failed to fetch username for display:", e);
      displayName.value = store.userId;
    }
  }
});

async function logout() {
  if (store?.token) {
    try {
      await session.logout({ session: store.token });
    } catch {}
  }
  store?.clear?.();
  window.location.assign("/");
}
</script>

<style scoped>
.auth-guard {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: 400px;
  padding: 60px 20px;
}

.auth-message {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  font-family: var(--font-serif);
  text-align: center;
}

.sign-in-button {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 14px 32px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-in-button:hover {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}

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
  margin: 0;
  font-family: var(--font-serif);
  font-size: 26px;
  color: var(--brand);
}

.identity-wrapper {
  margin-top: 8px;
}

.profile-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 32px 24px;
  margin-bottom: 28px;
  border-radius: 12px;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
  border: 1px solid var(--border);
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid var(--brand);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.profile-username {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  font-family: var(--font-serif);
  text-align: center;
}

.sign-out-button {
  background: var(--brand);
  color: #fff;
  border: 1.5px solid var(--brand);
  border-radius: 8px;
  padding: 10px 24px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sign-out-button:hover {
  background: #9a1717;
  border-color: #9a1717;
  box-shadow: 0 4px 12px rgba(179, 27, 27, 0.3);
  transform: translateY(-1px);
}
</style>
