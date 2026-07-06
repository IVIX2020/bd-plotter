<template>
  <div class="app-container">
    <Toolbar :isSidebarOpen="isSidebarOpen" @toggle-sidebar="toggleSidebar" />

    <div class="workspace">
      <div class="spread-wrapper">
        <template v-if="!isMobileView">
          <div class="page-slot left-page">
            <Page v-if="currentSpreadPages[0]" :pageIndex="currentSpreadPages[0].index" />
          </div>
          <div class="page-slot right-page">
            <Page v-if="currentSpreadPages[1]" :pageIndex="currentSpreadPages[1].index" />
          </div>
        </template>
        <template v-else>
          <div class="page-slot single-page">
            <Page v-if="store.pages[currentPageIndex]" :pageIndex="currentPageIndex" />
          </div>
        </template>
      </div>
      
      <!-- Navigation Arrows -->
      <button 
        class="nav-arrow prev-arrow" 
        v-if="!isMobileView ? store.currentSpreadIndex > 0 : currentPageIndex > 0" 
        @click="!isMobileView ? store.currentSpreadIndex-- : currentPageIndex--"
        :title="!isMobileView ? '前の見開き' : '前のページ'"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button 
        class="nav-arrow next-arrow" 
        v-if="!isMobileView ? store.currentSpreadIndex < maxSpreadIndex : currentPageIndex < store.pages.length - 1" 
        @click="!isMobileView ? store.currentSpreadIndex++ : currentPageIndex++"
        :title="!isMobileView ? '次の見開き' : '次のページ'"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { store, undo, redo } from './store'
import Toolbar from './components/Toolbar.vue'
import Page from './components/Page.vue'
import ScriptEditor from './components/ScriptEditor.vue'
import Timeline from './components/Timeline.vue'

const isSidebarOpen = ref(false)
const isMobileView = ref(false)
const currentPageIndex = ref(0)

function toggleSidebar() {
  isSidebarOpen.value = !isSidebarOpen.value
}

const checkMobile = () => {
  const mobile = window.innerWidth < 768
  if (mobile !== isMobileView.value) {
    isMobileView.value = mobile
    if (mobile) {
      // Sync from currentSpreadIndex to currentPageIndex when entering mobile
      if (store.firstPageIsSingle) {
        currentPageIndex.value = store.currentSpreadIndex === 0 ? 0 : store.currentSpreadIndex * 2 - 1
      } else {
        currentPageIndex.value = store.currentSpreadIndex * 2
      }
    }
  }
}

// Watch for spread index changes to update mobile page index
watch(() => store.currentSpreadIndex, (newSpreadIdx) => {
  if (!isMobileView.value) return
  if (store.firstPageIsSingle) {
    currentPageIndex.value = newSpreadIdx === 0 ? 0 : newSpreadIdx * 2 - 1
  } else {
    currentPageIndex.value = newSpreadIdx * 2
  }
})

// Watch for mobile page index changes to update spread index
watch(currentPageIndex, (newPageIdx) => {
  if (!isMobileView.value) return
  if (store.firstPageIsSingle) {
    store.currentSpreadIndex = newPageIdx === 0 ? 0 : Math.ceil((newPageIdx - 1) / 2)
  } else {
    store.currentSpreadIndex = Math.floor(newPageIdx / 2)
  }
})

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
