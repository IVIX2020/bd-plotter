import { reactive, watch, computed } from 'vue';
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
      isInset: false,
      plotColor: null
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

// Generate a default empty episode with specified pages count
function createEmptyEpisode(title = "エピソード 1", pageCount = 4) {
  const pages = [];
  for (let i = 0; i < pageCount; i++) {
    pages.push(createEmptyPage('3x4'));
  }
  return {
    id: crypto.randomUUID(),
    title,
    pages,
    currentSpreadIndex: 0,
    currentPageIndex: 0,
    firstPageIsSingle: true,
    rowGap: 12,
    colGap: 6
  };
}

// Default project state
const defaultProjectState = {
  projectTitle: '新規プロジェクト',
  episodes: [createEmptyEpisode('第1話')],
  activeEpisodeId: ''
};
defaultProjectState.activeEpisodeId = defaultProjectState.episodes[0].id;

// Load from local storage or use default
const savedState = localStorage.getItem(STORAGE_KEY);
let initialProjectState = defaultProjectState;

if (savedState) {
  try {
    const parsed = JSON.parse(savedState);
    if (parsed.episodes && parsed.episodes.length > 0) {
      // Modern format (multiple episodes)
      initialProjectState = {
        projectTitle: parsed.projectTitle || 'マイ・プロジェクト',
        episodes: parsed.episodes,
        activeEpisodeId: parsed.activeEpisodeId || parsed.episodes[0].id
      };
      
      // Populate rowCols for loaded pages if missing
      initialProjectState.episodes.forEach(ep => {
        ep.pages.forEach(p => {
          if (!p.rowCols) {
            const [cols, rows] = p.gridType.split('x').map(Number);
            p.rowCols = Array(rows).fill(cols);
          }
        });
      });
    } else if (parsed.pages && parsed.pages.length > 0) {
      // Old format migration (single episode)
      const migratedEpisode = {
        id: crypto.randomUUID(),
        title: "エピソード 1",
        pages: parsed.pages,
        currentSpreadIndex: parsed.currentSpreadIndex || 0,
        currentPageIndex: parsed.currentPageIndex || 0,
        firstPageIsSingle: parsed.firstPageIsSingle !== undefined ? parsed.firstPageIsSingle : true,
        rowGap: parsed.rowGap || 12,
        colGap: parsed.colGap || 6
      };
      
      migratedEpisode.pages.forEach(p => {
        if (!p.rowCols) {
          const [cols, rows] = p.gridType.split('x').map(Number);
          p.rowCols = Array(rows).fill(cols);
        }
      });

      initialProjectState = {
        projectTitle: 'マイ・プロジェクト',
        episodes: [migratedEpisode],
        activeEpisodeId: migratedEpisode.id
      };
    }
  } catch (e) {
    console.error("Failed to parse state", e);
  }
}

const savedToolbarOpen = localStorage.getItem('bd-paneling-toolbar-open');
const initialToolbarOpen = savedToolbarOpen !== null ? JSON.parse(savedToolbarOpen) : true;

// Define the reactive project state container
export const projectState = reactive({
  projectTitle: initialProjectState.projectTitle,
  episodes: initialProjectState.episodes,
  activeEpisodeId: initialProjectState.activeEpisodeId
});

// Helper getter computed property for active episode
export const activeEpisode = computed(() => {
  return projectState.episodes.find(e => e.id === projectState.activeEpisodeId) || projectState.episodes[0];
});

