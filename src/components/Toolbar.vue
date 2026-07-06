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
          
          <!-- Unified Episode Actions Menu -->
          <div class="episode-menu-container">
            <button @click="toggleEpisodeMenu" class="episode-icon-btn menu-trigger-btn" title="エピソード管理">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#888888">
                <circle cx="12" cy="12" r="2"></circle>
                <circle cx="12" cy="5" r="2"></circle>
                <circle cx="12" cy="19" r="2"></circle>
              </svg>
            </button>
            <div v-if="isEpisodeMenuOpen" class="episode-context-menu" @click.stop>
              <!-- Page Start Position Toggle -->
              <button @click="toggleFirstPageIsSingle" class="context-menu-item toggle-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline v-if="store.firstPageIsSingle" points="20 6 9 17 4 12"></polyline>
                  <rect v-else x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                <span>扉絵から始める (1P目を右)</span>
              </button>
              
              <div class="context-menu-divider"></div>

              <button @click="addNewEpisode" class="context-menu-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                エピソードを追加
              </button>
              <button @click="duplicateActiveEpisode" class="context-menu-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                エピソードを複製
              </button>
              <button @click="promptRenameEpisode" class="context-menu-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="16 3 21 8 8 21 3 21 3 16 16 3"></polygon>
                </svg>
                エピソード名の変更
              </button>
              <div class="context-menu-divider"></div>
              <button 
                @click="removeEpisode" 
                class="context-menu-item delete-item" 
                :disabled="store.episodes.length <= 1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                エピソードを削除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Page Navigation & Page Insertion -->
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
        <div class="nav-divider"></div>
        <button @click="addNewPage" class="nav-btn add-page-btn" title="ページを追加">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      <!-- Right: Main Actions Row -->
      <div class="menu-actions-row">
        <!-- Undo/Redo: Always visible for quick editing access -->
        <div class="menu-group undo-redo-group">
          <button @click="undo" class="menu-btn" :disabled="!canUndo" title="元に戻す (Ctrl+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v6h6"></path>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3l-3 2.7"></path>
            </svg>
          </button>
          <button @click="redo" class="menu-btn" :disabled="!canRedo" title="やり直す (Ctrl+Shift+Z)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 7v6h-6"></path>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"></path>
            </svg>
          </button>
        </div>

        <div class="menu-divider"></div>

        <!-- Layout Controls / Views -->
        <div class="menu-group view-group">
          <!-- Timeline Toggle -->
          <button @click="store.isTimelineOpen = !store.isTimelineOpen" class="menu-btn" :class="{ 'is-active': store.isTimelineOpen }" title="ページ一覧">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
          </button>

          <!-- Preview Toggle -->
          <button @click="toggleSidebarAndCloseMobileMenu" class="menu-btn" :class="{ 'is-active': isSidebarOpen }" title="Fountainプレビュー">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </button>
        </div>

        <div class="menu-divider hide-mobile"></div>

        <!-- Gap Slider -->
        <div class="menu-group control-group hide-mobile">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="control-icon" title="コマ間隔">
            <line x1="4" y1="9" x2="20" y2="9"></line>
            <line x1="4" y1="15" x2="20" y2="15"></line>
            <line x1="10" y1="3" x2="10" y2="21"></line>
          </svg>
          <input type="range" v-model="store.rowGap" min="0" max="40" class="gap-range">
          <span class="gap-value">{{ store.rowGap }}px</span>
        </div>

        <div class="menu-divider"></div>

        <!-- JSON/Markdown Actions & Reset Project -->
        <div class="menu-group actions-group">
          <!-- Reset Project -->
          <button @click="handleResetProject" class="menu-btn reset-btn" title="プロジェクトをリセット (最初からやり直す)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <polyline points="3 3 3 8 8 8"></polyline>
            </svg>
          </button>
          
          <button @click="triggerFileInput" class="menu-btn" title="プロジェクトを読込">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </button>

          <button @click="exportJson" class="menu-btn" title="プロジェクトを保存 (.json)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>

          <button @click="exportFountain" class="menu-btn markdown-btn" title="脚本を出力 (.md)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

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
  deleteEpisode,
  addPage,
  resetProject,
  duplicateEpisode
} from '../store'

