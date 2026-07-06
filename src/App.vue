<template>
  <div class="app-container">
    <Toolbar :isSidebarOpen="isSidebarOpen" @toggle-sidebar="toggleSidebar" />

    <div class="workspace">
      <div class="spread-wrapper">
        <template v-if="!isMobileView">
          <div class="page-slot left-page">
            <Page v-if="currentSpreadPages[0]" :pageIndex="currentSpreadPages[0].index" position-type="left" />
          </div>
          <div class="page-slot right-page">
            <Page v-if="currentSpreadPages[1]" :pageIndex="currentSpreadPages[1].index" position-type="right" />
          </div>
        </template>
        <template v-else>
          <div class="page-slot single-page">
            <Page v-if="store.pages[store.currentPageIndex]" :pageIndex="store.currentPageIndex" position-type="single" />
          </div>
        </template>
      </div>
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
const isMobileView = ref(false)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

const checkMobile = () => {
  isMobileView.value = window.innerWidth < 768
}

const handleKeydown = (e) => {
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
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', checkMobile);
})

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
