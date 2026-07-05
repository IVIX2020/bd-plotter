<template>
  <div :class="['toolbar', { 'is-collapsed': !store.isToolbarOpen }]">
    <!-- Gear Toggle Button -->
    <button @click="store.isToolbarOpen = !store.isToolbarOpen" class="tool-btn toggle-btn" :title="store.isToolbarOpen ? 'ツールバーを閉じる' : 'ツールバーを開く'">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>

    <div v-show="store.isToolbarOpen" class="divider"></div>

    <template v-if="store.isToolbarOpen">
      <button @click="undo" class="tool-btn" :disabled="!canUndo" title="元に戻す (Ctrl+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v6h6"></path>
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3l-3 2.7"></path>
        </svg>
      </button>
      <button @click="redo" class="tool-btn" :disabled="!canRedo" title="やり直す (Ctrl+Shift+Z)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 7v6h-6"></path>
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
        </svg>
      </button>
      <div class="divider"></div>

      <button @click="$emit('toggle-sidebar')" class="tool-btn" title="Fountainプレビューを開く">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>プレビュー</span>
      </button>
      <div class="divider"></div>
      <div class="control-group">
        <label>コマ間隔</label>
        <input type="range" v-model="store.rowGap" min="0" max="40">
      </div>
      <div class="divider"></div>
      <button @click="exportFountain" class="tool-btn" title="Markdownを出力">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <span>Markdown出力</span>
      </button>
      <button @click="exportJson" class="tool-btn" title="データを保存">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>保存 (.json)</span>
      </button>
      <button @click="triggerFileInput" class="tool-btn" title="データを読み込む">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <span>読込</span>
      </button>
    </template>
    <input type="file" ref="fileInput" @change="onFileChange" accept=".json" style="display: none;" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store, exportJson, exportFountain, importJson, undo, redo, historyState } from '../store'

const emit = defineEmits(['toggle-sidebar'])
const fileInput = ref(null)

const canUndo = computed(() => historyState.currentIndex > 0)
const canRedo = computed(() => historyState.currentIndex < historyState.history.length - 1)

const triggerFileInput = () => {
  fileInput.value.click()
}

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    importJson(file)
  }
  e.target.value = ''
}
</script>

<style scoped>
.tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.tool-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.toggle-btn {
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}
.toggle-btn:hover {
  transform: rotate(45deg);
}
.divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 8px;
}
</style>