const props = defineProps({
  isSidebarOpen: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-sidebar'])
const fileInput = ref(null)
const isMobileMenuOpen = ref(false)
const isMobileView = ref(false)
const isEpisodeMenuOpen = ref(false)

const canUndo = computed(() => historyState.currentIndex > 0)
const canRedo = computed(() => historyState.currentIndex < historyState.history.length - 1)

const checkMobile = () => {
  isMobileView.value = window.innerWidth < 768
}

const toggleEpisodeMenu = (e) => {
  e.stopPropagation()
  isEpisodeMenuOpen.value = !isEpisodeMenuOpen.value
}

const closeEpisodeMenu = () => {
  isEpisodeMenuOpen.value = false
}

const handleWindowClick = () => {
  closeEpisodeMenu()
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('click', handleWindowClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('click', handleWindowClick)
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

// Page insertion via toolbar
const addNewPage = () => {
  addPage();
  store.currentPageIndex = store.pages.length - 1;
};

// Reset Project Action with initial page count specification
const handleResetProject = () => {
  if (confirm("プロジェクトを完全にリセットして、最初からやり直しますか？\n（保存していない変更内容はすべて失われます）")) {
    const pagesStr = prompt("初期エピソードのページ数を入力してください:", "4");
    if (pagesStr === null) return; // User cancelled
    const pageCount = parseInt(pagesStr, 10);
    if (isNaN(pageCount) || pageCount < 1) {
      alert("ページ数は1以上の数値を入力してください。");
      return;
    }
    resetProject(pageCount);
  }
};

// Toggle start position of pages (First page cover vs Left-page start spread)
const toggleFirstPageIsSingle = (e) => {
  e?.stopPropagation();
  store.firstPageIsSingle = !store.firstPageIsSingle;
};

// Episode Actions
const addNewEpisode = (e) => {
  e?.stopPropagation();
  closeEpisodeMenu();
  const title = prompt("新しいエピソードの名前を入力してください:", `第${store.episodes.length + 1}話`);
  if (!title || title.trim() === "") return;

  const pagesStr = prompt(`エピソード「${title.trim()}」の初期ページ数を入力してください:`, "4");
  if (pagesStr === null) return; // User cancelled
  const pageCount = parseInt(pagesStr, 10);
  if (isNaN(pageCount) || pageCount < 1) {
    alert("ページ数は1以上の数値を入力してください。");
    return;
  }

  addEpisode(title.trim(), pageCount);
};

const duplicateActiveEpisode = (e) => {
  e?.stopPropagation();
  closeEpisodeMenu();
  duplicateEpisode(store.activeEpisodeId);
};

const promptRenameEpisode = (e) => {
  e?.stopPropagation();
  closeEpisodeMenu();
  const currentEp = store.episodes.find(e => e.id === store.activeEpisodeId);
  if (!currentEp) return;
  const newTitle = prompt("エピソード名を変更:", currentEp.title);
  if (newTitle && newTitle.trim() !== "") {
    renameEpisode(store.activeEpisodeId, newTitle.trim());
  }
};

const removeEpisode = (e) => {
  e?.stopPropagation();
  closeEpisodeMenu();
  const currentEp = store.episodes.find(e => e.id === store.activeEpisodeId);
  if (!currentEp) return;
  if (confirm(`エピソード「${currentEp.title}」を削除しますか？\n（このエピソードのすべてのページとコマが削除されます）`)) {
    deleteEpisode(store.activeEpisodeId);
  }
};
</script>

<script>
export default {
  name: 'Toolbar'
}
</script>

<style scoped>
.menu-bar {
  width: 100%;
  height: 60px;
  background: rgba(22, 22, 22, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  z-index: 1000;
  position: relative;
  flex-shrink: 0;
}

.menu-container {
  width: 100%;
  max-width: 100%;
  padding: 0 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.menu-logo-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.menu-title-brand {
  font-size: 1.05rem;
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
  font-size: 1.05rem;
  font-weight: 300;
  user-select: none;
}

.project-title-input {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  color: var(--text-main);
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  width: 120px;
  outline: none;
  transition: background 0.2s ease;
}

.project-title-input:hover, .project-title-input:focus {
  background: rgba(255, 255, 255, 0.05);
}

.episode-selector-wrapper {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  background: transparent;
  padding: 0;
  box-shadow: none !important;
  flex-shrink: 0; /* Prevent the entire switcher block from shrinking */
}

.episode-select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none; /* Remove native shadows/dropdowns */
  background: transparent;
  border: none;
  color: var(--text-main);
  font-size: 0.85rem;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  max-width: 110px;
  padding: 0.2rem 1.2rem 0.2rem 0.4rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  border-radius: 4px;
  box-shadow: none !important;
  transition: background 0.15s ease;
}

.episode-select:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.episode-select option {
  background: #1a1a1a;
  color: var(--text-main);
}

/* Episode dropdown menu layout */
.episode-menu-container {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}

.episode-context-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: rgba(26, 26, 26, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  min-width: 210px;
  padding: 0.35rem 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
}

.context-menu-item {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem 0.85rem;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.context-menu-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
}

.context-menu-item svg {
  stroke: var(--text-muted, #888888);
  transition: stroke 0.15s ease;
}

.context-menu-item:hover:not(:disabled) svg {
  stroke: var(--text-main, #ffffff);
}

.context-menu-item:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.context-menu-item:disabled svg {
  stroke: var(--border-color) !important;
}

.context-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.35rem 0;
}

.context-menu-item.delete-item:hover:not(:disabled) {
  background: rgba(255, 74, 74, 0.1);
  color: #ff4a4a;
}

.context-menu-item.delete-item:hover:not(:disabled) svg {
  stroke: #ff4a4a;
}

/* Page start toggle icon colors */
.context-menu-item.toggle-item svg {
  stroke: var(--accent, #8c88f0);
}
.context-menu-item.toggle-item:hover svg {
  stroke: var(--accent-hover, #a29eff);
}

/* 3-dots trigger button design with solid fill circles */
.episode-icon-btn.menu-trigger-btn svg {
  fill: var(--text-muted, #888888);
  stroke: none !important;
  transition: fill 0.15s ease;
}

.episode-icon-btn.menu-trigger-btn:hover svg {
  fill: var(--text-main, #ffffff) !important;
}

.episode-icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0; /* Prevent button from shrinking to 0 width */
}

.episode-icon-btn svg {
  stroke: var(--text-muted, #888888);
  transition: stroke 0.15s ease;
}

.episode-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}

.episode-icon-btn:hover:not(:disabled) svg {
  stroke: var(--text-main, #ffffff);
}

.episode-icon-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.episode-icon-btn:disabled svg {
  stroke: var(--border-color) !important;
}

/* Center pagination styling */
.menu-navigation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.25rem 0.5rem;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
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
  width: 26px;
  height: 26px;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--accent);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.nav-pages-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
  min-width: 80px;
  text-align: center;
  user-select: none;
}

.nav-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 0.25rem;
}

.add-page-btn {
  color: var(--accent);
}

.add-page-btn:hover:not(:disabled) {
  background: rgba(140, 136, 240, 0.15) !important;
  color: var(--accent-hover) !important;
}

/* Right menu icons row */
.menu-actions-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.menu-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.menu-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color);
  margin: 0 0.35rem;
}

/* Modern flat minimal icon button */
.menu-btn {
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  width: 36px;
  height: 36px;
  color: var(--text-muted);
  border-radius: 8px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: none !important; /* Flat design */
}

.menu-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
}

.menu-btn.is-active {
  background: rgba(140, 136, 240, 0.12) !important;
  color: var(--accent) !important;
  border: 1px solid rgba(140, 136, 240, 0.2) !important;
}

.menu-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.reset-btn:hover {
  color: #ff4a4a;
  background: rgba(255, 74, 74, 0.08);
}

.markdown-btn {
  color: var(--accent);
}
.markdown-btn:hover:not(:disabled) {
  background: rgba(140, 136, 240, 0.12);
  color: var(--accent-hover);
}

.control-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.control-icon {
  color: var(--text-muted);
}

.gap-range {
  accent-color: var(--accent);
  cursor: pointer;
  width: 80px;
  height: 4px;
  border-radius: 2px;
  background: var(--border-color);
}

.gap-value {
  color: var(--text-muted);
  font-weight: 500;
  font-size: 0.8rem;
  min-width: 30px;
}

/* Responsive Rules */

@media (max-width: 1100px) {
  .project-title-input, .brand-divider:nth-child(4) {
    display: none !important;
  }
}

@media (max-width: 960px) {
  .menu-logo-section {
    gap: 0.25rem;
  }
  .menu-title-brand, .brand-divider {
    display: none !important;
  }
  .gap-range {
    width: 60px;
  }
}

@media (max-width: 767px) {
  .hide-mobile {
    display: none !important;
  }
  .menu-container {
    padding: 0 0.5rem;
    gap: 0.5rem;
  }
  .menu-navigation {
    padding: 0.2rem 0.4rem;
  }
  .nav-pages-label {
    min-width: 65px;
    font-size: 0.8rem;
  }
}
</style>
