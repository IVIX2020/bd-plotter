<template>
  <div 
    class="panel"
    :class="{ 
      'is-editing': isEditing, 
      'is-selected': isSelected, 
      'is-inset': panel.isInset,
      'plot-green': panel.plotColor === 'green',
      'plot-yellow': panel.plotColor === 'yellow',
      'plot-pink': panel.plotColor === 'pink'
    }"
    @mousedown.left="startSelection"
    @mouseenter="onEnter"
    @dblclick.stop="startEditing"
    :style="gridStyle"
  >
    <span class="panel-num" v-if="!isEditing">{{ index + 1 }}</span>
    
    <!-- Panel Plot Color Dots (Top Right, shifts dynamically if split button is present) -->
    <div 
      class="panel-plot-dots" 
      :class="{ 'has-active-color': panel.plotColor }" 
      v-if="!isEditing"
      :style="{ right: canSplit ? '36px' : '8px' }"
    >
      <button 
        v-for="color in ['green', 'yellow', 'pink']" 
        :key="color"
        :class="['plot-dot', 'dot-' + color, { active: panel.plotColor === color }]"
        @mousedown.stop
        @click.stop="togglePlotColor(color)"
        :title="getPlotTitle(color)"
      ></button>
    </div>

    <button v-if="canSplit" class="split-btn" @mousedown.stop.prevent="onSplit" title="分割する">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="12" y1="3" x2="12" y2="21"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
      </svg>
    </button>
    
    <textarea 
      v-if="isEditing"
      ref="textareaRef"
      class="panel-input" 
      placeholder="セリフやト書きを入力..." 
      v-model="localText"
      @blur="stopEditing"
      @keydown.esc="stopEditing"
      @mousedown.stop
    ></textarea>
    
    <div v-else class="panel-preview">
      <div v-for="(block, i) in parsedPreview" :key="i" :class="'block-' + block.type">
        <!-- Spoken Dialogue -->
        <template v-if="block.type === 'dialogue'">
          <div class="dialogue-line">
            <span class="char-name">👤 {{ block.name }}</span>
            <span class="content-text">「{{ block.content }}」</span>
          </div>
        </template>
        
        <!-- Monologue -->
        <template v-else-if="block.type === 'monologue'">
          <div class="dialogue-line">
            <span class="char-name monologue-char">🧠 {{ block.name }} (独白)</span>
            <span class="content-text monologue-text">（{{ block.content }}）</span>
          </div>
        </template>
        
        <!-- Action (Situation description) -->
        <template v-else-if="block.type === 'action'">
          <div class="action-text">{{ block.content }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { selectionState, splitPanel } from '../store'
import { parsePanelText } from '../utils/fountain'

const props = defineProps({
  panel: { type: Object, required: true },
  index: { type: Number, required: true },
  gridType: { type: String, required: true },
  pageIndex: { type: Number, required: true },
  previewBlocks: { type: Array, default: () => [] }
})

const isEditing = ref(false)
const localText = ref(props.panel.text)
const textareaRef = ref(null)

const parsedPreview = computed(() => {
  return props.previewBlocks && props.previewBlocks.length > 0
    ? props.previewBlocks
    : parsePanelText(props.panel.text).preview
})

const isSelected = computed(() => selectionState.selectedIds.has(props.panel.id))
const canSplit = computed(() => !isEditing.value && props.panel.cells.length > 1)

const gridStyle = computed(() => {
  if (!props.panel.cells || props.panel.cells.length === 0) return {}
  
  const [cols] = props.gridType.split('x').map(Number)
  
  const coords = props.panel.cells.map(c => {
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
    zIndex: props.panel.isInset ? 10 : 1
  }
})

const startSelection = (e) => {
  if (isEditing.value) return;
  e.preventDefault();
  selectionState.isSelecting = true;
  selectionState.pageIndex = props.pageIndex;
  selectionState.selectedIds.clear();
  selectionState.selectedIds.add(props.panel.id);
}

const onEnter = () => {
  if (selectionState.isSelecting && selectionState.pageIndex === props.pageIndex) {
    selectionState.selectedIds.add(props.panel.id);
  }
}

const onSplit = () => {
  splitPanel(props.pageIndex, props.panel.id);
}

const startEditing = async () => {
  if (isEditing.value) return;
  localText.value = props.panel.text;
  isEditing.value = true;
  await nextTick();
  if (textareaRef.value) {
    textareaRef.value.focus();
  }
}

const stopEditing = () => {
  isEditing.value = false;
  props.panel.text = localText.value;
}

// Toggle plot color on the panel object
const togglePlotColor = (color) => {
  if (props.panel.plotColor === color) {
    props.panel.plotColor = null;
  } else {
    props.panel.plotColor = color;
  }
}

const getPlotTitle = (color) => {
  if (color === 'green') return '起 (Green)';
  if (color === 'yellow') return '承・転 (Yellow)';
  if (color === 'pink') return '結 (Pink)';
  return '';
}
</script>

<style scoped>
.panel {
  border: 2px solid var(--text-main);
  border-radius: 2px 255px 3px 25px / 255px 5px 225px 3px;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  position: relative;
  background: transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
  user-select: none;
  -webkit-user-select: none;
  padding: 26px 12px 12px 12px;
  box-sizing: border-box;
  margin: calc(var(--row-gap, 12px) / 2) calc(var(--col-gap, 6px) / 2);
}
.panel:hover {
  background: rgba(255, 255, 255, 0.03);
}

/* Plot Color Border and Background Tint overrides */
.panel.plot-green {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.04);
}
.panel.plot-green:hover {
  background: rgba(74, 222, 128, 0.08);
}

.panel.plot-yellow {
  border-color: #facc15;
  background: rgba(250, 204, 21, 0.04);
}
.panel.plot-yellow:hover {
  background: rgba(250, 204, 21, 0.08);
}

.panel.plot-pink {
  border-color: #f472b6;
  background: rgba(244, 114, 182, 0.04);
}
.panel.plot-pink:hover {
  background: rgba(244, 114, 182, 0.08);
}

.panel.is-editing {
  border-color: var(--accent);
  background: rgba(140, 136, 240, 0.05);
  cursor: text;
}
.panel.is-selected {
  border-color: var(--accent);
  background: rgba(140, 136, 240, 0.15);
  box-shadow: 0 0 0 2px var(--accent);
}
.panel.is-inset {
  background: var(--bg-canvas);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
  border-width: 3px;
}

.panel-num {
  position: absolute;
  top: 8px;
  left: 10px;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--text-muted);
  pointer-events: none;
}

