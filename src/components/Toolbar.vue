<template>
  <div class="menu-bar">
    <div class="menu-container">
      <!-- Left: Title & Episode Selector Section -->
      <div class="menu-logo-section">
        <span class="menu-title-brand">BDパネリング</span>
        <span class="brand-divider">/</span>
        <input 
          type="text" 
          v-model="store.projectTitle" 
          class="project-title-input" 
          title="プロジェクト名を変更" 
          placeholder="無題のプロジェクト" 
        />
        
        <span class="brand-divider">/</span>
        
        <div class="episode-selector-wrapper">
          <select v-model="store.activeEpisodeId" class="episode-select" title="エピソードを選択">
            <option v-for="ep in store.episodes" :key="ep.id" :value="ep.id">
              {{ ep.title }}
            </option>
          </select>
          <button @click="addNewEpisode" class="episode-icon-btn" title="エピソードを追加">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button @click="promptRenameEpisode" class="episode-icon-btn" title="エピソード名を変更">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon>
            </svg>
          </button>
          <button 
            @click="removeEpisode" 
            class="episode-icon-btn delete-btn" 
            :disabled="store.episodes.length <= 1" 
            title="エピソードを削除"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Center: Page Navigation -->
      <div class="menu-navigation">
        <button @click="prevPage" class="nav-btn" :disabled="isPrevDisabled" title="前のページ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <span class="nav-pages-label">{{ pageLabel }}</span>
        <button @click="nextPage" class="nav-btn" :disabled="isNextDisabled" title="次のページ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
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
          <button @click="exportFountain" class="menu-btn" title="エピソード脚本 (Markdown) を出力">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
            <span class="btn-label">脚本出力</span>
          </button>
          <button @click="exportJson" class="menu-btn" title="プロジェクト全体を保存">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span class="btn-label">保存 (.json)</span>
          </button>
          <button @click="triggerFileInput" class="menu-btn" title="プロジェクト全体を読み込み">
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
          <span>エピソード脚本 (.md) 出力</span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  store, 
  exportJson, 
  exportFountain, 
  importJson, 
  undo, 
  redo, 
  historyState,
  addEpisode,
  renameEpisode,
  deleteEpisode
} from '../store'

const props = defineProps({
  isSidebarOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-sidebar'])
const fileInput = ref(null)
const isMobileMenuOpen = ref(false)
const isMobileView = ref(false)

const canUndo = computed(() => historyState.currentIndex > 0)
const canRedo = computed(() => historyState.currentIndex < historyState.history.length - 1)

const checkMobile = () => {
  isMobileView.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
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

const pageLabel = computed(() => {
  const numPages = store.pages.length;
  if (numPages === 0) return 'P. --';
  
  if (isMobileView.value) {
    return `P. ${store.currentPageIndex + 1} / ${numPages}`;
  } else {
    const spreadIndex = store.currentSpreadIndex;
    let leftIdx = -1;
    let rightIdx = -1;

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

    const leftLabel = leftIdx >= 0 && leftIdx < numPages ? `${leftIdx + 1}` : '';
    const rightLabel = rightIdx >= 0 && rightIdx < numPages ? `${rightIdx + 1}` : '';
    
    if (leftLabel && rightLabel) {
      return `P. ${leftLabel} - ${rightLabel} / ${numPages}`;
    } else if (leftLabel) {
      return `P. ${leftLabel} / ${numPages}`;
    } else if (rightLabel) {
      return `P. ${rightLabel} / ${numPages}`;
    }
    return 'P. --';
  }
});

const prevPage = () => {
  if (isMobileView.value) {
    if (store.currentPageIndex > 0) store.currentPageIndex--;
  } else {
    if (store.currentSpreadIndex > 0) store.currentSpreadIndex--;
  }
};

const nextPage = () => {
  if (isMobileView.value) {
    if (store.currentPageIndex < store.pages.length - 1) store.currentPageIndex++;
  } else {
    if (store.currentSpreadIndex < maxSpreadIndex.value) store.currentSpreadIndex++;
  }
};

const isPrevDisabled = computed(() => {
  if (isMobileView.value) {
    return store.currentPageIndex === 0;
  } else {
    return store.currentSpreadIndex === 0;
  }
});

const isNextDisabled = computed(() => {
  if (isMobileView.value) {
    return store.currentPageIndex === store.pages.length - 1;
  } else {
    return store.currentSpreadIndex === maxSpreadIndex.value;
  }
});

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

// Episode Actions
const addNewEpisode = () => {
  const title = prompt("新しいエピソードの名前を入力してください:", `第${store.episodes.length + 1}話`);
  if (title && title.trim() !== "") {
    addEpisode(title.trim());
  }
};

const promptRenameEpisode = () => {
  const currentEp = store.episodes.find(e => e.id === store.activeEpisodeId);
  if (!currentEp) return;
  const newTitle = prompt("エピソード名を変更:", currentEp.title);
  if (newTitle && newTitle.trim() !== "") {
    renameEpisode(store.activeEpisodeId, newTitle.trim());
  }
};

const removeEpisode = () => {
  const currentEp = store.episodes.find(e => e.id === store.activeEpisodeId);
  if (!currentEp) return;
  if (confirm(`エピソード「${currentEp.title}」を削除しますか？\n（このエピソードのすべてのページとコマが削除されます）`)) {
    deleteEpisode(store.activeEpisodeId);
  }
};
</script>

<script>
// Prevent name clashes
export default {
  name: 'Toolbar'
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
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-logo-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.menu-title-brand {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--text-main) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  user-select: none;
  white-space: nowrap;
}

.brand-divider {
  color: var(--border-color);
  font-size: 1.1rem;
  font-weight: 300;
  user-select: none;
}

.project-title-input {
  background: transparent;
  border: none;
  font-size: 0.95rem;
  color: var(--text-main);
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  width: 140px;
  outline: none;
  transition: background 0.2s ease;
}

.project-title-input:hover, .project-title-input:focus {
  background: rgba(255, 255, 255, 0.05);
}

.episode-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.episode-select {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  max-width: 130px;
  padding-right: 0.5rem;
}

.episode-select option {
  background: #1e1e1e;
  color: var(--text-main);
}

.episode-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.episode-icon-btn:hover:not(:disabled) {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.08);
}

.episode-icon-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.episode-icon-btn.delete-btn:hover {
  color: #ff4a4a;
  background: rgba(255, 74, 74, 0.1);
}

.menu-navigation {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--border-color);
}

.nav-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-pages-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  min-width: 90px;
  text-align: center;
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
  border: 1px solid transparent;
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

/* Hide brand info and project name to make room for episode select on mobile */
@media (max-width: 900px) {
  .project-title-input, .brand-divider:nth-child(2) {
    display: none !important;
  }
}

@media (max-width: 600px) {
  .menu-title-brand, .brand-divider {
    display: none !important;
  }
}

/* Tablet Mode (width < 1024px) */
@media (max-width: 1023px) {
  .hide-tablet-mobile {
    display: none !important;
  }
  
  .hamburger-btn {
    display: flex;
  }
}

/* Mobile Mode (width < 768px) */
@media (max-width: 767px) {
  .hide-mobile {
    display: none !important;
  }
  
  .menu-container {
    padding: 0 0.5rem;
  }
  
  .btn-label {
    display: none;
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
