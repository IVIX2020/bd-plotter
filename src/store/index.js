import { reactive, watch } from 'vue';
import { generateFountainDocument } from '../utils/fountain';

const STORAGE_KEY = 'bd-paneling-state';

// Generate a default empty page
function createEmptyPage(gridType = '3x4') {
  const [cols, rows] = gridType.split('x').map(Number);
  const totalPanels = cols * rows;
  const panels = [];
  
  for (let i = 1; i <= totalPanels; i++) {
    panels.push({
      id: crypto.randomUUID(),
      text: '',
      cells: [i], // 占有するベースグリッドのセル番号の配列
      isInset: false
    });
  }
  
  return {
    id: crypto.randomUUID(),
    gridType,
    plotInfo: '', // Added plot info field
    plotColor: null, // Added plot color field
    panels
  };
}

// Initial state
const defaultState = {
  pages: [createEmptyPage('3x4')],
  currentSpreadIndex: 0,
  firstPageIsSingle: true,
  rowGap: 12,
  colGap: 6,
};

// Load from local storage or use default
const savedState = localStorage.getItem(STORAGE_KEY);
let initialState = defaultState;

if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    if (parsed.pages && parsed.pages[0] && parsed.pages[0].panels && parsed.pages[0].panels[0].cells !== undefined) {
      initialState = {
        ...defaultState,
        ...parsed,
        currentSpreadIndex: parsed.currentSpreadIndex || 0,
        firstPageIsSingle: parsed.firstPageIsSingle !== undefined ? parsed.firstPageIsSingle : true
      };
    } else {
      console.warn("Old state format detected. Falling back to default state.");
    }
  } catch (e) {
    console.error("Failed to parse state", e);
  }
}

const savedToolbarOpen = localStorage.getItem('bd-paneling-toolbar-open');
const initialToolbarOpen = savedToolbarOpen !== null ? JSON.parse(savedToolbarOpen) : true;

export const store = reactive({
  ...initialState,
  fountainOutput: '',
  isToolbarOpen: initialToolbarOpen
});

// History state for Undo/Redo
export const historyState = reactive({
  history: [],
  currentIndex: -1
});

const MAX_HISTORY = 20;
let isRestoring = false;
let debounceTimeout = null;

function saveSnapshot() {
  if (isRestoring) return;
  const snapshot = JSON.stringify({
    pages: store.pages,
    rowGap: store.rowGap,
    colGap: store.colGap,
    firstPageIsSingle: store.firstPageIsSingle,
  });

  // Prevent consecutive identical snapshots
  if (historyState.currentIndex >= 0 && historyState.history[historyState.currentIndex] === snapshot) {
    return;
  }

  // If we are not at the end of the history (i.e., we undid and are now saving a new action)
  if (historyState.currentIndex < historyState.history.length - 1) {
    historyState.history.splice(historyState.currentIndex + 1);
  }

  historyState.history.push(snapshot);
  if (historyState.history.length > MAX_HISTORY) {
    historyState.history.shift();
  } else {
    historyState.currentIndex++;
  }
}

// Initial snapshot
saveSnapshot();

export function undo() {
  if (historyState.currentIndex > 0) {
    isRestoring = true;
    historyState.currentIndex--;
    restoreSnapshot(historyState.history[historyState.currentIndex]);
    isRestoring = false;
  }
}

export function redo() {
  if (historyState.currentIndex < historyState.history.length - 1) {
    isRestoring = true;
    historyState.currentIndex++;
    restoreSnapshot(historyState.history[historyState.currentIndex]);
    isRestoring = false;
  }
}

function restoreSnapshot(snapshotStr) {
  const parsed = JSON.parse(snapshotStr);
  store.pages = parsed.pages;
  store.rowGap = parsed.rowGap;
  store.colGap = parsed.colGap;
  store.firstPageIsSingle = parsed.firstPageIsSingle;
}

// Watch for deep changes to automatically save history (debounced)
watch(() => [store.pages, store.rowGap, store.colGap], () => {
  if (isRestoring) return;
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    saveSnapshot();
  }, 400); // 400ms debounce
}, { deep: true, flush: 'sync' });

// Update generated markdown whenever pages change
watch(() => store.pages, () => {
  store.fountainOutput = generateFountainDocument(store.pages);
}, { deep: true, immediate: true });

