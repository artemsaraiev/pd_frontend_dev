<template>
  <div class="annotate-test">
    <div class="toolbar">
      <h2>Annotation Test: {{ paperId }}</h2>
      <div class="colors">
        <button 
          v-for="color in colors" 
          :key="color.value"
          :style="{ backgroundColor: color.value }"
          :class="{ active: selectedColor === color.value }"
          @click="selectedColor = color.value"
          class="color-btn"
        ></button>
      </div>
      <div class="zoom">
        <button @click="zoomOut">−</button>
        <span>{{ Math.round(zoom * 100) }}%</span>
        <button @click="zoomIn">+</button>
      </div>
    </div>
    <div class="pdf-container">
      <!-- Source hidden as per user feedback about "box" -->
      <!-- <div style="padding: 5px; font-size: 10px; color: #999;">Source: {{ pdfUrl }}</div> -->
      
      <!-- We will reimplement/use a modular PDF viewer here -->
      <PdfAnnotator 
        :src="pdfUrl" 
        :active-color="selectedColor"
        :zoom="zoom"
        @highlight="onHighlight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import PdfAnnotator from '../components/PdfAnnotator.vue';

const route = useRoute();
const paperId = computed(() => route.params.id as string);

// Use backend proxy to avoid CORS with arXiv
const pdfUrl = computed(() => `http://localhost:8000/api/pdf/${paperId.value}`);

const colors = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#a5d6a7' },
  { name: 'Blue', value: '#90caf9' },
  { name: 'Red', value: '#ef9a9a' },
  { name: 'Purple', value: '#ce93d8' },
];

const selectedColor = ref(colors[0].value);
const zoom = ref(1);

console.log('AnnotateTest mounted. Paper ID:', paperId.value);

function onHighlight(h: any) {
  console.log('Created highlight', h);
}

function zoomIn() {
  zoom.value = Math.min(3, zoom.value + 0.1);
}

function zoomOut() {
  zoom.value = Math.max(0.5, zoom.value - 0.1);
}
</script>

<style scoped>
.annotate-test {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.toolbar {
  padding: 10px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  z-index: 10;
}

.colors {
  display: flex;
  gap: 8px;
}

.color-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s;
}

.color-btn:hover {
  transform: scale(1.1);
}

.color-btn.active {
  border-color: #333;
}

.pdf-container {
  flex: 1;
  overflow: auto;
  background: #f5f5f5;
  position: relative;
}
</style>