// Main store object with proxy getters/setters to map active episode fields
export const store = reactive({
  // Project-level fields
  projectTitle: computed({
    get: () => projectState.projectTitle,
    set: (val) => { projectState.projectTitle = val; }
  }),
  episodes: computed(() => projectState.episodes),
  activeEpisodeId: computed({
    get: () => projectState.activeEpisodeId,
    set: (val) => { projectState.activeEpisodeId = val; }
  }),

  // Episode-level proxy properties (auto-unwrapped when accessed)
  pages: computed({
    get: () => activeEpisode.value?.pages || [],
    set: (val) => { if (activeEpisode.value) activeEpisode.value.pages = val; }
  }),
  currentSpreadIndex: computed({
    get: () => activeEpisode.value?.currentSpreadIndex ?? 0,
    set: (val) => { if (activeEpisode.value) activeEpisode.value.currentSpreadIndex = val; }
  }),
  currentPageIndex: computed({
    get: () => activeEpisode.value?.currentPageIndex ?? 0,
    set: (val) => { if (activeEpisode.value) activeEpisode.value.currentPageIndex = val; }
  }),
  firstPageIsSingle: computed({
    get: () => activeEpisode.value?.firstPageIsSingle ?? true,
    set: (val) => { if (activeEpisode.value) activeEpisode.value.firstPageIsSingle = val; }
  }),
  rowGap: computed({
    get: () => activeEpisode.value?.rowGap ?? 12,
    set: (val) => { if (activeEpisode.value) activeEpisode.value.rowGap = val; }
  }),
  colGap: computed({
    get: () => activeEpisode.value?.colGap ?? 6,
    set: (val) => { if (activeEpisode.value) activeEpisode.value.colGap = val; }
  }),

  // Global UI properties
  fountainOutput: '',
  isToolbarOpen: initialToolbarOpen,
  isTimelineOpen: false,
});

// Bidirectional synchronization between currentSpreadIndex and currentPageIndex
watch(() => store.currentSpreadIndex, (newSpreadIdx) => {
  let expected;
  if (store.firstPageIsSingle) {
    expected = newSpreadIdx === 0 ? 0 : newSpreadIdx * 2 - 1;
  } else {
    expected = newSpreadIdx * 2;
  }
  if (store.currentPageIndex !== expected) {
    store.currentPageIndex = expected;
  }
});
watch(() => store.currentPageIndex, (newPageIdx) => {
  let expected;
  if (store.firstPageIsSingle) {
    expected = newPageIdx === 0 ? 0 : Math.floor((newPageIdx - 1) / 2) + 1;
  } else {
    expected = Math.floor(newPageIdx / 2);
  }
  if (store.currentSpreadIndex !== expected) {
    store.currentSpreadIndex = expected;
  }
});

// History state for Undo/Redo (Project-level snapshoting)
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
    projectTitle: projectState.projectTitle,
    episodes: projectState.episodes,
    activeEpisodeId: projectState.activeEpisodeId
  });

  // Prevent consecutive identical snapshots
  if (historyState.currentIndex >= 0 && historyState.history[historyState.currentIndex] === snapshot) {
    return;
  }

  // If we are not at the end of the history
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
  projectState.projectTitle = parsed.projectTitle;
  projectState.episodes = parsed.episodes;
  projectState.activeEpisodeId = parsed.activeEpisodeId;
}

// Watch for deep changes to automatically save history (debounced)
watch(() => [projectState.projectTitle, projectState.episodes, projectState.activeEpisodeId], () => {
  if (isRestoring) return;
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(() => {
    saveSnapshot();
  }, 400);
}, { deep: true, flush: 'sync' });

// Update active episode generated markdown whenever active pages change
watch(() => store.pages, () => {
  store.fountainOutput = generateFountainDocument(store.pages);
}, { deep: true, immediate: true });