// Auto-save
watch(() => store, (state) => {
  const stateToSave = {
    pages: state.pages,
    currentSpreadIndex: state.currentSpreadIndex,
    firstPageIsSingle: state.firstPageIsSingle,
    rowGap: state.rowGap,
    colGap: state.colGap,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}, { deep: true });

// Auto-save toolbar open state
watch(() => store.isToolbarOpen, (newVal) => {
  localStorage.setItem('bd-paneling-toolbar-open', JSON.stringify(newVal));
});

// Actions
export function addPage() {
  store.pages.push(createEmptyPage('3x4'));
}

export function deletePage(index) {
  if (store.pages.length > 1) {
    store.pages.splice(index, 1);
    // Rough calculation to prevent out of bounds after deletion
    const maxSpread = Math.ceil(store.pages.length / 2);
    if (store.currentSpreadIndex >= maxSpread) {
      store.currentSpreadIndex = Math.max(0, maxSpread - 1);
    }
  }
}

export function movePage(index, direction) {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < store.pages.length) {
    const temp = store.pages[index];
    store.pages[index] = store.pages[newIndex];
    store.pages[newIndex] = temp;
  }
}

export function importJson(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.pages && parsed.pages[0] && parsed.pages[0].panels) {
        store.pages = parsed.pages;
        store.currentSpreadIndex = parsed.currentSpreadIndex || 0;
        store.firstPageIsSingle = parsed.firstPageIsSingle !== undefined ? parsed.firstPageIsSingle : true;
        store.rowGap = parsed.rowGap || 12;
        store.colGap = parsed.colGap || 6;
      } else {
        alert("Invalid file format.");
      }
    } catch (err) {
      alert("Failed to read JSON file.");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

export function exportJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "bd-script.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function exportFountain() {
  const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(store.fountainOutput);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "bd-script.md");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export const selectionState = reactive({
  isSelecting: false,
  selectedIds: new Set(),
  pageIndex: null,
  lastDragEndTime: 0
});

export function mergeSelectedPanels() {
  const { pageIndex, selectedIds } = selectionState;
  if (pageIndex === null || selectedIds.size < 2) return;
  
  const page = store.pages[pageIndex];
  const selectedIdsArray = Array.from(selectedIds);
  const selectedPanels = page.panels.filter(p => selectedIdsArray.includes(p.id));
  
  const cols = parseInt(page.gridType.split('x')[0], 10);
  
  // Calculate bounding box of all selected cells
  const getAllCoords = (panels) => panels.flatMap(p => p.cells.map(c => ({
    r: Math.ceil(c / cols),
    c: ((c - 1) % cols) + 1
  })));

  const coords = getAllCoords(selectedPanels);
  const minR = Math.min(...coords.map(c => c.r));
  const maxR = Math.max(...coords.map(c => c.r));
  const minC = Math.min(...coords.map(c => c.c));
  const maxC = Math.max(...coords.map(c => c.c));

  const targetCells = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      targetCells.push((r - 1) * cols + c);
    }
  }

  // Find panels completely enclosed but NOT selected (these become insets)
  const insetPanels = page.panels.filter(p => 
    !selectedIdsArray.includes(p.id) && 
    p.cells.every(cell => targetCells.includes(cell))
  );

  // Find panels to absorb (selected ones, or any overlapping ones that aren't saved as insets)
  const panelsToAbsorb = page.panels.filter(p => 
    selectedIdsArray.includes(p.id) || 
    (p.cells.some(cell => targetCells.includes(cell)) && !insetPanels.includes(p))
  );

  panelsToAbsorb.sort((a, b) => Math.min(...a.cells) - Math.min(...b.cells));
  const combinedText = panelsToAbsorb.map(p => p.text).filter(t => t.trim() !== '').join('\n\n');

  // Remove absorbed panels
  page.panels = page.panels.filter(p => !panelsToAbsorb.includes(p));
  
  // Mark enclosed unselected panels as insets
  insetPanels.forEach(p => p.isInset = true);

  // Create new merged panel
  page.panels.push({
    id: crypto.randomUUID(),
    text: combinedText,
    cells: targetCells,
    isInset: false
  });

  selectionState.selectedIds.clear();
}

export function splitPanel(pageIndex, panelId) {
  const page = store.pages[pageIndex];
  const panelIndex = page.panels.findIndex(p => p.id === panelId);
  if (panelIndex === -1) return;
  const panel = page.panels[panelIndex];
  if (panel.cells.length <= 1) return;

  page.panels.splice(panelIndex, 1);

  // Break back into individual 1x1 cells
  panel.cells.forEach((cell, idx) => {
    page.panels.push({
      id: crypto.randomUUID(),
      text: idx === 0 ? panel.text : '',
      cells: [cell],
      isInset: false
    });
  });
}

// We will add more actions for merging panels later.
