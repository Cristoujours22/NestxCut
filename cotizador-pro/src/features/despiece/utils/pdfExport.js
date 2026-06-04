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
  sheetImages, // Imagenes bitmap si fueron proveidas
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
    
    // Sheet title - positioned after header block
    const sheetTitleY = 52;
    if (count > 1) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`L\u00e1mina ${indices.join('/')}`, 15, sheetTitleY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${count}x id\u00e9nticas)`, 15 + doc.getTextWidth(`L\u00e1mina ${indices.join('/')}  `), sheetTitleY);
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40, 40, 40);
      doc.text(`L\u00e1mina ${indices[0]}`, 15, sheetTitleY);
    }

    let imageEndY = null;

    // Add sheet visualization inside bordered box or image if available
    if (sheetImages && sheetImages[sheet.index]) {
      const imgInfo = sheetImages[sheet.index];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const maxVisWidth = pageWidth - 10;
      const maxVisHeight = pageHeight * 0.58; // Use ~58% of page for the image
      
      const scale = Math.min(
        maxVisWidth / imgInfo.width,
        maxVisHeight / imgInfo.height
      );
      
      const finalWidth = imgInfo.width * scale;
      const finalHeight = imgInfo.height * scale;
      const startX = (pageWidth - finalWidth) / 2;
      const startY = 57;
      
      // Subtle thin border
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.rect(startX - 0.5, startY - 0.5, finalWidth + 1, finalHeight + 1);
      
      // Embed high-res screenshot
      doc.addImage(imgInfo.data, 'JPEG', startX, startY, finalWidth, finalHeight);
      
      imageEndY = startY + finalHeight + 5;
    } else {
      addBoxedSheetVisualization(doc, sheet, boardWidth, boardHeight, usableWidth, usableHeight, cantos, rows, variant);
    }

    // V9: Layout-safe implementation - check if table fits on current page
    if (variant === 'v9') {
      const currentYPosition = imageEndY || (doc.internal.getCurrentPageInfo().autoTable ? doc.internal.getCurrentPageInfo().autoTable.finalY + 10 : 220);
      const pageHeight = doc.internal.pageSize.getHeight();
      const spaceAvailable = pageHeight - currentYPosition;
      
      if (spaceAvailable < 60) {
        doc.addPage();
        addProfessionalHeader(doc, projectName, clientName, materialName);
        doc.setFontSize(12);
        doc.text('Tabla de piezas (continuación)', 15, 65);
        imageEndY = 75;
      }
    }

    if (variant === 'v16' || variant === 'v17' || variant === 'v17b' || variant === 'v17c' || variant === 'v17d' || variant === 'v18' || variant === 'v20') {
      doc.addPage();
      addProfessionalHeader(doc, projectName, clientName, materialName);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Lámina ${count > 1 ? indices.join('/') : indices[0]} - Detalles`, 15, 65);
      const finalY = addPiecesTable(doc, sheet.pieces, cantos, rows, variant, 80);
      addFinalSummary(doc, sheet.pieces, variant, finalY);
    } else {
      // Si usamos imagenes, la tabla empieza dinamico debajo de la imagen
      const tableStartY = imageEndY || null;
      const finalY = addPiecesTable(doc, sheet.pieces, cantos, rows, variant, tableStartY);
      addFinalSummary(doc, sheet.pieces, variant, finalY);
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
  const leftMargin = 15;
  const rightMargin = pageWidth - 15;
  
  // === TOP LINE (thin rule) ===
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(leftMargin, 10, rightMargin, 10);
  
  // === LOGO AREA (left side - reserved placeholder) ===
  const logoBoxW = 35;
  const logoBoxH = 14;
  const logoBoxX = leftMargin;
  const logoBoxY = 13;
  
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);
  doc.setLineDash([2, 2]);
  doc.rect(logoBoxX, logoBoxY, logoBoxW, logoBoxH);
  doc.setLineDash([]);
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text('LOGO EMPRESA', logoBoxX + logoBoxW / 2, logoBoxY + logoBoxH / 2 + 1, { align: 'center' });
  
  // === TITLE (center) ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PLANO DE CORTE', pageWidth / 2, 22, { align: 'center' });
  
  // === DATE (right aligned) ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(date, rightMargin, 16, { align: 'right' });
  
  // === METADATA ROW (two columns below title) ===
  const metaY = 32;
  doc.setFontSize(8);
  
  // Left column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Proyecto:', leftMargin, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(projectName || '—', leftMargin + 20, metaY);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Cliente:', leftMargin, metaY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(clientName || '—', leftMargin + 20, metaY + 6);
  
  // Right column
  if (materialName) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Material:', pageWidth / 2, metaY, { align: 'left' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(materialName, pageWidth / 2 + 20, metaY);
  }
  
  // === BOTTOM SEPARATOR (thin rule under metadata) ===
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, metaY + 12, rightMargin, metaY + 12);
}

