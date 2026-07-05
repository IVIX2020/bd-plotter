<template>
  <div class="app-container">
    <header>
      <h1>BDパネリング</h1>
    </header>

    <Toolbar @toggle-sidebar="toggleSidebar" />

    <div class="workspace">
      <div class="spread-wrapper">
        <div class="page-slot left-page">
          <Page v-if="currentSpreadPages[0]" :pageIndex="currentSpreadPages[0].index" />
        </div>
        <div class="page-slot right-page">
          <Page v-if="currentSpreadPages[1]" :pageIndex="currentSpreadPages[1].index" />
        </div>
      </div>
      
      <!-- Navigation Arrows -->
      <button 
        class="nav-arrow prev-arrow" 
        v-if="store.currentSpreadIndex > 0" 
        @click="store.currentSpreadIndex--"
        title="前の見開き"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button 
        class="nav-arrow next-arrow" 
        v-if="store.currentSpreadIndex < maxSpreadIndex" 
        @click="store.currentSpreadIndex++"
        title="次の見開き"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>

    <Timeline />

    <ScriptEditor :isOpen="isSidebarOpen" @update:isOpen="isSidebarOpen = $event" />
    
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, undo, redo } from './store'
import Toolbar from './components/Toolbar.vue'
import Page from './components/Page.vue'
import ScriptEditor from './components/ScriptEditor.vue'
import Timeline from './components/Timeline.vue'

const isSidebarOpen = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

const handleKeydown = (e) => {
  // Prevent tracking undo/redo if typing inside a textarea, unless it's a global undo
  // Actually, standard textarea has its own undo. 
  // We will let the browser handle textarea undo when focused.
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
    return;
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    } else if (e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
})

const maxSpreadIndex = computed(() => {
  const numPages = store.pages.length;
  if (numPages === 0) return 0;
  if (store.firstPageIsSingle) {
    return Math.ceil((numPages - 1) / 2);
  } else {
    return Math.ceil(numPages / 2) - 1;
  }
});

const currentSpreadPages = computed(() => {
  const spreadIndex = store.currentSpreadIndex;
  let leftIdx = -1;
  let rightIdx = -1;

  // Assuming BD left-to-right reading direction:
  // If first page is single, it's the right-hand page (like opening a cover).
  if (store.firstPageIsSingle) {
    if (spreadIndex === 0) {
      rightIdx = 0;
    } else {
      leftIdx = spreadIndex * 2 - 1;
      rightIdx = spreadIndex * 2;
    }
  } else {
    leftIdx = spreadIndex * 2;
    rightIdx = spreadIndex * 2 + 1;
  }

  const pages = store.pages;
  return [
    leftIdx >= 0 && leftIdx < pages.length ? { index: leftIdx } : null,
    rightIdx >= 0 && rightIdx < pages.length ? { index: rightIdx } : null
  ];
});
</script>
