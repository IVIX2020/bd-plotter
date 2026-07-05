export function parsePanelText(text) {
  if (!text) return { fountain: '', preview: [] };

  const blocks = text.split(/\n\s*\n/);
  let fountainLines = [];
  let previewLines = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    if (block.startsWith('(') || block.startsWith('（')) {
      fountainLines.push(`${block}\n`);
      previewLines.push({ type: 'action', content: block });
    } else if (block.startsWith('@') || block.startsWith('＠')) {
      const lines = block.split('\n');
      const name = lines[0].substring(1).trim();
      const dialogue = lines.slice(1).join('\n').trim();
      
      fountainLines.push(`${name.toUpperCase() || 'UNKNOWN'}\n${dialogue}\n`);
      previewLines.push({ type: 'dialogue-other', name: name, content: dialogue });
    } else {
      fountainLines.push(`PROTAGONIST\n${block}\n`);
      previewLines.push({ type: 'dialogue-protag', content: block });
    }
  }

  return {
    fountain: fountainLines.join('\n'),
    preview: previewLines
  };
}

export function generateFountainDocument(pages) {
  let doc = "";
  
  pages.forEach((page, index) => {
    if (index > 0) {
      doc += "\n---\n\n"; // Page break
    }
    doc += `## Page ${index + 1}\n\n`;
    
    if (page.plotInfo && page.plotInfo.trim()) {
      doc += `= ${page.plotInfo.trim()}\n\n`;
    }
    
    const cols = parseInt(page.gridType.split('x')[0], 10);
    
    // Sort panels based on X/Y coordinate order (Top-to-Bottom, Left-to-Right for BD)
    const sortedPanels = [...page.panels].sort((a, b) => {
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
      
      if (posA.y !== posB.y) return posA.y - posB.y;
      if (posA.x !== posB.x) return posA.x - posB.x;
      return (a.isInset === b.isInset) ? 0 : a.isInset ? 1 : -1;
    });
    
    sortedPanels.forEach((panel, pIndex) => {
      if (!panel.text.trim()) return;
      
      doc += `### Panel ${pIndex + 1}\n\n`;
      const parsed = parsePanelText(panel.text);
      doc += parsed.fountain + "\n";
    });
  });
  
  return doc.trim();
}