/* Panel plot dots styling */
.panel-plot-dots {
  position: absolute;
  top: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 15;
}
.panel:hover .panel-plot-dots, .panel-plot-dots.has-active-color {
  opacity: 1;
}

.plot-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid transparent;
  padding: 0 !important;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.35;
  background: transparent;
}
.plot-dot:hover {
  transform: scale(1.25);
  opacity: 0.85;
}
.plot-dot.active {
  opacity: 1;
  transform: scale(1.15);
  box-shadow: 0 0 6px var(--dot-shadow);
}
.dot-green {
  background-color: #4ade80;
  --dot-shadow: rgba(74, 222, 128, 0.5);
}
.dot-yellow {
  background-color: #facc15;
  --dot-shadow: rgba(250, 204, 21, 0.5);
}
.dot-pink {
  background-color: #f472b6;
  --dot-shadow: rgba(244, 114, 182, 0.5);
}
.plot-dot.active.dot-green {
  border-color: #22c55e;
}
.plot-dot.active.dot-yellow {
  border-color: #eab308;
}
.plot-dot.active.dot-pink {
  border-color: #ec4899;
}

.split-btn {
  position: absolute;
  top: 6px;
  right: 8px;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px;
  color: var(--text-muted);
  display: none;
  z-index: 20;
}
.panel:hover .split-btn {
  display: flex;
}
.split-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.1);
}

.panel-input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.85rem;
  resize: none;
  outline: none;
  padding: 0;
  line-height: 1.4;
}

.panel-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
  gap: 8px;
  font-size: 0.85rem;
  overflow-y: auto;
  user-select: none;
}

.block-dialogue {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.block-monologue {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.block-action {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.action-text {
  font-size: 0.75rem;
  color: #888888;
  white-space: pre-wrap;
  line-height: 1.4;
}

.dialogue-line {
  width: 100%;
  line-height: 1.4;
}

.char-name {
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--accent);
  margin-right: 6px;
  display: inline;
}
.monologue-char {
  color: #a78bfa;
}
.monologue-text {
  color: #d8b4fe;
  font-style: italic;
}

.content-text {
  display: inline;
  white-space: pre-wrap;
  line-height: 1.4;
  color: var(--text-main);
}
</style>
