import { reactive, watch } from 'vue';
import { generateFountainDocument } from '../utils/fountain';

const STORAGE_KEY = 'bd-paneling-state';

// Greatest Common Divisor
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Least Common Multiple
function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

// LCM of an array of numbers
function lcmArray(arr) {
  return arr.reduce((acc, val) => lcm(acc, val), 1);
}

// Rebuild cells layout map in the new global grid dimensions based on rowCols
function rebuildGridWithRowCols(page, oldCols, oldRowCols, rowShiftIndex = 999) {
  const newCols = lcmArray(page.rowCols);
  
  page.panels.forEach(panel => {
    // 1. Identify all unique row/col coordinates this panel occupies in the old grid layout
    const uniqueKeys = new Set();
    panel.cells.forEach(c => {
      const r = Math.ceil(c / oldCols);
      const col = ((c - 1) % oldCols) + 1;
      const C_r = oldRowCols[r - 1];
      const oldW = oldCols / C_r;
      const localCol = Math.floor((col - 1) / oldW) + 1;
      uniqueKeys.add(`${r}_${localCol}`);
    });
    
    // 2. Map coordinates to the new rescaled LCM grid
    const newCells = [];
    uniqueKeys.forEach(key => {
      const [rStr, cStr] = key.split('_');
      const r = parseInt(rStr, 10);
      const localCol = parseInt(cStr, 10);
      
      // Shift row indices for rows starting at or below rowShiftIndex
      const new_r = r >= rowShiftIndex ? r + 1 : r;
      
      const C_new = page.rowCols[new_r - 1];
      const newW = newCols / C_new;
      
      for (let k = 1; k <= newW; k++) {
        const cellId = (new_r - 1) * newCols + (localCol - 1) * newW + k;
        newCells.push(cellId);
      }
    });
    
    // Sort cell numbers ascending
    newCells.sort((a, b) => a - b);
    panel.cells = newCells;
  });
  
  page.gridType = `${newCols}x${page.rowCols.length}`;
}

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
    plotInfo: '',
    plotColor: null,
    panels,
    rowCols: Array(rows).fill(cols) // Track columns per row
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
      // Populate rowCols for loaded pages if missing
      initialState.pages.forEach(p => {
        if (!p.rowCols) {
          const [cols, rows] = p.gridType.split('x').map(Number);
          p.rowCols = Array(rows).fill(cols);
        }
      });
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
  isToolbarOpen: initialToolbarOpen,
  isTimelineOpen: false
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

// Insert a new row (tier) dynamically
export function insertRow(pageIndex, insertRowIndex) {
  const page = store.pages[pageIndex];
  if (!page) return;

  if (!page.rowCols) {
    const [cols, rows] = page.gridType.split('x').map(Number);
    page.rowCols = Array(rows).fill(cols);
  }

  const [oldCols] = page.gridType.split('x').map(Number);
  const oldRowCols = [...page.rowCols];

  // Insert a column count for the new row (copy the closest row's columns, or 3)
  const defaultCols = insertRowIndex > 1 ? page.rowCols[insertRowIndex - 2] : 3;
  page.rowCols.splice(insertRowIndex - 1, 0, defaultCols);

  rebuildGridWithRowCols(page, oldCols, oldRowCols, insertRowIndex);

  // Add new empty panels for the inserted row (which has defaultCols columns)
  const newCols = lcmArray(page.rowCols);
  const newW = newCols / defaultCols;
  for (let col = 1; col <= defaultCols; col++) {
    const newCells = [];
    for (let k = 1; k <= newW; k++) {
      const cellId = (insertRowIndex - 1) * newCols + (col - 1) * newW + k;
      newCells.push(cellId);
    }
    page.panels.push({
      id: crypto.randomUUID(),
      text: '',
      cells: newCells,
      isInset: false
    });
  }
}

