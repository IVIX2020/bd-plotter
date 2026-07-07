<template>
  <div class="page-container" v-if="page" @click="clearSelection">
    <div class="page-header">
      <span class="page-num">P.{{ pageIndex + 1 }}</span>
      <input 
        type="text" 
        class="page-note-input" 
        v-model="page.plotInfo" 
        placeholder="メモを入力..."
        title="ページごとのプロット・メモ"
        @click.stop
      />
      <div class="plot-dots">
        <button 
          class="plot-dot dot-green" 
          :class="{ active: page.plotColor === 'green' }" 
          @click.stop="togglePlotColor('green')"
          title="起 (Green)"
        ></button>
        <button 
          class="plot-dot dot-yellow" 
          :class="{ active: page.plotColor === 'yellow' }" 
          @click.stop="togglePlotColor('yellow')"
          title="承・転 (Yellow)"
        ></button>
        <button 
          class="plot-dot dot-pink" 
          :class="{ active: page.plotColor === 'pink' }" 
          @click.stop="togglePlotColor('pink')"
          title="結 (Pink)"
        ></button>
      </div>
    </div>

    <div class="canvas-wrapper" :class="positionType">
      <!-- Actual page canvas for panels -->
      <div 
        class="page-canvas" 
        :style="{ 
          '--row-gap': store.rowGap + 'px', 
          '--col-gap': store.colGap + 'px',
          rowGap: '0px', 
          columnGap: '0px',
          gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`
        }"
      >
        <Panel 
          v-for="(item, idx) in parsedPanelsData" 
          :key="item.panel.id" 
          :panel="item.panel" 
          :index="idx"
          :gridType="page.gridType"
          :pageIndex="pageIndex"
          :previewBlocks="item.preview"
        />

        <div class="canvas-actions-overlay" v-if="showMergeButton || showSinglePanelActions">
          <button v-if="showMergeButton" @click.stop="mergeSelectedPanels" class="action-btn merge-btn">結合する</button>
          
          <template v-if="showSinglePanelActions">
            <button v-if="isSelectedPanelMerged" @click.stop="splitSelectedPanel" class="action-btn split-action-btn" title="結合を解除する">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="12" y1="3" x2="12" y2="21"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
              </svg>
              結合解除
            </button>
            <button v-else @click.stop="deleteSelectedPanel" class="action-btn delete-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              コマを削除
            </button>
          </template>
        </div>
      </div>

      <!-- Mirrored transparent overlay grid for indicator lines and buttons -->
      <div 
        class="canvas-overlay"
        :style="{ 
          rowGap: '0px', 
          columnGap: '0px',
          gridTemplateColumns: `repeat(${colsCount}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rowsCount}, minmax(0, 1fr))`
        }"
      >
        <!-- Floating Row Insertion Indicators (on the left gaps) -->
        <div 
          v-for="i in (rowsCount + 1)" 
          :key="'insert-' + i" 
          class="row-insert-indicator"
          :style="{ 
            gridColumn: '1 / -1',
            gridRow: `${i} / ${i}`
          }"
        >
          <button 
            class="row-insert-btn" 
            @click.stop="onInsertRow(i)" 
            :title="i === 1 ? '最上部に段を追加' : i === (rowsCount + 1) ? '最下部に段を追加' : `上から ${i-1} 段目と ${i} 段目の間に段を挿入`"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <div class="row-insert-line"></div>
        </div>

        <!-- Floating Row Deletion Indicators (on the left row centers) -->
        <div 
          v-if="rowsCount > 1"
          v-for="r in rowsCount" 
          :key="'row-del-' + r" 
          class="row-delete-indicator"
          :style="{ 
            gridColumn: '1 / -1',
            gridRow: `${r} / ${r}`
          }"
        >
          <button 
            class="row-delete-btn" 
            @click.stop="onDeleteRow(r)" 
            title="この段を削除"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <!-- Floating Column Addition Indicators (on the right row centers) -->
        <div 
          v-for="r in rowsCount" 
          :key="'col-add-' + r" 
          class="col-add-indicator"
          :style="{ 
            gridColumn: '1 / -1',
            gridRow: `${r} / ${r}`
          }"
        >
          <button 
            v-if="canAddColumn(r)"
            class="col-add-btn" 
            @click.stop="onAddColumn(r)" 
            title="この段 of 列を増やす"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { store, activeEpisode, selectionState, mergeSelectedPanels, insertRow, canAddColumnToRow, addColumnToRow, deleteRow, deletePanel, splitPanel } from '../store'
import Panel from './Panel.vue'
import { sortPanels, parsePanelText } from '../utils/fountain'

const props = defineProps({
  pageIndex: { type: Number, required: true },
  positionType: { type: String, default: 'single' } // 'left', 'right', 'single'
})

const page = computed(() => store.pages[props.pageIndex])

const colsCount = computed(() => {
  if (!page.value) return 3;
  return parseInt(page.value.gridType.split('x')[0], 10);
})

const rowsCount = computed(() => {
  if (!page.value) return 4;
  return parseInt(page.value.gridType.split('x')[1], 10);
})

const onInsertRow = (insertRowIndex) => {
  insertRow(props.pageIndex, insertRowIndex);
}

const onDeleteRow = (rowIndex) => {
  if (confirm("この段と含まれるコマを削除しますか？")) {
    deleteRow(props.pageIndex, rowIndex);
  }
}

const canAddColumn = (rowIndex) => {
  return canAddColumnToRow(props.pageIndex, rowIndex);
}

const onAddColumn = (rowIndex) => {
  addColumnToRow(props.pageIndex, rowIndex);
}

const togglePlotColor = (color) => {
  if (page.value) {
    if (page.value.plotColor === color) {
      page.value.plotColor = null
    } else {
      page.value.plotColor = color
    }
  }
}

const sortedPanels = computed(() => {
  if (!page.value) return [];
  return sortPanels(page.value.panels, page.value.gridType);
})

const parsedPanelsData = computed(() => {
  if (!page.value) return [];
  let lastSpeaker = "CHARACTER";
  const sorted = sortedPanels.value;
  const metadata = activeEpisode.value?.metadata || {};
  const protagonistNameOriginal = (metadata.protagonist?.name || '').trim();
  const protagonistName = protagonistNameOriginal.toLowerCase();
  const keyPersonName = (metadata.keyPerson?.name || '').trim().toLowerCase();

  return sorted.map(panel => {
    const parsed = parsePanelText(panel.text, lastSpeaker, protagonistNameOriginal);
    lastSpeaker = parsed.lastSpeaker;
    
    const previewWithColors = parsed.preview.map(block => {
      if (block.type === 'dialogue' || block.type === 'monologue') {
        const speakerName = (block.name || '').trim().toLowerCase();
        let customColor = null;
        if (protagonistName && speakerName === protagonistName) {
          customColor = metadata.protagonist?.color || null;
        } else if (keyPersonName && speakerName === keyPersonName) {
          customColor = metadata.keyPerson?.color || null;
        }
        return {
          ...block,
          customColor
        };
      }
      return block;
    });

    return {
      panel,
      preview: previewWithColors
    };
  });
})

const showMergeButton = computed(() => {
  return !selectionState.isSelecting && selectionState.selectedIds.size > 1 && selectionState.pageIndex === props.pageIndex;
})

const showSinglePanelActions = computed(() => {
  return !selectionState.isSelecting && selectionState.selectedIds.size === 1 && selectionState.pageIndex === props.pageIndex;
})

const deleteSelectedPanel = () => {
  const panelId = Array.from(selectionState.selectedIds)[0];
  if (!panelId) return;

  if (confirm("選択したコマを削除しますか？\n（段の列数が減るか、最後のコマの場合は段自体が削除されます）")) {
    deletePanel(props.pageIndex, panelId);
    selectionState.selectedIds.clear();
  }
}

const isSelectedPanelMerged = computed(() => {
  if (selectionState.selectedIds.size !== 1) return false;
  const panelId = Array.from(selectionState.selectedIds)[0];
  const panel = page.value.panels.find(p => p.id === panelId);
  if (!panel) return false;

  const cols = colsCount.value;
  const row = Math.ceil(panel.cells[0] / cols);
  const C_row = page.value.rowCols[row - 1];
  const baseW = cols / C_row;
  
  return panel.cells.length > baseW;
});

const splitSelectedPanel = () => {
  const panelId = Array.from(selectionState.selectedIds)[0];
  if (!panelId) return;

  splitPanel(props.pageIndex, panelId);
  selectionState.selectedIds.clear();
}

const onGlobalMouseUp = () => {
  if (selectionState.isSelecting) {
    selectionState.isSelecting = false;
    if (selectionState.selectedIds.size > 1) {
      selectionState.lastDragEndTime = Date.now();
    }
  }
}

onMounted(() => {
  window.addEventListener('mouseup', onGlobalMouseUp);
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onGlobalMouseUp);
})

const clearSelection = (e) => {
  // Prevent click-to-clear immediately after finishing a multi-panel drag
  if (Date.now() - selectionState.lastDragEndTime < 100) return;

  if (!e.target.closest('.panel') && !e.target.closest('.canvas-actions-overlay')) {
    selectionState.selectedIds.clear();
  }
}
</script>

<style scoped>
.canvas-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: calc((100vh - 60px - 4.5rem) / 1.547); /* Standard proportion */
  max-height: calc(100% - 2.5rem);
  aspect-ratio: 1 / 1.547;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Align canvases adjacent in spread layout */
.canvas-wrapper.left {
  justify-content: flex-end;
  margin-left: auto;
}
.canvas-wrapper.right {
  justify-content: flex-start;
  margin-right: auto;
}

.page-canvas {
  width: 100%;
  height: 100%;
  background: var(--bg-canvas);
  padding: 1rem;
  display: grid;
  transition: gap 0.3s ease;
  border-radius: 0;
  border: none;
  position: relative;
  min-width: 0;
  min-height: 0;
}

/* Mirrored overlay container */
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 1rem; /* Must match page-canvas padding */
  display: grid;
  pointer-events: none; /* Make overlay 100% click-through */
  z-index: 100;
  min-width: 0;
  min-height: 0;
}

.row-insert-indicator {
  height: 0;
  position: relative;
  display: flex;
  align-items: center;
  pointer-events: none; /* Inherit click-through */
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.canvas-wrapper:hover .row-insert-indicator {
  opacity: 0.35;
}

.row-insert-indicator:hover {
  opacity: 1 !important;
}

.row-insert-btn {
  position: absolute;
  left: 8px; /* Position button inside the grid boundary to avoid gutter overlaps */
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
  pointer-events: auto; /* Clickable button */
}

.row-insert-btn:hover {
  transform: scale(1.25);
  background: var(--accent-hover);
  box-shadow: 0 0 10px rgba(140, 136, 240, 0.6);
}

.row-insert-line {
  width: 100%;
  height: 2px;
  border-top: 2.5px dashed var(--accent);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.row-insert-indicator:hover .row-insert-line {
  opacity: 0.7;
}

/* Row deletion indicators */
.row-delete-indicator {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.canvas-wrapper:hover .row-delete-indicator {
  opacity: 0.35;
}

.row-delete-indicator:hover {
  opacity: 1 !important;
}

.row-delete-btn {
  position: absolute;
  left: 8px; /* Position button inside the grid boundary to avoid gutter overlaps */
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #d93838; /* Alert red */
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
  pointer-events: auto;
}

.row-delete-btn:hover {
  transform: scale(1.25);
  background: #c02828;
  box-shadow: 0 0 10px rgba(217, 56, 56, 0.6);
}

/* Column additions styles */
.col-add-indicator {
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none; /* Inherit click-through */
  opacity: 0;
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.canvas-wrapper:hover .col-add-indicator {
  opacity: 0.35;
}

.col-add-indicator:hover {
  opacity: 1 !important;
}

.col-add-btn {
  position: absolute;
  right: 8px; /* Position button inside the grid boundary to avoid gutter overlaps */
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
  pointer-events: auto; /* Clickable button */
}

.col-add-btn:hover {
  transform: scale(1.25);
  background: var(--accent-hover);
  box-shadow: 0 0 10px rgba(140, 136, 240, 0.6);
}

/* Floating Actions Overlay */
.canvas-actions-overlay {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  display: flex;
  gap: 0.5rem;
}
.action-btn {
  color: #fff;
  font-weight: bold;
  padding: 0.8rem 1.5rem;
  border-radius: 30px;
  box-shadow: var(--shadow-lg);
  font-size: 1rem;
  display: flex;
  align-items: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.merge-btn {
  background: var(--accent);
}
.merge-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}
.delete-btn {
  background: #d93838;
}
.delete-btn:hover {
  background: #c02828;
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(217, 56, 56, 0.4);
}
.split-action-btn {
  background: var(--accent);
}
.split-action-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}
</style>
