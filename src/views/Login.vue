<template>
  <div class="page">
    <h2>{{ mode === 'login' ? 'Sign in' : 'Register' }}</h2>
    <form class="card form" @submit.prevent="mode === 'login' ? loginUser() : registerUser()">
      <label>
        <div>MIT Email</div>
        <input v-model.trim="username" placeholder="your_email@mit.edu" type="email" />
        <small class="hint">Only @mit.edu emails are allowed</small>
      </label>
      <label>
        <div>Password</div>
        <input v-model.trim="password" placeholder="password" type="password" />
      </label>
      <button class="primary" :disabled="!username || !password || !isValidMitEmail">
        {{ mode === 'login' ? 'Sign in' : 'Register' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
      <p v-if="success" class="success">{{ success }}</p>
      <button type="button" class="ghost" @click="toggleMode">
        {{ mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in' }}
      </button>
    </form>
  </div>
  </template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { session } from '@/api/endpoints';
import { useSessionStore } from '@/stores/session';

const store = useSessionStore();
const mode = ref<'login' | 'register'>('login');
const username = ref('');
const password = ref('');
const error = ref('');
const success = ref('');

const isValidMitEmail = computed(() => /@mit\.edu$/i.test(username.value));

function toggleMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
  success.value = '';
}

async function registerUser() {
  error.value = '';
  success.value = '';
  if (!isValidMitEmail.value) {
    error.value = 'Please use an @mit.edu email address';
    return;
  }
  try {
    const res = await session.register({ username: username.value, password: password.value });
    if ('error' in res) throw new Error(res.error);
    success.value = 'Registration successful! You can now sign in.';
    mode.value = 'login';
  } catch (e: any) {
    error.value = String(e?.message ?? 'Failed to register');
  }
}

async function loginUser() {
  error.value = '';
  success.value = '';
  try {
    const res = await session.login({ username: username.value, password: password.value });
    if ('error' in res) throw new Error(res.error);
    store.setSession(username.value, res.session);
    window.location.assign('/');
  } catch (e: any) {
    error.value = String(e?.message ?? 'Failed to sign in');
  }
}
</script>

<style scoped>
.form { display: grid; gap: 12px; max-width: 360px; }
label { display: grid; gap: 6px; }
input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; }
.hint { color: #666; font-size: 12px; margin-top: -4px; }
.error { color: var(--error); }
.success { color: var(--ok); }
.card { border: 1px solid var(--border); border-radius: 8px; background: #fff; padding: 12px 16px; }
.primary { background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 6px; padding: 6px 10px; }
.ghost { background: #fff; color: var(--brand); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; }
</style>


