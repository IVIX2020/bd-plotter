<template>
  <div class="menu-bar">
    <div class="menu-container">
      <!-- Left: Title Section -->
      <div class="menu-logo-section">
        <span class="menu-title">BDパネリング</span>
      </div>

      <!-- Right: Main Actions Row -->
      <div class="menu-actions-row">
        <!-- Undo/Redo: Always visible for quick editing access -->
        <div class="menu-group undo-redo-group">
          <button @click="undo" class="menu-btn" :disabled="!canUndo" title="元に戻す (Ctrl+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3l-3 2.7"></path>
            </svg>
            <span class="btn-label">元に戻す</span>
          </button>
          <button @click="redo" class="menu-btn" :disabled="!canRedo" title="やり直す (Ctrl+Shift+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
            </svg>
            <span class="btn-label">やり直す</span>
          </button>
        </div>

        <div class="menu-divider hide-mobile"></div>

        <!-- Timeline Toggle (Desktop/Tablet) -->
        <button @click="store.isTimelineOpen = !store.isTimelineOpen" class="menu-btn hide-mobile" :class="{ 'is-active': store.isTimelineOpen }" title="ページ一覧を開く">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          <span class="btn-label">ページ一覧</span>
        </button>

        <!-- Preview Toggle (Desktop/Tablet) -->
        <button @click="toggleSidebarAndCloseMobileMenu" class="menu-btn hide-mobile" :class="{ 'is-active': isSidebarOpen }" title="Fountainプレビューを開く">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="btn-label">プレビュー</span>
        </button>

        <div class="menu-divider hide-tablet-mobile"></div>

        <!-- Gap Slider (Desktop/Tablet) -->
        <div class="menu-group control-group hide-mobile">
          <label class="control-label">コマ間隔</label>
          <input type="range" v-model="store.rowGap" min="0" max="40" class="gap-range">
          <span class="gap-value">{{ store.rowGap }}px</span>
        </div>

        <div class="menu-divider hide-tablet-mobile"></div>

        <!-- JSON/Markdown Actions (Desktop only) -->
        <div class="menu-group actions-group hide-tablet-mobile">
          <button @click="exportFountain" class="menu-btn" title="Markdownを出力">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span class="btn-label">Markdown出力</span>
          </button>
          <button @click="exportJson" class="menu-btn" title="データを保存">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="btn-label">保存 (.json)</span>
          </button>
          <button @click="triggerFileInput" class="menu-btn" title="データを読み込む">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span class="btn-label">読込</span>
          </button>
        </div>

        <!-- Hamburger Icon for Mobile & Tablet Dropdown -->
        <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="menu-btn hamburger-btn" :title="isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'">
          <svg v-if="!isMobileMenuOpen" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Dropdown Menu -->
    <transition name="slide-fade">
      <div v-if="isMobileMenuOpen" class="mobile-dropdown">
        <!-- Timeline (Mobile view only) -->
        <button @click="handleMobileAction(() => store.isTimelineOpen = !store.isTimelineOpen)" class="mobile-menu-item show-on-mobile-only" :class="{ 'is-active': store.isTimelineOpen }" title="ページ一覧を開く">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
          <span>ページ一覧</span>
        </button>

        <!-- Preview (Shown here for mobile only) -->
        <button @click="toggleSidebarAndCloseMobileMenu" class="mobile-menu-item show-on-mobile-only" :class="{ 'is-active': isSidebarOpen }" title="Fountainプレビューを開く">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Fountainプレビュー</span>
        </button>

        <div class="mobile-divider show-on-mobile-only"></div>

        <!-- Gap Control (Mobile view only) -->
        <div class="mobile-menu-item control-group show-on-mobile-only">
          <div class="mobile-control-label">
            <span>コマ間隔</span>
            <span class="gap-value">{{ store.rowGap }}px</span>
          </div>
          <input type="range" v-model="store.rowGap" min="0" max="40" class="gap-range mobile-range">
        </div>

        <div class="mobile-divider show-on-mobile-only"></div>

        <!-- File actions (Shown for tablet & mobile here) -->
        <button @click="handleMobileAction(exportFountain)" class="mobile-menu-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="12" y1="18" x2="12" y2="12"></line>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <span>Markdown出力</span>
        </button>
        <button @click="handleMobileAction(exportJson)" class="mobile-menu-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span>保存 (.json)</span>
        </button>
        <button @click="handleMobileAction(triggerFileInput)" class="mobile-menu-item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>読込</span>
        </button>
      </div>
    </transition>

    <input type="file" ref="fileInput" @change="onFileChange" accept=".json" style="display: none;" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { store, exportJson, exportFountain, importJson, undo, redo, historyState } from '../store'