// Auto-save Project to Local Storage
watch(() => projectState, (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, { deep: true });

// Auto-save toolbar open state
watch(() => store.isToolbarOpen, (newVal) => {
  localStorage.setItem('bd-paneling-toolbar-open', JSON.stringify(newVal));
});

// Project / Episode Management Actions
export function addEpisode(title = `第${projectState.episodes.length + 1}話`, pageCount = 4) {
  const newEp = createEmptyEpisode(title, pageCount);
  projectState.episodes.push(newEp);
  projectState.activeEpisodeId = newEp.id;
}

export function renameEpisode(id, newTitle) {
  const ep = projectState.episodes.find(e => e.id === id);
  if (ep) {
    ep.title = newTitle;
  }
}

export function deleteEpisode(id) {
  if (projectState.episodes.length <= 1) {
    alert("最後のエピソードは削除できません。");
    return;
  }
  const index = projectState.episodes.findIndex(e => e.id === id);
  if (index !== -1) {
    projectState.episodes.splice(index, 1);
    if (projectState.activeEpisodeId === id) {
      projectState.activeEpisodeId = projectState.episodes[Math.max(0, index - 1)].id;
    }
  }
}

export function resetProject(pageCount = 4) {
  projectState.projectTitle = '新規プロジェクト';
  const newEp = createEmptyEpisode('第1話');
  newEp.pages = [];
  for (let i = 0; i < pageCount; i++) {
    newEp.pages.push(createEmptyPage('3x4'));
  }
  newEp.currentSpreadIndex = 0;
  newEp.currentPageIndex = 0;

  projectState.episodes = [newEp];
  projectState.activeEpisodeId = newEp.id;
  
  // Clear undo/redo history to prevent garbage state restoring
  historyState.history = [];
  historyState.currentIndex = -1;
  saveSnapshot();
}

export function duplicateEpisode(id) {
  const ep = projectState.episodes.find(e => e.id === id);
  if (!ep) return;

  // Deep clone pages and regenerate UUIDs to prevent keys collision
  const clonedPages = JSON.parse(JSON.stringify(ep.pages));
  clonedPages.forEach(p => {
    p.id = crypto.randomUUID();
    p.panels.forEach(panel => {
      panel.id = crypto.randomUUID();
    });
  });

  const newEp = {
    id: crypto.randomUUID(),
    title: `${ep.title} コピー`,
    pages: clonedPages,
    currentSpreadIndex: ep.currentSpreadIndex,
    currentPageIndex: ep.currentPageIndex,
    firstPageIsSingle: ep.firstPageIsSingle,
    rowGap: ep.rowGap,
    colGap: ep.colGap
  };

  const index = projectState.episodes.findIndex(e => e.id === id);
  projectState.episodes.splice(index + 1, 0, newEp);
  projectState.activeEpisodeId = newEp.id;
}

// Page actions affecting the active episode
export function addPage() {
  store.pages.push(createEmptyPage('3x4'));
}

export function deletePage(index) {
  if (store.pages.length > 1) {
    store.pages.splice(index, 1);
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

  const defaultCols = insertRowIndex > 1 ? page.rowCols[insertRowIndex - 2] : 3;
  page.rowCols.splice(insertRowIndex - 1, 0, defaultCols);

  rebuildGridWithRowCols(page, oldCols, oldRowCols, insertRowIndex);

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
      isInset: false,
      plotColor: null
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

  const rowPanels = page.panels.filter(p => {
    const coords = p.cells.map(c => Math.ceil(c / cols));
    return coords.includes(rowIndex);
  });

  const spansMultipleRows = rowPanels.some(p => {
    const rows = p.cells.map(c => Math.ceil(c / cols));
    return Math.min(...rows) !== Math.max(...rows);
  });
  if (spansMultipleRows) return false;

  const expectedWidth = cols / C;
  return rowPanels.every(p => p.cells.length === expectedWidth);
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

  page.rowCols[rowIndex - 1] += 1;

  rebuildGridWithRowCols(page, oldCols, oldRowCols);

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
    isInset: false,
    plotColor: null
  });
}

// Delete a specific row (tier)
export function deleteRow(pageIndex, rowIndex) {
  const page = store.pages[pageIndex];
  if (!page) return;

  if (!page.rowCols) {
    const [cols, rows] = page.gridType.split('x').map(Number);
    page.rowCols = Array(rows).fill(cols);
  }

  if (page.rowCols.length <= 1) {
    alert("これ以上段を削除することはできません。");
    return;
  }

  const [oldCols] = page.gridType.split('x').map(Number);
  const oldRowCols = [...page.rowCols];

  page.rowCols.splice(rowIndex - 1, 1);

  rebuildGridWithRowColsDelete(page, oldCols, oldRowCols, rowIndex);
}

