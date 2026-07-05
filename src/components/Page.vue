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
    <div 
      :class="['page-canvas', 'grid-' + page.gridType]" 
      :style="{ rowGap: store.rowGap + 'px', columnGap: store.colGap + 'px' }"
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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { store, selectionState, mergeSelectedPanels } from '../store'
import Panel from './Panel.vue'

const props = defineProps({
  pageIndex: { type: Number, required: true }
})

const page = computed(() => store.pages[props.pageIndex])

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
  const cols = parseInt(page.value.gridType.split('x')[0], 10);
  
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
