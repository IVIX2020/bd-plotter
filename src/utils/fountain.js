export function parsePanelText(text, lastSpeaker = "CHARACTER") {
  if (!text) return { fountain: '', preview: [], lastSpeaker };

  // Split by single newlines to allow natural line-by-line dialogue writing
  const lines = text.split('\n');
  let fountainLines = [];
  let previewLines = [];
  let currentSpeaker = lastSpeaker;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 1. Monologue check: Speaker（Monologue） or （Monologue） or Speaker『Monologue』 or 『Monologue』
    const monologueMatch = line.match(/^([^「」\(\)（）『』:：\n]*)(?:[\(（]([^）\)]+)[\)）]|『([^』]+)』)$/);
    
    // 2. Dialogue quote check: Speaker「Dialogue」 or 「Dialogue」
    const quoteMatch = line.match(/^([^「」\(\)（）『』:：\n]*)「([^」]+)」$/);

    // 3. Dialogue colon check: Speaker: Dialogue
    const colonMatch = line.match(/^([^「」\(\)（）『』:：\n]+)[:：]\s*(.+)$/);

    if (monologueMatch) {
      const name = (monologueMatch[1] || '').trim();
      const content = (monologueMatch[2] || monologueMatch[3] || '').trim();
      
      if (name) {
        currentSpeaker = name;
      }
      
      // Fountain outputs voice-over monologue as @SPEAKER (V.O.)
      fountainLines.push(`@${currentSpeaker} (V.O.)\n${content}\n`);
      previewLines.push({
        type: 'monologue',
        name: currentSpeaker,
        content: content
      });
    }
    else if (quoteMatch) {
      const name = (quoteMatch[1] || '').trim();
      const content = quoteMatch[2].trim();
      
      if (name) {
        currentSpeaker = name;
      }
      
      fountainLines.push(`@${currentSpeaker}\n${content}\n`);
      previewLines.push({
        type: 'dialogue',
        name: currentSpeaker,
        content: content
      });
    }
    else if (colonMatch) {
      const name = colonMatch[1].trim();
      const content = colonMatch[2].trim();
      
      currentSpeaker = name;
      
      fountainLines.push(`@${currentSpeaker}\n${content}\n`);
      previewLines.push({
        type: 'dialogue',
        name: currentSpeaker,
        content: content
      });
    }
    else {
      // Action (ト書き)
      fountainLines.push(`${line}\n`);
      previewLines.push({
        type: 'action',
        content: line
      });
    }
  }

  // Join fountain output using double newlines for standard Fountain blocks
  return {
    fountain: fountainLines.join('\n'),
    preview: previewLines,
    lastSpeaker: currentSpeaker
  };
}

export function sortPanels(panels, gridType) {
  if (!panels || panels.length === 0) return [];
  const cols = parseInt(gridType.split('x')[0], 10);
  
  const getPanelBounds = (panel, cols) => {
    const cells = panel.cells || [1];
    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;
    
    cells.forEach(c => {
      const r = Math.ceil(c / cols);
      const col = ((c - 1) % cols) + 1;
      if (r < minRow) minRow = r;
      if (r > maxRow) maxRow = r;
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
    });
    
    return {
      rowStart: minRow,
      rowEnd: maxRow + 1, // exclusive
      colStart: minCol,
      colEnd: maxCol + 1  // exclusive
    };
  };

  const panelsWithBounds = panels.map(p => ({
    panel: p,
    bounds: getPanelBounds(p, cols)
  }));

  const N = panelsWithBounds.length;
  const adj = Array.from({ length: N }, () => []);
  
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      const u = panelsWithBounds[i].bounds;
      const v = panelsWithBounds[j].bounds;
      
      // Rule 1: Vertical ordering (u is completely above v and they share columns)
      const shareCol = Math.max(u.colStart, v.colStart) < Math.min(u.colEnd, v.colEnd);
      if (u.rowEnd <= v.rowStart && shareCol) {
        adj[i].push(j);
      }
      
      // Rule 2: Horizontal ordering (u is completely to the left of v and they share rows)
      const shareRow = Math.max(u.rowStart, v.rowStart) < Math.min(u.rowEnd, v.rowEnd);
      if (u.colEnd <= v.colStart && shareRow) {
        adj[i].push(j);
      }
    }
  }

  const hasPath = (uIndex, vIndex, adjList) => {
    const visited = new Set();
    const dfs = (curr) => {
      if (curr === vIndex) return true;
      visited.add(curr);
      for (const neighbor of adjList[curr]) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        }
      }
      return false;
    };
    return dfs(uIndex);
  };

  const sorted = [...panelsWithBounds].sort((a, b) => {
    const i = panelsWithBounds.findIndex(x => x.panel.id === a.panel.id);
    const j = panelsWithBounds.findIndex(x => x.panel.id === b.panel.id);
    
    if (hasPath(i, j, adj)) {
      return -1; // a comes before b
    }
    if (hasPath(j, i, adj)) {
      return 1;  // b comes before a
    }
    
    // Tie-breaker: standard reading order of the top-left corner
    if (a.bounds.rowStart !== b.bounds.rowStart) {
      return a.bounds.rowStart - b.bounds.rowStart;
    }
    if (a.bounds.colStart !== b.bounds.colStart) {
      return a.bounds.colStart - b.bounds.colStart;
    }
    return (a.panel.isInset === b.panel.isInset) ? 0 : a.panel.isInset ? 1 : -1;
  });

  return sorted.map(x => x.panel);
}

export function generateFountainDocument(pages) {
  let doc = "";
  let lastSpeaker = "CHARACTER";
  
  pages.forEach((page, index) => {
    if (index > 0) {
      doc += "\n---\n\n"; // Page break
    }
    doc += `## Page ${index + 1}\n\n`;
    
    if (page.plotInfo && page.plotInfo.trim()) {
      doc += `= ${page.plotInfo.trim()}\n\n`;
    }
    
    // Sort panels based on BD reading order rules
    const sortedPanels = sortPanels(page.panels, page.gridType);
    
    sortedPanels.forEach((panel, pIndex) => {
      if (!panel.text.trim()) return;
      
      doc += `### Panel ${pIndex + 1}\n\n`;
      const parsed = parsePanelText(panel.text, lastSpeaker);
      lastSpeaker = parsed.lastSpeaker; // carry speaker name forward
      doc += parsed.fountain + "\n";
    });
  });
  
  return doc.trim();
}
