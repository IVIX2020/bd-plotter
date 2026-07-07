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
    
    <!-- Episode Settings Modal -->
    <div v-if="store.isSettingsModalOpen" class="modal-overlay" @click="store.isSettingsModalOpen = false">
      <div class="modal-card large-card" @click.stop>
        <div class="modal-header">
          <h3>エピソード設定 ({{ activeEpisode?.title }})</h3>
          <button class="modal-close-btn" @click="store.isSettingsModalOpen = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">エピソード名</label>
            <input type="text" v-model="activeEpisode.title" class="form-input-text" placeholder="エピソードのタイトル" />
          </div>
          
          <div class="form-section-title">登場人物の設定</div>
          
          <div class="form-row" v-if="activeEpisode?.metadata">
            <div class="form-col">
              <label class="form-label">主人公 (Protagonist)</label>
              <input type="text" v-model="activeEpisode.metadata.protagonist.name" class="form-input-text" placeholder="名前 (例: アレン)" />
              <div class="color-picker-label">表示色</div>
              <div class="color-picker-row">
                <button 
                  v-for="color in colorOptions" 
                  :key="'proto-' + color.value"
                  class="color-picker-btn" 
                  :style="{ backgroundColor: color.value }"
                  :class="{ active: activeEpisode.metadata.protagonist.color === color.value }"
                  @click="activeEpisode.metadata.protagonist.color = color.value"
                  :title="color.label"
                ></button>
                <button class="color-clear-btn" @click="activeEpisode.metadata.protagonist.color = ''" title="色をクリア">✕</button>
              </div>
            </div>
            
            <div class="form-col">
              <label class="form-label">キーパーソン (Key Person)</label>
              <input type="text" v-model="activeEpisode.metadata.keyPerson.name" class="form-input-text" placeholder="名前 (例: シズク)" />
              <div class="color-picker-label">表示色</div>
              <div class="color-picker-row">
                <button 
                  v-for="color in colorOptions" 
                  :key="'key-' + color.value"
                  class="color-picker-btn" 
                  :style="{ backgroundColor: color.value }"
                  :class="{ active: activeEpisode.metadata.keyPerson.color === color.value }"
                  @click="activeEpisode.metadata.keyPerson.color = color.value"
                  :title="color.label"
                ></button>
                <button class="color-clear-btn" @click="activeEpisode.metadata.keyPerson.color = ''" title="色をクリア">✕</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-save-btn" @click="store.isSettingsModalOpen = false">保存して閉じる</button>
        </div>
      </div>
    </div>

    <!-- Episode Reorder Modal -->
    <div v-if="store.isReorderModalOpen" class="modal-overlay" @click="store.isReorderModalOpen = false">
      <div class="modal-card mini-card" @click.stop>
        <div class="modal-header">
          <h3>エピソードの並び替え</h3>
          <button class="modal-close-btn" @click="store.isReorderModalOpen = false">✕</button>
        </div>
        <div class="modal-body scroll-body">
          <p class="modal-desc-text">エピソードの順序を上下の矢印ボタンで変更できます。</p>
          <div class="reorder-list">
            <div 
              v-for="(ep, idx) in store.episodes" 
              :key="ep.id" 
              class="reorder-item"
              :class="{ 'is-active-ep': ep.id === store.activeEpisodeId }"
            >
              <span class="reorder-title">{{ idx + 1 }}. {{ ep.title }}</span>
              <div class="reorder-actions">
                <button 
                  class="reorder-btn" 
                  @click="moveEpisode(idx, -1)" 
                  :disabled="idx === 0" 
                  title="上に移動"
                >▲</button>
                <button 
                  class="reorder-btn" 
                  @click="moveEpisode(idx, 1)" 
                  :disabled="idx === store.episodes.length - 1" 
                  title="下に移動"
                >▼</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-save-btn" @click="store.isReorderModalOpen = false">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, activeEpisode, moveEpisode, undo, redo } from './store'
import Toolbar from './components/Toolbar.vue'
import Page from './components/Page.vue'
import ScriptEditor from './components/ScriptEditor.vue'
import Timeline from './components/Timeline.vue'

const colorOptions = [
  { value: '#3b82f6', label: '青' },
  { value: '#10b981', label: '緑' },
  { value: '#ef4444', label: '赤' },
  { value: '#f97316', label: '橙' },
  { value: '#8b5cf6', label: '紫' },
  { value: '#eab308', label: '黄' }
]

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
