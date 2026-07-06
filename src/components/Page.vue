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

    <div class="canvas-wrapper">
      <!-- Actual page canvas for panels -->
      <div 
        class="page-canvas" 
        :style="{ 
          rowGap: store.rowGap + 'px', 
          columnGap: store.colGap + 'px',
          gridTemplateColumns: `repeat(${colsCount}, 1fr)`,
          gridTemplateRows: `repeat(${rowsCount}, 1fr)`
        }"
      >
        <Panel 
          v-for="(panel, idx) in sortedPanels" 
          :key="panel.id" 
          :panel="panel" 
          :index="idx"
          :gridType="page.gridType"
          :pageIndex="pageIndex"
        />

        <div class="merge-action" v-if="showMergeButton">
          <button @click.stop="mergeSelectedPanels">結合する</button>
        </div>
      </div>

      <!-- Mirrored transparent overlay grid for indicator lines and buttons -->
      <div 
        class="canvas-overlay"
        :style="{ 
          rowGap: store.rowGap + 'px', 
          columnGap: store.colGap + 'px',
          gridTemplateColumns: `repeat(${colsCount}, 1fr)`,
          gridTemplateRows: `repeat(${rowsCount}, 1fr)`
        }"
      >
        <!-- Floating Row Insertion Indicators (on the left) -->
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

        <!-- Floating Column Addition Indicators (on the right) -->
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
import { store, selectionState, mergeSelectedPanels, insertRow, canAddColumnToRow, addColumnToRow } from '../store'
import Panel from './Panel.vue'

const props = defineProps({
  pageIndex: { type: Number, required: true }
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
  const cols = colsCount.value;
  
  return [...page.value.panels].sort((a, b) => {
    // For BD style (Left-to-Right), find the Top-Left most cell
    const getPos = (panel) => {
      let minY = Infinity;
      let minX = Infinity;
      const cells = panel.cells || [1];
      cells.forEach(c => {
        const y = Math.ceil(c / cols);
        const x = ((c - 1) % cols) + 1;
        if (y < minY) {
          minY = y;
          minX = x;
        } else if (y === minY && x < minX) {
          minX = x;
        }
      });
      return { x: minX, y: minY };
    };
    
    const posA = getPos(a);
    const posB = getPos(b);
    
    if (posA.y !== posB.y) return posA.y - posB.y; // Top to bottom
    if (posA.x !== posB.x) return posA.x - posB.x; // Left to right
    return (a.isInset === b.isInset) ? 0 : a.isInset ? 1 : -1;
  });
})

const showMergeButton = computed(() => {
  return !selectionState.isSelecting && selectionState.selectedIds.size > 1 && selectionState.pageIndex === props.pageIndex;
})

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

  if (!e.target.closest('.panel') && !e.target.closest('.merge-action')) {
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

.page-canvas {
  width: 100%;
  height: 100%;
  background: var(--bg-canvas);
  padding: 1rem;
  display: grid;
  transition: gap 0.3s ease;
  border-radius: 0;
  border: none;
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
  left: -28px; /* Position button right outside the grid boundary */
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
  right: -28px; /* Position button right outside the grid boundary */
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

.merge-action {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
}
.merge-action button {
  background: var(--accent);
  color: #fff;
  font-weight: bold;
  padding: 0.8rem 2rem;
  border-radius: 30px;
  box-shadow: var(--shadow-lg);
  font-size: 1.1rem;
}
.merge-action button:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}
</style>
