<template>
  <div class="timeline-container">
    <div class="timeline-track">
      <div 
        v-for="(spread, sIndex) in spreads" 
        :key="'spread-' + sIndex"
        class="timeline-item"
        :class="{ active: store.currentSpreadIndex === sIndex }"
        @click="store.currentSpreadIndex = sIndex"
      >
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
              <button class="action-btn delete-btn" @click.stop="deletePage(pRef.index)" title="削除">×</button>
              <button class="action-btn" @click.stop="movePage(pRef.index, 1)" :disabled="pRef.index === store.pages.length - 1" title="下に移動">▼</button>
            </div>
            
            <div class="page-thumb" :style="getGridStyle(pRef.index)">
              <div 
                v-for="panel in store.pages[pRef.index].panels" 
                :key="panel.id"
                class="mini-panel"
                :style="getPanelStyle(pRef.index, panel)"
              ></div>
            </div>
            <div v-if="store.pages[pRef.index].plotColor" :class="['mini-plot-dot', 'dot-' + store.pages[pRef.index].plotColor]"></div>
            <span class="thumb-num">{{ pRef.index + 1 }}</span>
            <input 
              type="text" 
              class="plot-input" 
              v-model="store.pages[pRef.index].plotInfo" 
              placeholder="プロット・メモ..." 
              @click.stop
            />
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
import { ref, computed } from 'vue'
import { store, addPage, deletePage, movePage } from '../store'

const hoveredPage = ref(null)

const spreads = computed(() => {
  const numPages = store.pages.length;
  const spreadList = [];
  if (numPages === 0) return spreadList;
  
  if (store.firstPageIsSingle) {
    spreadList.push([ { index: 0 } ]); 
    for (let i = 1; i < numPages; i += 2) {
      const spread = [{ index: i }];
      if (i + 1 < numPages) spread.push({ index: i + 1 });
      spreadList.push(spread);
    }
  } else {
    for (let i = 0; i < numPages; i += 2) {
      const spread = [{ index: i }];
      if (i + 1 < numPages) spread.push({ index: i + 1 });
      spreadList.push(spread);
    }
  }
  return spreadList;
})

const getGridStyle = (pageIndex) => {
  const page = store.pages[pageIndex];
  if (!page) return {};
  const [cols, rows] = page.gridType.split('x').map(Number);
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gap: '1px'
  }
}

const getPanelStyle = (pageIndex, panel) => {
  const page = store.pages[pageIndex];
  if (!page || !panel.cells || panel.cells.length === 0) return {};
  const cols = parseInt(page.gridType.split('x')[0], 10);
  
  const coords = panel.cells.map(c => ({
    r: Math.ceil(c / cols),
    c: ((c - 1) % cols) + 1
  }));
  
  const minR = Math.min(...coords.map(c => c.r));
  const maxR = Math.max(...coords.map(c => c.r));
  const minC = Math.min(...coords.map(c => c.c));
  const maxC = Math.max(...coords.map(c => c.c));
  
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

<style scoped>
.timeline-container {
  position: absolute;
  top: 1.5rem;
  bottom: 1.5rem;
  left: 1.5rem;
  width: 140px;
  z-index: 50;
  opacity: 0;
  transition: opacity 0.3s ease;
  background: var(--bg-panel);
  padding: 1rem 0.5rem;
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  overflow-y: auto;
  overflow-x: hidden;
}
.timeline-container::before {
  content: "";
  position: absolute;
  top: -2rem;
  left: -2rem;
  right: -2rem;
  bottom: -2rem;
  z-index: -1;
}
.timeline-container:hover {
  opacity: 1 !important;
  box-shadow: var(--shadow-md);
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
  gap: 1.5rem;
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

.spread-thumb {
  display: flex;
  justify-content: center;
  gap: 2px;
  background: transparent;
  padding: 4px;
  border-radius: 6px;
  border: 2px solid transparent;
}
.timeline-item.active .spread-thumb {
  border-color: var(--accent);
  background: rgba(140, 136, 240, 0.05);
}

.page-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 48px;
  position: relative;
}

.mini-plot-dot {
  position: absolute;
  top: 0px;
  right: 0px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid var(--bg-panel);
  z-index: 10;
  pointer-events: none;
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

.thumb-num {
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--text-muted);
}
.timeline-item.active .thumb-num {
  color: var(--accent);
}

.plot-input {
  width: 100%;
  font-size: 0.6rem;
  padding: 2px;
  text-align: center;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-main);
  border-radius: 2px;
}
.plot-input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-canvas);
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