const props = defineProps({
  isSidebarOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-sidebar'])
const fileInput = ref(null)
const isMobileMenuOpen = ref(false)

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

const toggleSidebarAndCloseMobileMenu = () => {
  emit('toggle-sidebar')
  isMobileMenuOpen.value = false
}

const handleMobileAction = (actionFn) => {
  actionFn()
  isMobileMenuOpen.value = false
}
</script>

<style scoped>
.menu-bar {
  width: 100%;
  height: 60px;
  background: rgba(30, 30, 30, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  z-index: 1000;
  position: relative;
  flex-shrink: 0;
}

.menu-container {
  width: 100%;
  max-width: 100%;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-logo-section {
  display: flex;
  align-items: center;
}

.menu-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--text-main) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  user-select: none;
}

.menu-actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 0.5rem;
}

.menu-btn {
  background: transparent;
  border: 1px solid transparent; /* Prevent layout shift on active state */
  cursor: pointer;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  color: var(--text-main);
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.menu-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent);
  box-shadow: 0 0 12px rgba(140, 136, 240, 0.15);
}

.menu-btn.is-active {
  background: rgba(140, 136, 240, 0.15) !important;
  color: var(--accent) !important;
  border: 1px solid rgba(140, 136, 240, 0.3) !important;
  box-shadow: 0 0 10px rgba(140, 136, 240, 0.25);
}

.menu-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.control-label {
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.gap-range {
  accent-color: var(--accent);
  cursor: pointer;
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
}

.gap-value {
  color: var(--accent);
  font-weight: bold;
  font-size: 0.85rem;
  min-width: 35px;
}

/* Hamburger button rules */
.hamburger-btn {
  display: none;
  padding: 0.5rem;
  justify-content: center;
  align-items: center;
}

/* Mobile Dropdown styling */
.mobile-dropdown {
  position: absolute;
  top: 60px;
  left: 0;
  right: 0;
  background: rgba(25, 25, 25, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-lg);
  z-index: 999;
}

.mobile-menu-item {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-main);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.2s ease;
  font-weight: 500;
}

.mobile-menu-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--accent);
}

.mobile-menu-item.is-active {
  background: rgba(140, 136, 240, 0.15) !important;
  color: var(--accent) !important;
  border: 1px solid rgba(140, 136, 240, 0.3) !important;
}

.mobile-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.25rem 0;
}

.mobile-control-label {
  display: flex;
  justify-content: space-between;
  width: 100%;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.mobile-range {
  width: 100% !important;
}

/* Animation for dropdown */
.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Responsive Rules */

/* Tablet Mode (width < 1024px) */
@media (max-width: 1023px) {
  .hide-tablet-mobile {
    display: none !important;
  }
  
  .hamburger-btn {
    display: flex; /* Hamburger contains Markdown, Save, Load */
  }
}

/* Mobile Mode (width < 768px) */
@media (max-width: 767px) {
  .hide-mobile {
    display: none !important;
  }
  
  .menu-container {
    padding: 0 1rem;
  }
  
  .menu-title {
    font-size: 1.1rem;
  }
  
  .btn-label {
    display: none; /* Hide labels for Undo/Redo to only show icons */
  }
  
  .menu-btn {
    padding: 0.5rem;
  }
}

/* Helper rules */
.show-on-mobile-only {
  display: none;
}
@media (max-width: 767px) {
  .show-on-mobile-only {
    display: flex;
  }
}
</style>