// Rebuild grid helper for row deletion
function rebuildGridWithRowColsDelete(page, oldCols, oldRowCols, deleteRowIndex) {
  const newCols = lcmArray(page.rowCols);
  
  page.panels.forEach(panel => {
    const uniqueKeys = new Set();
    panel.cells.forEach(c => {
      const r = Math.ceil(c / oldCols);
      if (r === deleteRowIndex) return;
      
      const col = ((c - 1) % oldCols) + 1;
      const C_r = oldRowCols[r - 1];
      const oldW = oldCols / C_r;
      const localCol = Math.floor((col - 1) / oldW) + 1;
      uniqueKeys.add(`${r}_${localCol}`);
    });
    
    const newCells = [];
    uniqueKeys.forEach(key => {
      const [rStr, cStr] = key.split('_');
      const r = parseInt(rStr, 10);
      const localCol = parseInt(cStr, 10);
      
      const new_r = r > deleteRowIndex ? r - 1 : r;
      const C_new = page.rowCols[new_r - 1];
      const newW = newCols / C_new;
      
      for (let k = 1; k <= newW; k++) {
        const cellId = (new_r - 1) * newCols + (localCol - 1) * newW + k;
        newCells.push(cellId);
      }
    });
    
    newCells.sort((a, b) => a - b);
    panel.cells = newCells;
  });
  
  page.panels = page.panels.filter(p => p.cells.length > 0);
  page.gridType = `${newCols}x${page.rowCols.length}`;
}

// Delete a specific panel
export function deletePanel(pageIndex, panelId) {
  const page = store.pages[pageIndex];
  if (!page) return;

  const panelIndex = page.panels.findIndex(p => p.id === panelId);
  if (panelIndex === -1) return;

  const panel = page.panels[panelIndex];
  const [cols] = page.gridType.split('x').map(Number);
  if (!page.rowCols) {
    const [c, r] = page.gridType.split('x').map(Number);
    page.rowCols = Array(r).fill(c);
  }

  const oldCols = cols;
  const oldRowCols = [...page.rowCols];

  const cellRows = panel.cells.map(c => Math.ceil(c / oldCols));
  const targetRow = cellRows[0];
  
  const C_r = oldRowCols[targetRow - 1];
  const oldW = oldCols / C_r;
  const cellsInRow = panel.cells.filter(c => Math.ceil(c / oldCols) === targetRow);
  const globalCols = cellsInRow.map(c => ((c - 1) % oldCols) + 1);
  const localCols = globalCols.map(c => Math.floor((c - 1) / oldW) + 1);
  const colStart = Math.min(...localCols);
  const colEnd = Math.max(...localCols) + 1;
  const span = colEnd - colStart;

  if (C_r === span) {
    deleteRow(pageIndex, targetRow);
    return;
  }

  page.rowCols[targetRow - 1] -= span;

  rebuildGridWithPanelDelete(page, oldCols, oldRowCols, targetRow, colStart, colEnd);
}

// Rebuild grid helper for panel deletion
function rebuildGridWithPanelDelete(page, oldCols, oldRowCols, targetRow, colStart, colEnd) {
  const span = colEnd - colStart;
  const newCols = lcmArray(page.rowCols);
  
  page.panels.forEach(panel => {
    const uniqueKeys = new Set();
    panel.cells.forEach(c => {
      const r = Math.ceil(c / oldCols);
      const col = ((c - 1) % oldCols) + 1;
      const C_r = oldRowCols[r - 1];
      const oldW = oldCols / C_r;
      const localCol = Math.floor((col - 1) / oldW) + 1;
      
      if (r === targetRow) {
        if (localCol >= colStart && localCol < colEnd) {
          return;
        }
        const newLocalCol = localCol >= colEnd ? localCol - span : localCol;
        uniqueKeys.add(`${r}_${newLocalCol}`);
      } else {
        uniqueKeys.add(`${r}_${localCol}`);
      }
    });
    
    const newCells = [];
    uniqueKeys.forEach(key => {
      const [rStr, cStr] = key.split('_');
      const r = parseInt(rStr, 10);
      const localCol = parseInt(cStr, 10);
      
      const C_new = page.rowCols[r - 1];
      const newW = newCols / C_new;
      
      for (let k = 1; k <= newW; k++) {
        const cellId = (r - 1) * newCols + (localCol - 1) * newW + k;
        newCells.push(cellId);
      }
    });
    
    newCells.sort((a, b) => a - b);
    panel.cells = newCells;
  });
  
  page.panels = page.panels.filter(p => p.cells.length > 0);
  page.gridType = `${newCols}x${page.rowCols.length}`;
}

