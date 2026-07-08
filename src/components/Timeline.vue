<template>
  <div class="timeline-container" :class="{ 'is-open': store.isTimelineOpen }">
    <div class="timeline-track">
      <div 
        v-for="(spread, sIndex) in spreads" 
        :key="'spread-' + sIndex"
        class="timeline-item"
        :class="{ active: store.currentSpreadIndex === sIndex }"
        @click="store.currentSpreadIndex = sIndex"
      >
        <!-- Stacked L/R Plot Notes above thumbnails -->
        <div class="spread-notes-wrapper" @click.stop>
          <!-- Left Page Note -->
          <div v-if="!(store.firstPageIsSingle && sIndex === 0)" class="note-row">
            <span class="note-badge L">L</span>
            <input 
              type="text" 
              class="plot-input" 
              v-model="store.pages[spread[0].index].plotInfo" 
              placeholder="左ページのプロット..." 
              title="左ページのプロット・メモ"
            />
          </div>
          
          <!-- Right Page Note -->
          <div v-if="store.firstPageIsSingle && sIndex === 0" class="note-row">
            <span class="note-badge R">R</span>
            <input 
              type="text" 
              class="plot-input" 
              v-model="store.pages[spread[0].index].plotInfo" 
              placeholder="右ページのプロット..." 
              title="右ページのプロット・メモ"
            />
          </div>
          <div v-else-if="spread[1]" class="note-row">
            <span class="note-badge R">R</span>
            <input 
              type="text" 
              class="plot-input" 
              v-model="store.pages[spread[1].index].plotInfo" 
              placeholder="右ページのプロット..." 
              title="右ページのプロット・メモ"
            />
          </div>
        </div>

        <!-- Thumbnails Spread -->
        <div class="spread-thumb">
          <div v-if="store.firstPageIsSingle && sIndex === 0" class="page-wrapper empty-wrapper"></div>
          
          <div 
            v-for="pRef in spread" 
            :key="pRef.index" 
            class="page-wrapper"
            @mouseenter="hoveredPage = pRef.index"
            @mouseleave="hoveredPage = null"
          >
            <div class="page-actions" v-if="hoveredPage === pRef.index">
              <button class="action-btn" @click.stop="movePage(pRef.index, -1)" :disabled="pRef.index === 0" title="上に移動">▲</button>
              <button class="action-btn" @click.stop="insertPage(pRef.index)" title="ここに空ページを挿入">＋</button>
              <button class="action-btn delete-btn" @click.stop="deletePage(pRef.index)" title="削除">×</button>
              <button class="action-btn" @click.stop="movePage(pRef.index, 1)" :disabled="pRef.index === store.pages.length - 1" title="下に移動">▼</button>
            </div>
            
            <div class="page-thumb" :style="getGridStyle(pRef.index)">
              <div 
                v-for="panel in store.pages[pRef.index].panels" 
                :key="panel.id"
                class="mini-panel"
                :class="panel.plotColor ? 'plot-' + panel.plotColor : ''"
                :style="getPanelStyle(pRef.index, panel)"
              ></div>
            </div>
            
            <div class="page-meta-row">
              <div v-if="store.pages[pRef.index].plotColor" :class="['mini-plot-dot', 'dot-' + store.pages[pRef.index].plotColor]"></div>
              <span class="thumb-num">P.{{ pRef.index + 1 }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="timeline-item add-btn" @click="addPage">
        <div class="spread-thumb">
          <div class="page-wrapper add-wrapper">
            <div class="page-thumb add-thumb">
              <span class="thumb-icon">+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, deletePage, movePage, addPage, insertPage } from '../store'

const hoveredPage = ref(null)

const spreads = computed(() => {
  const numPages = store.pages.length
  const list = []
  if (numPages === 0) return list

  if (store.firstPageIsSingle) {
    // Page 1 is alone on the right (index 0)
    list.push([{ index: 0 }])
    
    // Page 2 & 3, 4 & 5... form spreads
    for (let i = 1; i < numPages; i += 2) {
      const pair = [{ index: i }]
      if (i + 1 < numPages) {
        pair.push({ index: i + 1 })
      }
      list.push(pair)
    }
  } else {
    // Page 1 & 2 form spreads directly
    for (let i = 0; i < numPages; i += 2) {
      const pair = [{ index: i }]
      if (i + 1 < numPages) {
        pair.push({ index: i + 1 })
      }
      list.push(pair)
    }
  }
  return list
})

const getGridStyle = (pageIndex) => {
  const page = store.pages[pageIndex]
  if (!page) return {}
  
  const [cols, rows] = page.gridType.split('x').map(Number)
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    gap: '1px'
  }
}