function addSectionTitle(doc, title, yPosition) {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  // Simple section title - no underline, just clean text
  doc.text(title, 15, yPosition);
}

// Helper function to check if a label would collide with other pieces
function checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, labelX, labelY, labelWidth, allPieces, scale, startX, startY, trimOffsetY = 0, isVertical = false) {
  // Convert label position to board coordinates for collision detection
  const boardLabelX = (labelX - startX) / scale;
  const boardLabelY = (labelY - startY) / scale;
  const trimmedPieceY = (pieceY - startY) / scale;
  
  // Define collision buffer area around the label
  const collisionBuffer = 3; // mm buffer
  
  // Check if label would overlap with any other piece
  for (const otherPiece of allPieces) {
    // Skip self
    if (otherPiece.x === (pieceX - startX) / scale && (otherPiece.y + trimOffsetY) === trimmedPieceY) {
      continue;
    }
    
    // Check if label area overlaps with other piece
    const otherPieceX = otherPiece.x;
    const otherPieceY = otherPiece.y + trimOffsetY;
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
function addFreeAreas(doc, sheet, startX, startY, scale, boardWidth, boardHeight, trimOffsetY = 0, variant = 'default') {
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
      const rectY = startY + (rect.y + trimOffsetY) * scale;
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
  
  // Draw usable area - one-sided trim: usable starts below the top trim band
  const trimOffsetY = Math.max(0, boardHeight - usableHeight);
  const usableStartX = startX; // no left offset — refiladoX deducts from right side only
  const usableStartY = startY + trimOffsetY * scale; // top offset — refiladoY deducts from top only
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
    const pieceY = startY + (piece.y + trimOffsetY) * scale;
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
              const canShowWidth = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, widthTextX, widthTextY, widthTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY);
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
              const canShowHeight = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, heightTextX, heightTextY, heightTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY, true);
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
                const canShowCanto = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY);
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
                const canShowCanto = !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY, true);
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
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY);
                  
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
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY, true);
                  
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
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY);
                  
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
                  const canShowCanto = hasRoomForCanto && !checkLabelCollision(pieceX, pieceY, pieceWidth, pieceHeight, cantoTextX, cantoTextY, cantoTextWidth, sheet.pieces, scale, startX, startY, trimOffsetY, true);
                  
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
  addFreeAreas(doc, sheet, startX, startY, scale, boardWidth, boardHeight, trimOffsetY, variant);
}



