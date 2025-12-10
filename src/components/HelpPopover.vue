<template>
  <div class="help-popover-wrapper" ref="wrapper">
    <button
      type="button"
      class="help-trigger"
      @click.stop="toggle"
      :aria-pressed="open ? 'true' : 'false'"
    >
      <span class="help-icon">?</span>
      <span v-if="label" class="help-label">{{ label }}</span>
    </button>
    <div
      v-if="open"
      class="help-popover"
      :class="alignClass"
      @click.stop
    >
      <div v-if="title" class="help-title">
        {{ title }}
      </div>
      <div class="help-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

const props = defineProps<{
  label?: string;
  title?: string;
  align?: "left" | "right" | "center";
}>();

const open = ref(false);
const wrapper = ref<HTMLElement | null>(null);

const alignClass = computed(() => {
  const a = props.align ?? "right";
  return `align-${a}`;
});

function toggle() {
  open.value = !open.value;
}

function onClickOutside(e: MouseEvent) {
  if (!open.value) return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  if (wrapper.value && !wrapper.value.contains(target)) {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onClickOutside);
});
</script>

<style scoped>
.help-popover-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.help-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  color: var(--muted);
}

.help-trigger:hover .help-icon,
.help-trigger:hover .help-label {
  color: var(--brand);
}

.help-icon {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  line-height: 1;
  background: #fff;
}

.help-label {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.help-popover {
  position: absolute;
  top: 120%;
  z-index: 40;
  min-width: 220px;
  max-width: 380px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
  font-size: 12px;
  color: var(--text);
  line-height: 1.45;
}

.help-popover.align-right {
  right: 0;
}

.help-popover.align-left {
  left: 0;
}

.help-popover.align-center {
  left: 50%;
  transform: translateX(-50%);
}

.help-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.help-body p {
  margin: 0 0 6px;
}

.help-body p:last-child {
  margin-bottom: 0;
}

.help-body ul {
  padding-left: 16px;
  margin: 0;
}

.help-body li + li {
  margin-top: 4px;
}
</style>


