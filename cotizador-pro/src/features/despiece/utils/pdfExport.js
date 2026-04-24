import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Helper function to serialize sheet layout for comparison
function serializeSheetLayout(sheet) {
  const pieces = sheet.pieces.map(piece => ({
    x: piece.x,
    y: piece.y,
    width: piece.width,
    height: piece.height,
    rotated: piece.rotated,
    label: piece.label
  })).sort((a, b) => {
    // Sort by position to ensure consistent comparison
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  return JSON.stringify(pieces);
}

// Group identical sheet patterns
export function groupIdenticalSheets(sheets) {
  const groups = [];
  const seen = new Map();

  sheets.forEach((sheet, index) => {
    const key = serializeSheetLayout(sheet);
    
    if (seen.has(key)) {
      seen.get(key).count++;
      seen.get(key).indices.push(index + 1); // +1 for 1-based indexing
    } else {
      const newGroup = {
        sheet: sheet,
        count: 1,
        indices: [index + 1]
      };
      seen.set(key, newGroup);
      groups.push(newGroup);
    }
  });

  return groups;
}

// Generate PDF from sheet preview
export async function generateNestingPDF({
  sheets,
  unplacedPieces,
  projectName,
  clientName,
  materialName,
  paperSize = 'Carta',
  boardWidth,
  boardHeight,
  usableWidth,
  usableHeight,
  cantos = [],
  rows = [],
  variant = 'default'
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: getPaperSizeFormat(paperSize)
  });

  // Group identical sheets
  const sheetGroups = groupIdenticalSheets(sheets);

  // Add each sheet group
  let currentPage = 1;
  
  for (const group of sheetGroups) {
    const { sheet, count, indices } = group;

    // Add professional header for each page
    addProfessionalHeader(doc, projectName, clientName, materialName);
    
    // Section title only for non-V13 variants; V13 uses cleaner single-title hierarchy
    if (variant !== 'v13' && variant !== 'v14' && variant !== 'v15' && variant !== 'v16' && variant !== 'v17' && variant !== 'v17b' && variant !== 'v17c' && variant !== 'v17d' && variant !== 'v18' && variant !== 'v20') {
      addSectionTitle(doc, 'PLANO DE CORTE (Vista de Lámina)', 50);
    }
    
    // Add sheet title - simple and clean
    if (count > 1) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Lámina ${indices.join('/')} (${count}x idénticas)`, 15, 65);
    } else {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Lámina ${indices[0]}`, 15, 65);
    }

    // Add sheet visualization inside bordered box
    addBoxedSheetVisualization(doc, sheet, boardWidth, boardHeight, usableWidth, usableHeight, cantos, rows, variant);

    // V9: Layout-safe implementation - check if table fits on current page
    if (variant === 'v9') {
      // Calculate available space after visualization
      const currentYPosition = doc.internal.getCurrentPageInfo().autoTable ? 
        doc.internal.getCurrentPageInfo().autoTable.finalY + 10 : 220;
      
      // Check if we have enough space for table (minimum 60mm needed)
      const pageHeight = doc.internal.pageSize.getHeight();
      const spaceAvailable = pageHeight - currentYPosition;
      
      if (spaceAvailable < 60) {
        // Not enough space - move table to new page
        doc.addPage();
        addProfessionalHeader(doc, projectName, clientName, materialName);
        doc.setFontSize(12);
        doc.text('Tabla de piezas (continuación)', 15, 65);
      }
    }

    if (variant === 'v16' || variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d' || variant === 'v18' || variant === 'v20') {
      doc.addPage();
      addProfessionalHeader(doc, projectName, clientName, materialName);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Lámina ${count > 1 ? indices.join('/') : indices[0]} - Detalles`, 15, 65);
      addPiecesTable(doc, sheet.pieces, cantos, rows, variant);
      addFinalSummary(doc, sheet.pieces, variant);
    } else {
      // Add pieces table (removed the "DETALLES DE PIEZAS Y RESUMEN" section title as requested)
      addPiecesTable(doc, sheet.pieces, cantos, rows, variant);

      // Add final summary block
      addFinalSummary(doc, sheet.pieces, variant);
    }

    // Add page break if not last group
    if (group !== sheetGroups[sheetGroups.length - 1]) {
      doc.addPage();
      currentPage++;
    }
  }

  // Add unplaced pieces section if any
  if (unplacedPieces && unplacedPieces.length > 0) {
    if (sheetGroups.length > 0) {
      doc.addPage();
      addProfessionalHeader(doc, projectName, clientName, materialName);
    }
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Piezas sin ubicar', 15, 65);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    let yPos = 75;
    
    unplacedPieces.forEach((piece, index) => {
      if (yPos > 270) { // Near bottom of page
        doc.addPage();
        addProfessionalHeader(doc, projectName, clientName, materialName);
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Piezas sin ubicar (continuación)', 15, 65);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        yPos = 75;
      }
      
      doc.text(`${index + 1}. ${piece.label} - ${piece.width}x${piece.height} mm`, 15, yPos);
      yPos += 7;
    });
  }

  return doc;
}

function getPaperSizeFormat(paperSize) {
  const formats = {
    'Carta': [215.9, 279.4], // 8.5 x 11 inches in mm
    'A4': [210, 297],        // A4 in mm
    'Oficio': [215.9, 355.6] // 8.5 x 14 inches in mm
  };
  
  return formats[paperSize] || formats['Carta'];
}

function addProfessionalHeader(doc, projectName, clientName, materialName) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Main document title - simple and clean
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PLANO DE CORTE', pageWidth / 2, 20, { align: 'center' });
  
  // Generation date - simple
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const date = new Date().toLocaleDateString();
  doc.text(`Fecha: ${date}`, pageWidth - 15, 20, { align: 'right' });
  
  // Header info - clean and simple
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text('Proyecto:', 20, 35);
  doc.text(projectName, 50, 35);
  
  doc.text('Cliente:', 20, 45);
  doc.text(clientName, 50, 45);
  
  if (materialName) {
    doc.text('Material:', 20, 55);
    doc.text(materialName, 50, 55);
  }
  
  // V13 removes this horizontal rule to avoid crossing the plan area in compact layouts
}

function addSectionTitle(doc, title, yPosition) {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  // Simple section title - no underline, just clean text
  doc.text(title, 15, yPosition);
}

// Helper function to check if a label would collide with other pieces
function checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, labelX, labelY, labelWidth, allPieces, scale, startX, startY, isVertical = false) {
  // Convert label position to board coordinates for collision detection
  const boardLabelX = (labelX - startX) / scale;
  const boardLabelY = (labelY - startY) / scale;
  
  // Define collision buffer area around the label
  const collisionBuffer = 3; // mm buffer
  
  // Check if label would overlap with any other piece
  for (const otherPiece of allPieces) {
    // Skip self
    if (otherPiece.x === (pieceX - startX) / scale && otherPiece.y === (pieceY - startY) / scale) {
      continue;
    }
    
    // Check if label area overlaps with other piece
    const otherPieceX = otherPiece.x;
    const otherPieceY = otherPiece.y;
    const otherPieceWidth = otherPiece.width;
    const otherPieceHeight = otherPiece.height;
    
    // For vertical labels, the collision area is different
    if (isVertical) {
      // Vertical label collision detection
      const labelTop = boardLabelY - collisionBuffer;
      const labelBottom = boardLabelY + labelWidth + collisionBuffer;
      const labelLeft = boardLabelX - collisionBuffer;
      const labelRight = boardLabelX + collisionBuffer;
      
      if (!(labelBottom < otherPieceY || labelTop > otherPieceY + otherPieceHeight ||
            labelRight < otherPieceX || labelLeft > otherPieceX + otherPieceWidth)) {
        return true; // Collision detected
      }
    } else {
      // Horizontal label collision detection
      const labelLeft = boardLabelX - collisionBuffer;
      const labelRight = boardLabelX + labelWidth + collisionBuffer;
      const labelTop = boardLabelY - collisionBuffer;
      const labelBottom = boardLabelY + 7 + collisionBuffer; // 7mm is approx font height
      
      if (!(labelRight < otherPieceX || labelLeft > otherPieceX + otherPieceWidth ||
            labelBottom < otherPieceY || labelTop > otherPieceY + otherPieceHeight)) {
        return true; // Collision detected
      }
    }
  }
  
  return false; // No collision
}

// Helper function to render leftover/free areas (sobrante)
function addFreeAreas(doc, sheet, startX, startY, scale, boardWidth, boardHeight, variant = 'default') {
  if (!sheet.freeRects || sheet.freeRects.length === 0) return;
  
  // V8: Even more subtle leftover areas
  const grayValue = variant === 'v8' ? 220 : 200;
  doc.setDrawColor(grayValue, grayValue, grayValue); // Very light gray for V8
  doc.setLineWidth(variant === 'v8' ? 0.05 : 0.08); // Even thinner line for V8
  doc.setLineDash(variant === 'v8' ? [3, 4] : [2, 3]); // More subtle dashed pattern with longer gaps for V8
    
    sheet.freeRects.forEach(rect => {
      // Only render reasonably sized free areas (filter out tiny slivers)
      if (rect.width < 5 || rect.height < 5) return;
          
      const rectX = startX + rect.x * scale;
      const rectY = startY + rect.y * scale;
      const rectWidth = rect.width * scale;
      const rectHeight = rect.height * scale;
          
      // Draw very subtle dashed border around free area
      doc.rect(rectX, rectY, rectWidth, rectHeight, 'S');
    });
   
  // Reset line style
  doc.setLineDash([]);
}

function addBoxedSheetVisualization(doc, sheet, boardWidth, boardHeight, usableWidth, usableHeight, cantos = [], rows = [], variant = 'default') {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // V9: Layout-safe implementation with reserved zones
  // V8: Use more page space effectively - larger visualization area
  // V12: Even larger visualization with reduced margins and cleaner hierarchy
  const maxVisualizationWidth = variant === 'v20' ? pageWidth - 22 : (variant === 'v18' ? pageWidth - 18 : ((variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d') ? pageWidth - 24 : (variant === 'v16' ? pageWidth - 12 : (variant === 'v15' ? pageWidth - 18 : (variant === 'v14' ? pageWidth - 24 : pageWidth - 30)))));
  const maxVisualizationHeight = variant === 'v20' ? 198 : (variant === 'v18' ? 205 : ((variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d') ? 190 : (variant === 'v16' ? 235 : (variant === 'v15' ? 190 : (variant === 'v14' ? 175 : (variant === 'v13' ? 185 : (variant === 'v12' ? 170 : (variant === 'v11' ? 160 : (variant === 'v9' ? 140 : (variant === 'v8' ? 150 : 120))))))))));
  
  // V8: Better scaling that uses page space more effectively
  const scale = Math.min(
    maxVisualizationWidth / boardWidth,
    maxVisualizationHeight / boardHeight
  );
  
  const scaledWidth = boardWidth * scale;
  const scaledHeight = boardHeight * scale;
  
  // V8: Centered both horizontally and vertically in the available space
  // V12: Start higher to maximize vertical space with cleaner hierarchy
  const startX = variant === 'v20' ? (pageWidth - scaledWidth) / 2 : (variant === 'v18' ? (pageWidth - scaledWidth) / 2 : (((variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d')) ? (pageWidth - scaledWidth) / 2 : (variant === 'v16' ? 10 : (variant === 'v15' ? 24 : (pageWidth - scaledWidth) / 2))));
  const startY = variant === 'v20' ? 76 : (variant === 'v18' ? 70 : (((variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d')) ? 78 : (variant === 'v16' ? 38 : (variant === 'v15' ? 68 : (variant === 'v14' ? 72 : (variant === 'v13' ? 48 : (variant === 'v12' ? 60 : (variant === 'v11' ? 65 : (variant === 'v9' ? 75 : (variant === 'v8' ? 70 : 75))))))))));
  
  // Draw main bordered box for the sheet visualization - cleaner and simpler
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(startX - 5, startY - 5, scaledWidth + 10, scaledHeight + 10, 'S');
  
  // Draw board outline - simple black border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(startX, startY, scaledWidth, scaledHeight, 'S');
  
  // Draw usable area - very subtle dashed line
  const usableStartX = startX + ((boardWidth - usableWidth) / 2) * scale;
  const usableStartY = startY + ((boardHeight - usableHeight) / 2) * scale;
  const usableScaledWidth = usableWidth * scale;
  const usableScaledHeight = usableHeight * scale;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.setLineDash([2, 2]); // Very subtle dashed line for usable area
  doc.rect(usableStartX, usableStartY, usableScaledWidth, usableScaledHeight, 'S');
  doc.setLineDash([]); // Reset line dash
  
  // Draw pieces - simple black borders only
  sheet.pieces.forEach(piece => {
    const pieceX = startX + piece.x * scale;
    const pieceY = startY + piece.y * scale;
    const pieceWidth = piece.width * scale;
    const pieceHeight = piece.height * scale;
    
    // V8: Slightly thicker borders for better visibility
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(variant === 'v8' ? 0.3 : 0.2);
    doc.rect(pieceX, pieceY, pieceWidth, pieceHeight, 'S');
    
    // Get canto info for this piece
    const cantoInfo = getPieceCantoInfo(piece, rows, cantos);
 
      // Simplified labeling - only show essential information
      // Keep only: largo (width), ancho (height), and canto útil (human-readable)
      // V8: More aggressive anti-collision - larger minimum space requirements
      const showWidthLabel = pieceWidth >= (variant === 'v8' ? 20 : 15) && pieceHeight >= 6; 
      const showHeightLabel = pieceHeight >= (variant === 'v8' ? 20 : 15) && pieceWidth >= 6;
      const showCantoLabels = pieceWidth * pieceHeight >= (variant === 'v8' ? 60 : 40); 
     
      // Only show labels if there's enough space to avoid clutter
      if (showWidthLabel || showHeightLabel || showCantoLabels) {
        doc.setFontSize((variant === 'v8' || variant === 'v15' || variant === 'v17b' || variant === 'v17c' || variant === 'v18' || variant === 'v20') ? 7 : 6);
        doc.setTextColor(0, 0, 0); // Plain black text only
          
          // V8: Stronger anti-collision behavior
          if (variant === 'v8') {
            // V8: Dimensions first priority, canto second priority
            // Only show width label if it won't collide
            if (showWidthLabel) {
              const widthText = `${piece.width}`;
              const widthTextWidth = doc.getTextWidth(widthText);
              const widthTextX = pieceX + 2;
              const widthTextY = pieceY + pieceHeight + 1;
              
              // Check for collisions with other pieces
              const canShowWidth = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, widthTextX, widthTextY, widthTextWidth, sheet.pieces, scale, startX, startY);
              if (canShowWidth) {
                doc.text(widthText, widthTextX, widthTextY);
              }
            } 
            
            // Only show height label if it won't collide
            if (showHeightLabel) {
              const heightText = `${piece.height}`;
              const heightTextWidth = doc.getTextWidth(heightText);
              const heightTextX = pieceX - (heightTextWidth + 2);
              const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2);
              
              // Check for collisions
              const canShowHeight = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, heightTextX, heightTextY, heightTextWidth, sheet.pieces, scale, startX, startY, true);
              if (canShowHeight) {
                doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
              }
            }
            
            // Canto labels - lower priority, only show if dimensions are shown and no collision
            if (cantoInfo && showCantoLabels && (showWidthLabel || showHeightLabel)) {
              doc.setFontSize(5);
              doc.setTextColor(0, 0, 0);
              
              // Bottom edge cantos
              const bottomCantoLabels = [];
              if (cantoInfo.l1) bottomCantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
              if (cantoInfo.l2 && cantoInfo.l2.codigo !== cantoInfo.l1?.codigo) {
                bottomCantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
              }
              
              if (bottomCantoLabels.length > 0) {
                const cantoText = bottomCantoLabels.join(' ');
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX + 2;
                const cantoTextY = pieceY + pieceHeight + 6;
                
                // Check collision for canto label
                const canShowCanto = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY);
                if (canShowCanto) {
                  doc.text(cantoText, cantoTextX, cantoTextY);
                }
              }
              
              // Left edge cantos
              const leftCantoLabels = [];
              if (cantoInfo.a1) leftCantoLabels.push(`${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim());
              if (cantoInfo.a2 && cantoInfo.a2.codigo !== cantoInfo.a1?.codigo) {
                leftCantoLabels.push(`${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim());
              }
              
              if (leftCantoLabels.length > 0) {
                const cantoText = leftCantoLabels.join(' ');
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX - (cantoTextWidth + 2);
                const cantoTextY = pieceY + 5;
                
                // Check collision for left canto label
                const canShowCanto = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, true);
                if (canShowCanto) {
                  doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
                }
              }
            }
          } else if (variant === 'v7') {
            // V5: Workshop-specific layout
            // Bottom edge: dimension first, canto directly below
            if (showWidthLabel) {
              const widthText = `${piece.width}`;
              const widthTextWidth = doc.getTextWidth(widthText);
              const widthTextX = pieceX + 2; // Fixed small offset from lower-left corner toward center
              const widthTextY = pieceY + pieceHeight + 1; // Just below piece on bottom edge
              doc.text(widthText, widthTextX, widthTextY);
            } 
            
            // Canto on bottom edge - directly below dimension
            if (cantoInfo && showCantoLabels) {
              doc.setFontSize(5); // Small but readable
              doc.setTextColor(0, 0, 0); // Plain black text
              
              // V5: Individual canto labels per edge, not concatenated
              // Bottom edge cantos (l1, l2)
              if (cantoInfo.l1) {
                const cantoText = `${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim();
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX + 2; // Same anchor as dimension
                const cantoTextY = pieceY + pieceHeight + 6; // Below dimension
                doc.text(cantoText, cantoTextX, cantoTextY);
              }
              
              if (cantoInfo.l2 && cantoInfo.l2.codigo !== cantoInfo.l1?.codigo) {
                const cantoText = `${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim();
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX + 2 + 15; // Offset to avoid overlap
                const cantoTextY = pieceY + pieceHeight + 6; // Same line as l1
                doc.text(cantoText, cantoTextX, cantoTextY);
              }
            }
            
            // Left edge: dimension vertical upward, canto directly associated
            if (showHeightLabel) {
              const heightText = `${piece.height}`;
              const heightTextWidth = doc.getTextWidth(heightText);
              const heightTextX = pieceX - (heightTextWidth + 2); // Left of piece on left edge
              const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2); // Centered vertically on left edge
              doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
            }
            
            // Left edge cantos (a1, a2) - stacked near dimension
            if (cantoInfo && showCantoLabels) {
              if (cantoInfo.a1) {
                const cantoText = `${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim();
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX - (cantoTextWidth + 2); // Same anchor as height dimension
                const cantoTextY = pieceY + pieceHeight - 5; // Near bottom of left edge
                doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
              }
              
              if (cantoInfo.a2 && cantoInfo.a2.codigo !== cantoInfo.a1?.codigo) {
                const cantoText = `${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim();
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX - (cantoTextWidth + 2); // Same anchor as height dimension
                const cantoTextY = pieceY + 5; // Near top of left edge
                doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
              }
            }
           } else if (variant === 'v7') {
            // V7 minimal técnica - stricter simplification
            // Only show bottom and left information for each piece
            // Bottom edge: largo dimension with canto inferior below
            // Left edge: ancho dimension with canto izquierdo associated
            // Do NOT show top/right canto labels in the drawing
            
            if (showWidthLabel) {
              const widthText = `${piece.width}`;
              const widthTextWidth = doc.getTextWidth(widthText);
              const widthTextX = pieceX + 2; // Fixed small offset from lower-left corner toward center
              const widthTextY = pieceY + pieceHeight + 1; // Just below piece on bottom edge
              doc.text(widthText, widthTextX, widthTextY);
            } 
              
            // Canto inferior on bottom edge - directly below dimension
            if (cantoInfo && showCantoLabels && (cantoInfo.l1 || cantoInfo.l2)) {
              doc.setFontSize(5); // Small but readable
              doc.setTextColor(0, 0, 0); // Plain black text
               
              // Only show bottom edge cantos (l1, l2) - no top/right
              const bottomCantoLabels = [];
              if (cantoInfo.l1) bottomCantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
              if (cantoInfo.l2 && cantoInfo.l2.codigo !== cantoInfo.l1?.codigo) {
                bottomCantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
              }
               
              if (bottomCantoLabels.length > 0) {
                const cantoText = bottomCantoLabels.join(' ');
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX + 2; // Same anchor as width dimension
                const cantoTextY = pieceY + pieceHeight + 6; // Below width label
                doc.text(cantoText, cantoTextX, cantoTextY);
              }
            }
             
            // Left edge: ancho dimension
            if (showHeightLabel) {
              const heightText = `${piece.height}`;
              const heightTextWidth = doc.getTextWidth(heightText);
              const heightTextX = pieceX - (heightTextWidth + 2); // Left of piece on left edge
              const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2); // Centered vertically on left edge
              doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
            }
             
            // Canto izquierdo on left edge - associated with height dimension
            if (cantoInfo && showCantoLabels && (cantoInfo.a1 || cantoInfo.a2)) {
              doc.setFontSize(5); // Small but readable
              doc.setTextColor(0, 0, 0); // Plain black text
               
              // Only show left edge cantos (a1, a2) - no top/right
              const leftCantoLabels = [];
              if (cantoInfo.a1) leftCantoLabels.push(`${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim());
              if (cantoInfo.a2 && cantoInfo.a2.codigo !== cantoInfo.a1?.codigo) {
                leftCantoLabels.push(`${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim());
              }
               
              if (leftCantoLabels.length > 0) {
                const cantoText = leftCantoLabels.join(' ');
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX - (cantoTextWidth + 2); // Same anchor as height dimension
                const cantoTextY = pieceY + 5; // Near top of left edge to avoid overlap with height label
                doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
              }
            }
            } else if (variant === 'v11') {
              // V11 improved layout - larger plan, less margin, more readable labels, less crowded left side
              // Use larger font sizes for better readability
              // More aggressive space utilization with reduced margins
              // Better label positioning to reduce left-side crowding

              if (showWidthLabel) {
                const widthText = `${piece.width}`;
                const widthTextWidth = doc.getTextWidth(widthText);
                const widthTextX = pieceX + 2; // Fixed small offset from lower-left corner toward center
                const widthTextY = pieceY + pieceHeight + 1; // Just below piece on bottom edge
                doc.text(widthText, widthTextX, widthTextY);
              } 
                 
              // Bottom canto - only show if there's enough room and it won't collide
              if (cantoInfo && showCantoLabels && (cantoInfo.l1 || cantoInfo.l2)) {
                doc.setFontSize(6); // V11: Slightly larger font for better readability
                doc.setTextColor(0, 0, 0); // Plain black text
                  
                // Only show bottom edge cantos (l1, l2) - no top/right
                const bottomCantoLabels = [];
                if (cantoInfo.l1) bottomCantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
                if (cantoInfo.l2 && cantoInfo.l2.codigo !== cantoInfo.l1?.codigo) {
                  bottomCantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
                }
                  
                if (bottomCantoLabels.length > 0) {
                  const cantoText = bottomCantoLabels.join(' ');
                  const cantoTextWidth = doc.getTextWidth(cantoText);
                  const cantoTextX = pieceX + 2; // Same anchor as width dimension
                  const cantoTextY = pieceY + pieceHeight + 6; // Below width label
                  
                  // Check if there's enough room for canto label (minimum 15mm width for the piece)
                  // and check for collisions
                  const hasRoomForCanto = pieceWidth >= 15;
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY);
                  
                  if (canShowCanto) {
                    doc.text(cantoText, cantoTextX, cantoTextY);
                  }
                }
              }
                
              // Left edge: ancho dimension
              if (showHeightLabel) {
                const heightText = `${piece.height}`;
                const heightTextWidth = doc.getTextWidth(heightText);
                const heightTextX = pieceX - (heightTextWidth + 2); // Left of piece on left edge
                const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2); // Centered vertically on left edge
                doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
              }
                
              // Left canto - only show if there's enough room and it won't collide
              // V11: Position canto labels further from height labels to reduce crowding
              if (cantoInfo && showCantoLabels && (cantoInfo.a1 || cantoInfo.a2)) {
                doc.setFontSize(6); // V11: Slightly larger font for better readability
                doc.setTextColor(0, 0, 0); // Plain black text
                  
                // Only show left edge cantos (a1, a2) - no top/right
                const leftCantoLabels = [];
                if (cantoInfo.a1) leftCantoLabels.push(`${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim());
                if (cantoInfo.a2 && cantoInfo.a2.codigo !== cantoInfo.a1?.codigo) {
                  leftCantoLabels.push(`${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim());
                }
                  
                if (leftCantoLabels.length > 0) {
                  const cantoText = leftCantoLabels.join(' ');
                  const cantoTextWidth = doc.getTextWidth(cantoText);
                  const cantoTextX = pieceX - (cantoTextWidth + 2); // Same anchor as height dimension
                  const cantoTextY = pieceY + 10; // V11: Position further from height label to reduce crowding
                  
                  // Check if there's enough room for canto label (minimum 15mm height for the piece)
                  // and check for collisions
                  const hasRoomForCanto = pieceHeight >= 15;
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, true);
                  
                  if (canShowCanto) {
                    doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
                  }
                }
              }
            } else if (variant === 'v10') {
              // V10 clean conservative implementation
              // Treat each piece as having two local label blocks only:
              // - bottom block = bottom dimension + bottom canto
              // - left block = left dimension + left canto
              // Do NOT show canto on a piece if there is not enough room for it cleanly
              // On small pieces, prefer showing only dimensions and leave canto to the table
              // Do NOT let canto float away from the edge it belongs to
              // Keep top/right canto off the plan

              if (showWidthLabel) {
                const widthText = `${piece.width}`;
                const widthTextWidth = doc.getTextWidth(widthText);
                const widthTextX = pieceX + 2; // Fixed small offset from lower-left corner toward center
                const widthTextY = pieceY + pieceHeight + 1; // Just below piece on bottom edge
                doc.text(widthText, widthTextX, widthTextY);
              } 
                 
              // Bottom canto - only show if there's enough room and it won't collide
              if (cantoInfo && showCantoLabels && (cantoInfo.l1 || cantoInfo.l2)) {
                doc.setFontSize(5); // Small but readable
                doc.setTextColor(0, 0, 0); // Plain black text
                  
                // Only show bottom edge cantos (l1, l2) - no top/right
                const bottomCantoLabels = [];
                if (cantoInfo.l1) bottomCantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
                if (cantoInfo.l2 && cantoInfo.l2.codigo !== cantoInfo.l1?.codigo) {
                  bottomCantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
                }
                  
                if (bottomCantoLabels.length > 0) {
                  const cantoText = bottomCantoLabels.join(' ');
                  const cantoTextWidth = doc.getTextWidth(cantoText);
                  const cantoTextX = pieceX + 2; // Same anchor as width dimension
                  const cantoTextY = pieceY + pieceHeight + 6; // Below width label
                  
                  // Check if there's enough room for canto label (minimum 15mm width for the piece)
                  // and check for collisions
                  const hasRoomForCanto = pieceWidth >= 15;
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY);
                  
                  if (canShowCanto) {
                    doc.text(cantoText, cantoTextX, cantoTextY);
                  }
                }
              }
                
              // Left edge: ancho dimension
              if (showHeightLabel) {
                const heightText = `${piece.height}`;
                const heightTextWidth = doc.getTextWidth(heightText);
                const heightTextX = pieceX - (heightTextWidth + 2); // Left of piece on left edge
                const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2); // Centered vertically on left edge
                doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
              }
                
              // Left canto - only show if there's enough room and it won't collide
              if (cantoInfo && showCantoLabels && (cantoInfo.a1 || cantoInfo.a2)) {
                doc.setFontSize(5); // Small but readable
                doc.setTextColor(0, 0, 0); // Plain black text
                  
                // Only show left edge cantos (a1, a2) - no top/right
                const leftCantoLabels = [];
                if (cantoInfo.a1) leftCantoLabels.push(`${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim());
                if (cantoInfo.a2 && cantoInfo.a2.codigo !== cantoInfo.a1?.codigo) {
                  leftCantoLabels.push(`${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim());
                }
                  
                if (leftCantoLabels.length > 0) {
                  const cantoText = leftCantoLabels.join(' ');
                  const cantoTextWidth = doc.getTextWidth(cantoText);
                  const cantoTextX = pieceX - (cantoTextWidth + 2); // Same anchor as height dimension
                  const cantoTextY = pieceY + 5; // Near top of left edge to avoid overlap with height label
                  
                  // Check if there's enough room for canto label (minimum 15mm height for the piece)
                  // and check for collisions
                  const hasRoomForCanto = pieceHeight >= 15;
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, true);
                  
                  if (canShowCanto) {
                    doc.text(cantoText, cantoTextX, cantoTextY, { angle: -90 });
                  }
                }
              }
            } else {
            // Default variant (V4 and earlier)
            // Width label (Largo) - anchored from lower-left corner with fixed small offset toward center
            if (showWidthLabel) {
              const widthText = `${piece.width}`;
              const widthTextWidth = doc.getTextWidth(widthText);
              const widthTextX = pieceX + (variant === 'v17c' ? 3 : 2); // Micro-adjusted offset for V17c
              const widthTextY = pieceY + pieceHeight + 1; // Just below piece on bottom edge
              doc.text(widthText, widthTextX, widthTextY);
            } 
              
            // Height label (Ancho) - anchored on left edge, starting from lower-left corner and going upward
            if (showHeightLabel) {
              const heightText = `${piece.height}`;
              const heightTextWidth = doc.getTextWidth(heightText);
              const heightTextX = (variant === 'v17d') ? (pieceX + 3) : (pieceX - (variant === 'v17c' ? (heightTextWidth + 1) : (heightTextWidth + 2))); // V17d moves height label just inside the piece edge
              const heightTextY = pieceY + (pieceHeight / 2) + (heightTextWidth / 2); // Centered vertically on left edge
              doc.text(heightText, heightTextX, heightTextY, { angle: -90 });
            }
            
            // Canto labels - anchored below corresponding dimension on same useful edge, in human-friendly form
            if (cantoInfo && showCantoLabels) {
              doc.setFontSize((variant === 'v17b' || variant === 'v17c' || variant === 'v17d') ? 6 : 5); // Slightly larger for refined V17 variants
              doc.setTextColor(0, 0, 0); // Plain black text
                  
              // Refined V17b: show only one useful bottom canto label to reduce clutter
              const cantoLabels = [];
              if (variant === 'v17b' || variant === 'v17c' || variant === 'v17d') {
                if (cantoInfo.l1) cantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
                else if (cantoInfo.l2) cantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
              } else {
                if (cantoInfo.l1) cantoLabels.push(`${cantoInfo.l1.codigo} ${cantoInfo.l1.calibre}`.trim());
                if (cantoInfo.l2) cantoLabels.push(`${cantoInfo.l2.codigo} ${cantoInfo.l2.calibre}`.trim());
                if (cantoInfo.a1) cantoLabels.push(`${cantoInfo.a1.codigo} ${cantoInfo.a1.calibre}`.trim());
                if (cantoInfo.a2) cantoLabels.push(`${cantoInfo.a2.codigo} ${cantoInfo.a2.calibre}`.trim());
              }
                 
              // Filter out duplicates and join with spaces
              const uniqueCantoLabels = [...new Set(cantoLabels)];
              if (uniqueCantoLabels.length > 0) {
                const cantoText = uniqueCantoLabels.join(' ');
                const cantoTextWidth = doc.getTextWidth(cantoText);
                const cantoTextX = pieceX + ((variant === 'v17b' || variant === 'v17c' || variant === 'v17d') ? 3 : 2);
                const cantoTextY = pieceY + pieceHeight + (variant === 'v17d' ? 3 : (variant === 'v17c' ? 4 : 6)); // V17d moves canto closer to dimension
                doc.text(cantoText, cantoTextX, cantoTextY);
              }
            }
          }
      }
      // Tiny pieces: no labels (cleaner look)
  });
  
  // Render leftover/free areas (sobrante) - very subtle
  addFreeAreas(doc, sheet, startX, startY, scale, boardWidth, boardHeight, variant);
}



// Helper function to resolve canto information
function resolveCantoInfo(ref, cantos) {
  if (!ref || !cantos || !Array.isArray(cantos)) return null;
  
  const canto = cantos.find(c => Number(c.ref) === Number(ref));
  if (!canto) return null;
  
  // Return compact format: codigo · calibre
  return {
    codigo: canto.codigo || canto.nombre || `Canto ${ref}`,
    calibre: canto.calibre || ''
  };
}

// Helper function to get canto info for a piece based on original row data
function getPieceCantoInfo(piece, rows, cantos) {
  if (!rows || !Array.isArray(rows) || piece.originalRowIndex === undefined || piece.originalRowIndex === null) return null;
  
  const row = rows[piece.originalRowIndex];
  if (!row) return null;
  
  const cantoInfo = {};
  
  // Resolve each side
  ['l1', 'l2', 'a1', 'a2'].forEach(side => {
    const ref = row[side];
    if (ref) {
      const resolved = resolveCantoInfo(ref, cantos);
      if (resolved) {
        cantoInfo[side] = resolved;
      }
    }
  });
  
  return Object.keys(cantoInfo).length > 0 ? cantoInfo : null;
}

// Helper function to format canto info for display (human-readable, workshop-friendly)
function formatCantoInfo(cantoInfo) {
  if (!cantoInfo) return '';
  
  const parts = [];
  
  ['l1', 'l2', 'a1', 'a2'].forEach(side => {
    if (cantoInfo[side]) {
      const { codigo, calibre } = cantoInfo[side];
      // Show useful workshop information: code + calibre
      parts.push(`${codigo} ${calibre}`.trim());
    }
  });
  
  // Remove duplicates and join with spaces
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' ');
}

function addPiecesTable(doc, pieces, cantos = [], rows = [], variant = 'default') {
  const startY = (variant === 'v16' || variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d' || variant === 'v18' || variant === 'v20') ? 80 : (variant === 'v15' ? 246 : (variant === 'v14' ? 238 : (variant === 'v13' ? 245 : (variant === 'v11' ? 230 : (variant === 'v9' || variant === 'v10' ? 220 : 210)))));
  const startX = 15;
  const columnWidths = [10, 40, 25, 25, 25, 40]; // ID, Label, Width, Height, Rotated, Canto
  const rowHeight = (variant === 'v16' || variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d' || variant === 'v18' || variant === 'v20') ? 10 : (variant === 'v15' ? 8 : (variant === 'v14' ? 8 : (variant === 'v13' ? 9 : (variant === 'v11' ? 10 : (variant === 'v9' || variant === 'v10' ? 9 : 8)))));
  
  // Table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  doc.text('ID', startX, startY);
  doc.text('Pieza', startX + 10, startY);
  doc.text('Ancho (mm)', startX + 50, startY);
  doc.text('Alto (mm)', startX + 75, startY);
  doc.text('Rotada', startX + 100, startY);
  doc.text('Canto', startX + 125, startY);
  
  // Table header line - more subtle
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(startX, startY + 3, startX + 165, startY + 3);
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  pieces.forEach((piece, index) => {
    const yPos = startY + rowHeight * (index + 1);
    
     if (yPos > ((variant === 'v16' || variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d' || variant === 'v18' || variant === 'v20') ? 250 : (variant === 'v15' ? 262 : (variant === 'v14' ? 262 : (variant === 'v13' ? 255 : (variant === 'v11' ? 250 : (variant === 'v9' || variant === 'v10' ? 260 : 270))))))) {
      doc.addPage();
      // Add simple continuation header
      doc.setFontSize(10);
      doc.text('Tabla de piezas (continuación)', startX, 20);
      return; // Skip this piece, will be on next page
    }
  
    doc.text((index + 1).toString(), startX, yPos);
    doc.text(piece.label, startX + 10, yPos);
    doc.text(piece.width.toString(), startX + 50, yPos);
    doc.text(piece.height.toString(), startX + 75, yPos);
    doc.text(piece.rotated ? 'Sí' : 'No', startX + 100, yPos);
  
    // Add canto information
    const cantoInfo = getPieceCantoInfo(piece, rows, cantos);
    const cantoText = formatCantoInfo(cantoInfo);
    if (cantoText) {
      // Truncate if too long for the column
      const maxCantoLength = 35;
      const displayText = cantoText.length > maxCantoLength  
        ? cantoText.substring(0, maxCantoLength) + '...'  
        : cantoText;
      doc.text(displayText, startX + 125, yPos);
    }
  });
}

function addFinalSummary(doc, pieces, variant = 'default') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalPieces = pieces.length;
  const totalArea = pieces.reduce((sum, piece) => sum + (piece.width * piece.height), 0);
  
  // Draw summary box at bottom
  const summaryBoxY = (variant === 'v16' || variant === 'v17' || variant === 'v18') ? 260 : 285;
  const summaryBoxHeight = 15;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.rect(15, summaryBoxY, pageWidth - 30, summaryBoxHeight);
  
  // Add summary content
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  doc.text('Total de Piezas:', 20, summaryBoxY + 10);
  doc.text(totalPieces.toString(), 70, summaryBoxY + 10);
  
  doc.text('Área Total de Corte:', 100, summaryBoxY + 10);
  doc.text(`${(totalArea / 1000000).toFixed(2)} m²`, 170, summaryBoxY + 10);
}