// Helper function to resolve canto information
export function resolveCantoInfo(ref, cantos) {
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
export function getPieceCantoInfo(piece, rows, cantos) {
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

function addPiecesTable(doc, pieces, cantos = [], rows = [], variant = 'default', customStartY = null) {
  const startY = customStartY || 210;
  const startX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - 30;
  const colWidths = [12, 45, 28, 28, 22, 45]; // ID, Label, Width, Height, Rotated, Canto
  const rowHeight = 7;
  const headerHeight = 9;
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginBottom = 30;
  
  // Header drawing function
  const drawHeader = (yPos) => {
    // Header background - light gray fill
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, yPos - 5, tableWidth, headerHeight, 'F');
    
    // Header top and bottom lines
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    doc.line(startX, yPos - 5, startX + tableWidth, yPos - 5);
    doc.setLineWidth(0.2);
    doc.line(startX, yPos + headerHeight - 5, startX + tableWidth, yPos + headerHeight - 5);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    
    let colX = startX + 3;
    const headers = ['#', 'Pieza', 'Ancho', 'Alto', 'Rot.', 'Canto'];
    headers.forEach((h, i) => {
      doc.text(h, colX, yPos + 1);
      colX += colWidths[i];
    });
    
    return yPos + headerHeight;
  };
  
  let currentY = drawHeader(startY);
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  pieces.forEach((piece, index) => {
    // Page overflow check
    if (currentY > (pageHeight - marginBottom)) {
      // Bottom line before page break
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(startX, currentY - 1, startX + tableWidth, currentY - 1);
      
      doc.addPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Tabla de piezas (continuaci\u00f3n)', startX, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      currentY = drawHeader(25);
    }
    
    // Alternating row fill
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(startX, currentY - 4, tableWidth, rowHeight, 'F');
    }
    
    doc.setTextColor(0, 0, 0);
    let colX = startX + 3;
    doc.text((index + 1).toString(), colX, currentY);
    colX += colWidths[0];
    
    // Truncate label if too long
    const maxLabelW = colWidths[1] - 4;
    let label = piece.label;
    while (doc.getTextWidth(label) > maxLabelW && label.length > 3) {
      label = label.slice(0, -1);
    }
    if (label !== piece.label) label += '\u2026';
    doc.text(label, colX, currentY);
    colX += colWidths[1];
    
    doc.text(piece.width.toString(), colX, currentY);
    colX += colWidths[2];
    
    doc.text(piece.height.toString(), colX, currentY);
    colX += colWidths[3];
    
    doc.text(piece.rotated ? 'S\u00ed' : 'No', colX, currentY);
    colX += colWidths[4];
    
    // Canto info
    const cantoInfo = getPieceCantoInfo(piece, rows, cantos);
    const cantoText = formatCantoInfo(cantoInfo);
    if (cantoText) {
      doc.setFontSize(7);
      const maxCantoW = colWidths[5] - 4;
      let ct = cantoText;
      while (doc.getTextWidth(ct) > maxCantoW && ct.length > 3) {
        ct = ct.slice(0, -1);
      }
      if (ct !== cantoText) ct += '\u2026';
      doc.text(ct, colX, currentY);
      doc.setFontSize(8);
    }
    
    currentY += rowHeight;
  });
  
  // Bottom line after last row
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(startX, currentY - 1, startX + tableWidth, currentY - 1);
  
  return currentY;
}

function addFinalSummary(doc, pieces, variant = 'default', customStartY = null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPieces = pieces.length;
  const totalArea = pieces.reduce((sum, piece) => sum + (piece.width * piece.height), 0);
  
  let summaryBoxY = customStartY ? customStartY + 5 : 285;
  
  // Ensure it doesn't overflow
  if (summaryBoxY > (pageHeight - 25)) {
    doc.addPage();
    summaryBoxY = 20;
  }
  
  const boxX = 15;
  const boxW = pageWidth - 30;
  const boxH = 12;
  
  // Summary box with double-line top border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(boxX, summaryBoxY, boxX + boxW, summaryBoxY);
  doc.setLineWidth(0.15);
  doc.line(boxX, summaryBoxY + 1.2, boxX + boxW, summaryBoxY + 1.2);
  
  // Summary content
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  
  doc.text('Total Piezas:', boxX + 3, summaryBoxY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(totalPieces.toString(), boxX + 30, summaryBoxY + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('\u00c1rea de Corte:', boxX + 55, summaryBoxY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${(totalArea / 1000000).toFixed(3)} m\u00b2`, boxX + 82, summaryBoxY + 7);
  
  // Bottom line
  doc.setLineWidth(0.6);
  doc.line(boxX, summaryBoxY + boxH, boxX + boxW, summaryBoxY + boxH);
}