// Check if columns can be increased on a specific row
export function canAddColumnToRow(pageIndex, rowIndex) {
  const page = store.pages[pageIndex];
  if (!page) return false;

  if (!page.rowCols) {
    const [cols, rows] = page.gridType.split('x').map(Number);
    page.rowCols = Array(rows).fill(cols);
  }

  const [cols] = page.gridType.split('x').map(Number);
  const C = page.rowCols[rowIndex - 1];

  // Find all panels that touch this row
  const rowPanels = page.panels.filter(p => {
    const coords = p.cells.map(c => Math.ceil(c / cols));
    return coords.includes(rowIndex);
  });

  // Rule 1: No panels in this row must span multiple rows
  const spansMultipleRows = rowPanels.some(p => {
    const rows = p.cells.map(c => Math.ceil(c / cols));
    return Math.min(...rows) !== Math.max(...rows);
  });
  if (spansMultipleRows) return false;

  // Rule 2: All panels in this row must have exactly the default width (cols / C)
  const expectedWidth = cols / C;
  const allDefaultWidth = rowPanels.every(p => p.cells.length === expectedWidth);

  return allDefaultWidth;
}

// Add a column to a specific row (tier) dynamically
export function addColumnToRow(pageIndex, rowIndex) {
  const page = store.pages[pageIndex];
  if (!page) return;

  if (!page.rowCols) {
    const [cols, rows] = page.gridType.split('x').map(Number);
    page.rowCols = Array(rows).fill(cols);
  }

  if (!canAddColumnToRow(pageIndex, rowIndex)) {
    return;
  }

  const [oldCols] = page.gridType.split('x').map(Number);
  const oldRowCols = [...page.rowCols];

  // Increment the column count of rowIndex
  page.rowCols[rowIndex - 1] += 1;

  rebuildGridWithRowCols(page, oldCols, oldRowCols);

  // Add the new empty panel for the new column (located at index C_new)
  const newCols = lcmArray(page.rowCols);
  const C_new = page.rowCols[rowIndex - 1];
  const newW = newCols / C_new;
  const newCells = [];
  for (let k = 1; k <= newW; k++) {
    const cellId = (rowIndex - 1) * newCols + (C_new - 1) * newW + k;
    newCells.push(cellId);
  }

  page.panels.push({
    id: crypto.randomUUID(),
    text: '',
    cells: newCells,
    isInset: false
  });
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
        // Populate rowCols for imported pages if missing
        store.pages.forEach(p => {
          if (!p.rowCols) {
            const [cols, rows] = p.gridType.split('x').map(Number);
            p.rowCols = Array(rows).fill(cols);
          }
        });
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
  
  // Rule check: All rows involved in cross-row merging must have identical column counts
  if (!page.rowCols) {
    const [c, r] = page.gridType.split('x').map(Number);
    page.rowCols = Array(r).fill(c);
  }
  
  const occupiedRows = new Set();
  selectedPanels.forEach(p => {
    p.cells.forEach(c => {
      occupiedRows.add(Math.ceil(c / cols));
    });
  });

  const rowColsList = Array.from(occupiedRows).map(r => page.rowCols[r - 1]);
  const allSameColCount = rowColsList.every(val => val === rowColsList[0]);

  if (!allSameColCount) {
    alert("列数が異なる段をまたぐ結合はできません。");
    return;
  }

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

  const cols = parseInt(page.gridType.split('x')[0], 10);
  if (!page.rowCols) {
    const [c, r] = page.gridType.split('x').map(Number);
    page.rowCols = Array(r).fill(c);
  }
  const row = Math.ceil(panel.cells[0] / cols);
  const C_row = page.rowCols[row - 1];
  const W = cols / C_row;

  page.panels.splice(panelIndex, 1);

  // Break back into original column width blocks
  for (let i = 0; i < panel.cells.length; i += W) {
    const chunk = panel.cells.slice(i, i + W);
    page.panels.push({
      id: crypto.randomUUID(),
      text: i === 0 ? panel.text : '',
      cells: chunk,
      isInset: false
    });
  }
}
