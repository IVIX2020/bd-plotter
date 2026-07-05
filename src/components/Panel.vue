<template>
  <div 
    class="panel"
    :class="{ 'is-editing': isEditing, 'is-selected': isSelected, 'is-inset': panel.isInset }"
    @mousedown.left="startSelection"
    @mouseenter="onEnter"
    @mouseup.left="onMouseUp"
    :style="gridStyle"
  >
    <span class="panel-num" v-if="!isEditing">{{ index + 1 }}</span>
    
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
        <div v-if="block.type === 'dialogue-other'" class="char-name">@{{ block.name }}</div>
        <div class="content-text">{{ block.content }}</div>
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
  pageIndex: { type: Number, required: true }
})

const isEditing = ref(false)
const localText = ref(props.panel.text)
const textareaRef = ref(null)

const parsedPreview = computed(() => {
  return parsePanelText(props.panel.text).preview
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
  e.preventDefault(); // Prevent text selection/drag native behavior
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

const onMouseUp = () => {
  if (selectionState.selectedIds.size === 1 && selectionState.selectedIds.has(props.panel.id)) {
    selectionState.selectedIds.clear();
    startEditing();
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
</script>

<style scoped>
.panel {
  border: 2px solid var(--text-main);
  border-radius: 2px 255px 3px 25px / 255px 5px 225px 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  overflow: hidden;
  min-height: 80px;
  user-select: none;
  -webkit-user-select: none;
}
.panel:hover {
  background: rgba(255,255,255,0.03);
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
  background: var(--bg-canvas); /* opaque background to hide panel underneath */
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  border-width: 3px;
}

.panel-num {
  position: absolute;
  top: 6px;
  left: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  user-select: none;
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
  background: rgba(255,255,255,0.1);
}

.panel-input {
  width: 90%;
  height: 90%;
  border: none;
  background: transparent;
  text-align: center;
  font-size: 0.85rem;
  resize: none;
  outline: none;
  color: var(--text-main);
  line-height: 1.4;
  font-family: inherit;
}

.panel-preview {
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 8px;
  font-size: 0.85rem;
  overflow-y: auto;
  user-select: none; /* Prevent text selection during drag */
}

.block-dialogue-protag {
  font-weight: bold;
  color: var(--text-main);
}
.block-dialogue-other {
  font-weight: normal;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.char-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 2px;
}
.block-action {
  font-size: 0.75rem;
  color: #666666;
  font-style: italic;
}
.content-text {
  white-space: pre-wrap;
  line-height: 1.4;
}
</style>