const getPanelStyle = (pageIndex, panel) => {
  const page = store.pages[pageIndex]
  if (!page || !panel.cells || panel.cells.length === 0) return {}
  
  const cols = parseInt(page.gridType.split('x')[0], 10)
  
  const coords = panel.cells.map(c => {
    return {
      r: Math.ceil(c / cols),
      c: ((c - 1) % cols) + 1
    }
  })
  
  const minR = Math.min(...coords.map(c => c.r))
  const maxR = Math.max(...coords.map(c => c.r))
  const minC = Math.min(...coords.map(c => c.c))
  const maxC = Math.max(...coords.map(c => c.c))
  
  return {
    gridColumnStart: minC,
    gridColumnEnd: maxC + 1,
    gridRowStart: minR,
    gridRowEnd: maxR + 1,
    zIndex: panel.isInset ? 10 : 1,
    position: panel.isInset ? 'absolute' : 'relative',
    width: panel.isInset ? '70%' : '100%',
    height: panel.isInset ? '70%' : '100%',
    margin: panel.isInset ? 'auto' : '0'
  }
}
</script>

<script>
export default {
  name: 'Timeline'
}
</script>

<style scoped>
.timeline-container {
  position: absolute;
  top: calc(60px + 1.5rem);
  bottom: 1.5rem;
  left: 1.5rem;
  width: 155px; /* Slightly wider to give text inputs more width */
  z-index: 250;
  background: var(--bg-panel);
  padding: 1rem 0.5rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow-y: auto;
  overflow-x: hidden;
  
  transform: translateX(-120%);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.timeline-container.is-open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}

.timeline-container::-webkit-scrollbar {
  width: 4px;
}
.timeline-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.timeline-track {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}

.timeline-item {
  cursor: pointer;
  transition: transform 0.2s ease;
  width: 100%;
}
.timeline-item:hover {
  transform: scale(1.02);
}

.spread-notes-wrapper {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.015);
  border-radius: 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.note-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.note-badge {
  font-size: 0.65rem;
  font-weight: 800;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

.note-badge.L {
  background: rgba(140, 136, 240, 0.15);
  color: var(--accent);
}

.note-badge.R {
  background: rgba(244, 114, 182, 0.15);
  color: #f472b6;
}

.plot-input {
  flex-grow: 1;
  width: 0;
  font-size: 0.75rem;
  padding: 2px 4px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-main);
  border-radius: 3px;
  transition: all 0.15s ease;
  font-weight: 500;
}
.plot-input::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}
.plot-input:hover {
  background: rgba(255, 255, 255, 0.04);
}
.plot-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-canvas);
}

.spread-thumb {
  display: flex;
  gap: 0.25rem;
  width: 100%;
  position: relative;
}

.page-wrapper {
  flex: 1;
  width: 50%;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-meta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 2px;
}

.mini-plot-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mini-plot-dot.dot-green {
  background-color: #4ade80;
}
.mini-plot-dot.dot-yellow {
  background-color: #facc15;
}
.mini-plot-dot.dot-pink {
  background-color: #f472b6;
}

.page-actions {
  position: absolute;
  top: 0;
  left: -20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 2px;
  z-index: 60;
  box-shadow: var(--shadow-sm);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.7rem;
  border-radius: 2px;
}
.action-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
}
.action-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.delete-btn:hover {
  color: #ff6b6b !important;
}

.empty-wrapper {
  background: transparent;
}
.add-wrapper {
  justify-content: center;
}

.page-thumb {
  width: 100%;
  aspect-ratio: 1 / 1.547;
  background: var(--bg-canvas);
  border: 1px solid var(--border-color);
  padding: 1px;
  position: relative;
}

.mini-panel {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.2);
  border-radius: 1px;
}
.mini-panel.plot-green {
  background: #4ade80 !important;
  border-color: #22c55e !important;
}
.mini-panel.plot-yellow {
  background: #facc15 !important;
  border-color: #eab308 !important;
}
.mini-panel.plot-pink {
  background: #f472b6 !important;
  border-color: #ec4899 !important;
}
.mini-panel.plot-purple {
  background: #c084fc !important;
  border-color: #a855f7 !important;
}

.thumb-num {
  font-size: 0.65rem;
  font-weight: bold;
  color: var(--text-muted);
  user-select: none;
}
.timeline-item.active .thumb-num {
  color: var(--accent);
}

.add-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--text-muted);
}
.thumb-icon {
  font-size: 1.2rem;
  color: var(--text-muted);
}
</style>