export function importJson(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.episodes && parsed.episodes.length > 0) {
        // Modern format
        projectState.projectTitle = parsed.projectTitle || 'マイ・プロジェクト';
        projectState.episodes = parsed.episodes;
        projectState.activeEpisodeId = parsed.activeEpisodeId || parsed.episodes[0].id;
        
        projectState.episodes.forEach(ep => {
          ep.pages.forEach(p => {
            if (!p.rowCols) {
              const [cols, rows] = p.gridType.split('x').map(Number);
              p.rowCols = Array(rows).fill(cols);
            }
          });
        });
      } else if (parsed.pages && parsed.pages.length > 0) {
        // Old single-episode format migration
        const migratedEpisode = {
          id: crypto.randomUUID(),
          title: "エピソード 1",
          pages: parsed.pages,
          currentSpreadIndex: parsed.currentSpreadIndex || 0,
          currentPageIndex: parsed.currentPageIndex || 0,
          firstPageIsSingle: parsed.firstPageIsSingle !== undefined ? parsed.firstPageIsSingle : true,
          rowGap: parsed.rowGap || 12,
          colGap: parsed.colGap || 6
        };
        
        migratedEpisode.pages.forEach(p => {
          if (!p.rowCols) {
            const [cols, rows] = p.gridType.split('x').map(Number);
            p.rowCols = Array(rows).fill(cols);
          }
        });

        projectState.projectTitle = 'マイ・プロジェクト';
        projectState.episodes = [migratedEpisode];
        projectState.activeEpisodeId = migratedEpisode.id;
      } else {
        alert("インポートに失敗しました。正しいJSONファイルではありません。");
      }
    } catch (err) {
      alert("JSONファイルの読み込みに失敗しました。");
      console.error(err);
    }
  };
  reader.readAsText(file);
}

export function exportJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectState));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `${projectState.projectTitle || 'bd-project'}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function exportFountain() {
  const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(store.fountainOutput);
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `${activeEpisode.value?.title || 'bd-script'}.md`);
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

  const insetPanels = page.panels.filter(p => 
    !selectedIdsArray.includes(p.id) && 
    p.cells.every(cell => targetCells.includes(cell))
  );

  const panelsToAbsorb = page.panels.filter(p => 
    selectedIdsArray.includes(p.id) || 
    (p.cells.some(cell => targetCells.includes(cell)) && !insetPanels.includes(p))
  );

  panelsToAbsorb.sort((a, b) => Math.min(...a.cells) - Math.min(...b.cells));
  const combinedText = panelsToAbsorb.map(p => p.text).filter(t => t.trim() !== '').join('\n\n');

  page.panels = page.panels.filter(p => !panelsToAbsorb.includes(p));
  insetPanels.forEach(p => p.isInset = true);

  page.panels.push({
    id: crypto.randomUUID(),
    text: combinedText,
    cells: targetCells,
    isInset: false,
    plotColor: panelsToAbsorb[0]?.plotColor || null
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

  for (let i = 0; i < panel.cells.length; i += W) {
    const chunk = panel.cells.slice(i, i + W);
    page.panels.push({
      id: crypto.randomUUID(),
      text: i === 0 ? panel.text : '',
      cells: chunk,
      isInset: false,
      plotColor: i === 0 ? (panel.plotColor || null) : null
    });
  }
}
