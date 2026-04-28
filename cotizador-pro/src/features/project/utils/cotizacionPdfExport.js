import { jsPDF } from 'jspdf';

// Format price to COP currency
function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

// Generate quotation PDF
export async function generateCotizacionPDF({
  projectName = 'Proyecto',
  clientName = 'Cliente',
  clientDoc = '',
  clientPhone = '',
  clientEmail = '',
  advisorName = '',
  advisorPhone = '',
  validez = '',
  despieceData = [],
  serviciosData = {}, // { porMaterial, cantosPorMaterial, servicios, subtotalLaminas, subtotalServicios, subtotalCantos, subtotal }
  hardwareData = { items: [], total: 0 }, // { herajes }
  companyName = 'Mi Empresa',
  companyNit = 'XXX.XXX.XXX-X',
  conditions = []
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'Letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = 15;
  const rightMargin = pageWidth - 15;
  let currentY = 20;
  const lineHeight = 6;

  // === HEADER ===
  doc.setFillColor(0, 209, 237); // Cyan header
  doc.rect(0, 0, pageWidth, 25, 'F');
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COTIZACIÓN', leftMargin, 16);
  
  // Company info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, leftMargin, 23);
  doc.text(`NIT: ${companyNit}`, pageWidth - 60, 23);
  
  currentY = 32;

  // === PROJECT INFO ===
  doc.setFillColor(240, 240, 245);
  doc.rect(leftMargin, currentY, pageWidth - 30, 35, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Información del Proyecto', leftMargin + 3, currentY + 7);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  // Left column
  const col1X = leftMargin + 3;
  const col2X = leftMargin + 85;
  
  doc.text(`Proyecto:`, col1X, currentY + 14);
  doc.setTextColor(0, 0, 0);
  doc.text(projectName || '—', col1X + 22, currentY + 14);
  
  doc.setTextColor(60, 60, 60);
  doc.text(`Cliente:`, col1X, currentY + 21);
  doc.setTextColor(0, 0, 0);
  doc.text(clientName || '—', col1X + 22, currentY + 21);
  
  doc.setTextColor(60, 60, 60);
  doc.text(`Documento:`, col1X, currentY + 28);
  doc.setTextColor(0, 0, 0);
  doc.text(clientDoc || '—', col1X + 25, currentY + 28);
  
  // Right column
  doc.setTextColor(60, 60, 60);
  doc.text(`Asesor:`, col2X, currentY + 14);
  doc.setTextColor(0, 0, 0);
  doc.text(advisorName || '—', col2X + 18, currentY + 14);
  
  doc.setTextColor(60, 60, 60);
  doc.text(`Teléfono:`, col2X, currentY + 21);
  doc.setTextColor(0, 0, 0);
  doc.text(clientPhone || '—', col2X + 22, currentY + 21);
  
  doc.setTextColor(60, 60, 60);
  doc.text(`Válida hasta:`, col2X, currentY + 28);
  doc.setTextColor(0, 0, 0);
  doc.text(validez || '—', col2X + 28, currentY + 28);
  
  currentY += 42;

  // === MATERIALES / LÁMINAS ===
  if (serviciosData.porMaterial && serviciosData.porMaterial.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Materiales', leftMargin, currentY);
    currentY += lineHeight;
    
    // Table header
    const tableWidth = pageWidth - 30;
    doc.setFillColor(0, 209, 237);
    doc.rect(leftMargin, currentY, tableWidth, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('MATERIAL', leftMargin + 3, currentY + 5.5);
    doc.text('CANT.', leftMargin + 80, currentY + 5.5);
    doc.text('VLR. UNIT.', leftMargin + 100, currentY + 5.5);
    doc.text('SUBTOTAL', leftMargin + 140, currentY + 5.5);
    
    currentY += 8;
    
    // Materials rows
    doc.setFont('helvetica', 'normal');
    serviciosData.porMaterial.forEach((mat, idx) => {
      // Alternating row
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 250);
        doc.rect(leftMargin, currentY, tableWidth, 7, 'F');
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(mat.material_nombre || 'Material', leftMargin + 3, currentY + 5);
      
      doc.text(`x${mat.cantidadLaminas || 1}`, leftMargin + 83, currentY + 5);
      doc.text(formatCOP(mat.precioUnitarioLamina || 0), leftMargin + 98, currentY + 5);
      doc.text(formatCOP(mat.valorTotalLaminas || 0), leftMargin + 138, currentY + 5);
      
      currentY += 7;
    });
    
    // Material subtotal box
    doc.setDrawColor(0, 209, 237);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, currentY, tableWidth, 8, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal Materiales:', leftMargin + 3, currentY + 5.5);
    doc.text(formatCOP(serviciosData.subtotalLaminas || 0), leftMargin + 138, currentY + 5.5);
    
    currentY += 12;
  }

  // === SERVICIOS ===
  if (serviciosData.porMaterial && serviciosData.porMaterial.some(m => m.servicios && m.servicios.length > 0)) {
    // Check for page break
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Servicios', leftMargin, currentY);
    currentY += lineHeight;
    
    // Table header
    const tableWidth = pageWidth - 30;
    doc.setFillColor(100, 100, 100);
    doc.rect(leftMargin, currentY, tableWidth, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SERVICIO', leftMargin + 3, currentY + 5.5);
    doc.text('AUTO', leftMargin + 85, currentY + 5.5);
    doc.text('MANUAL', leftMargin + 105, currentY + 5.5);
    doc.text('TOTAL', leftMargin + 130, currentY + 5.5);
    doc.text('VLR. UNIT.', leftMargin + 150, currentY + 5.5);
    doc.text('SUBTOTAL', leftMargin + 175, currentY + 5.5);
    
    currentY += 8;
    
    // Services rows
    serviciosData.porMaterial.forEach((mat) => {
      if (!mat.servicios || mat.servicios.length === 0) return;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 150);
      doc.text(mat.material_nombre, leftMargin + 3, currentY + 5);
      currentY += 7;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      mat.servicios.forEach((serv, idx) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          currentY = 20;
        }
        
        // Alternating row
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 250);
          doc.rect(leftMargin, currentY, tableWidth, 6, 'F');
        }
        
        doc.setTextColor(0, 0, 0);
        doc.text(serv.nombre || 'Servicio', leftMargin + 3, currentY + 4.5);
        
        doc.setTextColor(0, 150, 100);
        doc.text(`x${serv.automatico?.cantidad || 0}`, leftMargin + 85, currentY + 4.5);
        
        doc.setTextColor(200, 150, 0);
        doc.text(`x${serv.manual?.cantidad || 0}`, leftMargin + 108, currentY + 4.5);
        
        doc.setTextColor(0, 0, 0);
        doc.text(`x${serv.total?.cantidad || 0}`, leftMargin + 130, currentY + 4.5);
        doc.text(formatCOP(serv.valorUnitario || 0), leftMargin + 148, currentY + 4.5);
        doc.text(formatCOP(serv.total?.subtotal || 0), leftMargin + 175, currentY + 4.5);
        
        currentY += 6;
      });
    });
    
    // Services subtotal
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, currentY, tableWidth, 7, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal Servicios:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(serviciosData.subtotalServicios || 0), leftMargin + 175, currentY + 5);
    
    currentY += 10;
  }

  // === CANTOS ===
  if (serviciosData.cantosPorMaterial && serviciosData.cantosPorMaterial.some(c => c.cantos && c.cantos.length > 0)) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Cantos', leftMargin, currentY);
    currentY += lineHeight;
    
    const tableWidth = pageWidth - 30;
    doc.setFillColor(80, 80, 80);
    doc.rect(leftMargin, currentY, tableWidth, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CANTO', leftMargin + 3, currentY + 5.5);
    doc.text('TIPO', leftMargin + 70, currentY + 5.5);
    doc.text('METROS', leftMargin + 100, currentY + 5.5);
    doc.text('$/ML', leftMargin + 120, currentY + 5.5);
    doc.text('SUBTOTAL', leftMargin + 150, currentY + 5.5);
    
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    serviciosData.cantosPorMaterial.forEach((matCantos) => {
      if (!matCantos.cantos || matCantos.cantos.length === 0) return;
      
      // Material header
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 150);
      doc.text(matCantos.material_nombre, leftMargin + 3, currentY + 5);
      currentY += 7;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      matCantos.cantos.forEach((canto, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(248, 248, 250);
          doc.rect(leftMargin, currentY, tableWidth, 6, 'F');
        }
        
        doc.setTextColor(0, 0, 0);
        doc.text(canto.nombre || `Canto #${canto.ref}`, leftMargin + 3, currentY + 4.5);
        doc.setTextColor(100, 100, 100);
        doc.text(canto.tipo || 'rígido', leftMargin + 70, currentY + 4.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`${canto.metros?.toFixed(2) || 0}m`, leftMargin + 102, currentY + 4.5);
        doc.text(formatCOP(canto.precio || 0), leftMargin + 122, currentY + 4.5);
        doc.text(formatCOP(canto.costo || 0), leftMargin + 152, currentY + 4.5);
        
        currentY += 6;
      });
    });
    
    // Cantos subtotal
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, currentY, tableWidth, 7, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal Cantos:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(serviciosData.subtotalCantos || 0), leftMargin + 175, currentY + 5);
    
    currentY += 10;
  }

  // === HERRAJES ===
  if (hardwareData.items && hardwareData.items.filter(i => i.heraje_id).length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Herrajes', leftMargin, currentY);
    currentY += lineHeight;
    
    const tableWidth = pageWidth - 30;
    doc.setFillColor(60, 60, 60);
    doc.rect(leftMargin, currentY, tableWidth, 8, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('HERRAJE', leftMargin + 3, currentY + 5.5);
    doc.text('CANT.', leftMargin + 100, currentY + 5.5);
    doc.text('VLR. UNIT.', leftMargin + 120, currentY + 5.5);
    doc.text('SUBTOTAL', leftMargin + 160, currentY + 5.5);
    
    currentY += 8;
    
    doc.setFont('helvetica', 'normal');
    hardwareData.items.filter(i => i.heraje_id).forEach((item, idx) => {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 20;
      }
      
      if (idx % 2 === 0) {
        doc.setFillColor(248, 248, 250);
        doc.rect(leftMargin, currentY, tableWidth, 6, 'F');
      }
      
      doc.setTextColor(0, 0, 0);
      let name = item.nombre || 'Herraje';
      if (item.codigo) name += ` (${item.codigo})`;
      doc.text(name, leftMargin + 3, currentY + 4.5);
      doc.text(`x${item.cantidad || 1}`, leftMargin + 100, currentY + 4.5);
      doc.text(formatCOP(item.precio || 0), leftMargin + 122, currentY + 4.5);
      doc.text(formatCOP(item.subtotal || 0), leftMargin + 160, currentY + 4.5);
      
      currentY += 6;
    });
    
    // Herrajes subtotal
    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, currentY, tableWidth, 7, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Subtotal Herajes:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(hardwareData.total || 0), leftMargin + 160, currentY + 5);
    
    currentY += 12;
  }

  // === TOTALES ===
  const tableWidth = pageWidth - 30;
  const totalY = currentY;
  
  // IVA calculation (19%)
  const subtotalAntesIva = serviciosData.subtotalLaminas + serviciosData.subtotalServicios + serviciosData.subtotalCantos + (hardwareData.total || 0);
  const iva = Math.round(subtotalAntesIva * 0.19);
  const totalGeneral = subtotalAntesIva + iva;
  
  // Draw totals box
  doc.setFillColor(245, 245, 250);
  doc.rect(leftMargin + 100, totalY, 100, 35, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  doc.text('Subtotal:', leftMargin + 103, totalY + 8);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCOP(subtotalAntesIva), leftMargin + 165, totalY + 8);
  
  doc.setTextColor(60, 60, 60);
  doc.text('IVA (19%):', leftMargin + 103, totalY + 16);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCOP(iva), leftMargin + 165, totalY + 16);
  
  // Total line
  doc.setDrawColor(0, 209, 237);
  doc.setLineWidth(0.5);
  doc.line(leftMargin + 103, totalY + 21, leftMargin + 195, totalY + 21);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 209, 237);
  doc.text('TOTAL:', leftMargin + 103, totalY + 29);
  doc.text(formatCOP(totalGeneral), leftMargin + 145, totalY + 29);
  
  currentY = totalY + 40;

  // === CONDITIONS ===
  if (conditions && conditions.length > 0) {
    if (currentY > pageHeight - 40) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Condiciones:', leftMargin, currentY);
    currentY += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    conditions.forEach((cond) => {
      doc.text(`• ${cond}`, leftMargin + 3, currentY);
      currentY += 5;
    });
  }

  // === FOOTER ===
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, leftMargin, pageHeight - 8);
  doc.text('Página 1', pageWidth - 25, pageHeight - 8);

  return doc;
}

export default { generateCotizacionPDF };