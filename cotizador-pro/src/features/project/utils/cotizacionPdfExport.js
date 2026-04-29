import { jsPDF } from 'jspdf';

// Format price to COP currency
function formatCOP(amount) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(amount);
}

// Helper to check page overflow and add new page
function checkPageBreak(doc, currentY, requiredSpace = 30) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY > pageHeight - requiredSpace) {
    doc.addPage();
    return 45; // Return new Y position after header
  }
  return currentY;
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
  serviciosData = {},
  hardwareData = { items: [], total: 0 },
  companyName = 'Mi Empresa',
  companyNit = 'XXX.XXX.XXX-X',
  companyLogo = '',
  companyAddress = '',
  companyEmail = '',
  companyPhone = '',
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
  let currentY = 25;
  const lineHeight = 7;

  // ========== HEADER ==========
  // Header background
  doc.setFillColor(0, 100, 130);
  doc.rect(0, 0, pageWidth, 28, 'F');
  
  // Logo area (left)
  if (companyLogo) {
    try {
      doc.addImage(companyLogo, 'PNG', leftMargin, 4, 20, 20);
    } catch(e) {}
  }
  
  const logoEndX = companyLogo ? leftMargin + 25 : leftMargin;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('COTIZACIÓN', logoEndX, 12);
  
  // Company name (under title)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, logoEndX, 19);
  
  // Right side - contact info
  doc.setFontSize(8);
  doc.setTextColor(230, 245, 255);
  let rightY = 8;
  if (companyPhone) {
    doc.text(`Tel: ${companyPhone}`, pageWidth - 50, rightY);
    rightY += 5;
  }
  if (companyEmail) {
    doc.text(`Email: ${companyEmail}`, pageWidth - 50, rightY);
    rightY += 5;
  }
  if (companyAddress) {
    doc.text(`Dir: ${companyAddress.substring(0, 30)}`, pageWidth - 50, rightY);
  }

  currentY = 32;

  // ========== RESUMEN INFO ==========
  // Card background
  doc.setFillColor(245, 250, 252);
  doc.rect(leftMargin, currentY, pageWidth - 30, 40, 'F');
  
  // Title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 80, 100);
  doc.text('DATOS DEL PROYECTO', leftMargin + 3, currentY + 6);
  
  // Two columns layout
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  
  const col1 = leftMargin + 3;
  const col2 = leftMargin + 90;
  const row1 = currentY + 13;
  const row2 = currentY + 22;
  const row3 = currentY + 31;
  
  // Left column
  doc.text('Nombre del Proyecto:', col1, row1);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName || '—', col1 + 35, row1);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Cliente:', col1, row2);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName || '—', col1 + 22, row2);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Documento:', col1, row3);
  doc.setTextColor(0, 0, 0);
  doc.text(clientDoc || '—', col1 + 25, row3);
  
  // Right column  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Asesor:', col2, row1);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(advisorName || '—', col2 + 18, row1);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Teléfono:', col2, row2);
  doc.setTextColor(0, 0, 0);
  doc.text(clientPhone || '—', col2 + 22, row2);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Válida hasta:', col2, row3);
  doc.setTextColor(0, 100, 130);
  doc.setFont('helvetica', 'bold');
  doc.text(validez || '—', col2 + 27, row3);
  
  currentY += 45;

  // ========== MATERIALES ==========
  if (serviciosData.porMaterial && serviciosData.porMaterial.length > 0) {
    currentY = checkPageBreak(doc, currentY, 40);
    
    // Section header
    doc.setFillColor(0, 120, 150);
    doc.rect(leftMargin, currentY, pageWidth - 30, lineHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('MATERIALES / TABLEROS', leftMargin + 3, currentY + 5);
    currentY += lineHeight;
    
    // Table header
    doc.setFillColor(240, 245, 250);
    doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Descripción', leftMargin + 3, currentY + 4.5);
    doc.text('Cant.', leftMargin + 105, currentY + 4.5);
    doc.text('Vr. Unitario', leftMargin + 125, currentY + 4.5);
    doc.text('Subtotal', leftMargin + 160, currentY + 4.5);
    currentY += 6;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    serviciosData.porMaterial.forEach((mat, idx) => {
      currentY = checkPageBreak(doc, currentY, 15);
      
      const rowHeight = 7;
      const name = mat.material_nombre || 'Material';
      const cant = `x${mat.cantidadLaminas || 1}`;
      const unitPrice = formatCOP(mat.precioUnitarioLamina || 0);
      const subtotal = formatCOP(mat.valorTotalLaminas || 0);
      
      // Alternating row background
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(leftMargin, currentY, pageWidth - 30, rowHeight, 'F');
      }
      
      doc.setTextColor(0, 0, 0);
      doc.text(name, leftMargin + 3, currentY + 5);
      
      doc.setTextColor(60, 60, 60);
      doc.text(cant, leftMargin + 107, currentY + 5);
      doc.text(unitPrice, leftMargin + 122, currentY + 5);
      
      doc.setTextColor(0, 80, 100);
      doc.setFont('helvetica', 'bold');
      doc.text(subtotal, leftMargin + 155, currentY + 5);
      doc.setFont('helvetica', 'normal');
      
      currentY += rowHeight;
    });
    
    // Subtotal row
    doc.setFillColor(225, 240, 245);
    doc.rect(leftMargin, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 100);
    doc.text('Subtotal Materiales:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(serviciosData.subtotalLaminas || 0), leftMargin + 155, currentY + 5);
    currentY += 10;
  }

  // ========== SERVICIOS ==========
  const hasServicios = serviciosData.porMaterial?.some(m => m.servicios?.length > 0);
  if (hasServicios) {
    currentY = checkPageBreak(doc, currentY, 40);
    
    // Section header
    doc.setFillColor(0, 120, 150);
    doc.rect(leftMargin, currentY, pageWidth - 30, lineHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('SERVICIOS', leftMargin + 3, currentY + 5);
    currentY += lineHeight;
    
    // Table header
    doc.setFillColor(240, 245, 250);
    doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Tipo de Servicio', leftMargin + 3, currentY + 4.5);
    doc.text('Origin', leftMargin + 70, currentY + 4.5);
    doc.text('Cant.', leftMargin + 95, currentY + 4.5);
    doc.text('Vr. Unit.', leftMargin + 115, currentY + 4.5);
    doc.text('Subtotal', leftMargin + 155, currentY + 4.5);
    currentY += 6;
    
    // Services
    serviciosData.porMaterial.forEach(mat => {
      if (!mat.servicios?.length) return;
      
      // Material subtitle
      currentY = checkPageBreak(doc, currentY, 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 100, 130);
      doc.text(mat.material_nombre, leftMargin + 3, currentY + 5);
      currentY += 7;
      
      doc.setFont('helvetica', 'normal');
      mat.servicios.forEach((serv, idx) => {
        currentY = checkPageBreak(doc, currentY, 10);
        
        const rowHeight = 6;
        
        if (idx % 2 === 0) {
          doc.setFillColor(250, 252, 255);
          doc.rect(leftMargin, currentY, pageWidth - 30, rowHeight, 'F');
        }
        
        const name = serv.nombre || 'Servicio';
        const origin = serv.automatico?.cantidad > 0 && serv.manual?.cantidad > 0
          ? 'Mixto'
          : serv.automatico?.cantidad > 0
            ? 'Auto'
            : 'Manual';
        const cant = `x${serv.total?.cantidad || 0}`;
        const unit = formatCOP(serv.valorUnitario || 0);
        const subtotal = formatCOP(serv.total?.subtotal || 0);
        
        doc.setTextColor(50, 50, 50);
        doc.text(name, leftMargin + 3, currentY + 4);
        
        doc.setTextColor(120, 120, 120);
        doc.text(origin, leftMargin + 72, currentY + 4);
        
        doc.setTextColor(50, 50, 50);
        doc.text(cant, leftMargin + 97, currentY + 4);
        doc.text(unit, leftMargin + 115, currentY + 4);
        
        doc.setTextColor(0, 80, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(subtotal, leftMargin + 152, currentY + 4);
        doc.setFont('helvetica', 'normal');
        
        currentY += rowHeight;
      });
    });
    
    // Subtotal
    doc.setFillColor(225, 240, 245);
    doc.rect(leftMargin, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 100);
    doc.text('Subtotal Servicios:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(serviciosData.subtotalServicios || 0), leftMargin + 155, currentY + 5);
    currentY += 10;
  }

  // ========== CANTOS ==========
  const hasCantos = serviciosData.cantosPorMaterial?.some(c => c.cantos?.length > 0);
  if (hasCantos) {
    currentY = checkPageBreak(doc, currentY, 35);
    
    doc.setFillColor(0, 120, 150);
    doc.rect(leftMargin, currentY, pageWidth - 30, lineHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('CANTOS / RECUBRIMIENTOS', leftMargin + 3, currentY + 5);
    currentY += lineHeight;
    
    // Table
    doc.setFillColor(240, 245, 250);
    doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Canto', leftMargin + 3, currentY + 4.5);
    doc.text('Tipo', leftMargin + 70, currentY + 4.5);
    doc.text('Metros', leftMargin + 100, currentY + 4.5);
    doc.text('Vr. ml', leftMargin + 120, currentY + 4.5);
    doc.text('Subtotal', leftMargin + 155, currentY + 4.5);
    currentY += 6;
    
    serviciosData.cantosPorMaterial.forEach(matCantos => {
      if (!matCantos.cantos?.length) return;
      
      matCantos.cantos.forEach((canto, idx) => {
        currentY = checkPageBreak(doc, currentY, 10);
        
        if (idx % 2 === 0) {
          doc.setFillColor(250, 252, 255);
          doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
        }
        
        doc.setTextColor(0, 0, 0);
        doc.text(canto.nombre || `Canto #${canto.ref}`, leftMargin + 3, currentY + 4.5);
        doc.setTextColor(100, 100, 100);
        doc.text(canto.tipo || 'rígido', leftMargin + 70, currentY + 4.5);
        doc.text(`${canto.metros?.toFixed(2) || 0}m`, leftMargin + 100, currentY + 4.5);
        doc.text(formatCOP(canto.precio || 0), leftMargin + 118, currentY + 4.5);
        doc.setTextColor(0, 80, 100);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCOP(canto.costo || 0), leftMargin + 152, currentY + 4.5);
        doc.setFont('helvetica', 'normal');
        
        currentY += 6;
      });
    });
    
    doc.setFillColor(225, 240, 245);
    doc.rect(leftMargin, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 100);
    doc.text('Subtotal Cantos:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(serviciosData.subtotalCantos || 0), leftMargin + 155, currentY + 5);
    currentY += 10;
  }

  // ========== HERRAJES ==========
  const herajes = hardwareData.items?.filter(i => i.heraje_id) || [];
  if (herajes.length > 0) {
    currentY = checkPageBreak(doc, currentY, 35);
    
    doc.setFillColor(0, 120, 150);
    doc.rect(leftMargin, currentY, pageWidth - 30, lineHeight, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('HERRAJES Y ACCESORIOS', leftMargin + 3, currentY + 5);
    currentY += lineHeight;
    
    doc.setFillColor(240, 245, 250);
    doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Artículo', leftMargin + 3, currentY + 4.5);
    doc.text('Cant.', leftMargin + 100, currentY + 4.5);
    doc.text('Vr. Unit.', leftMargin + 120, currentY + 4.5);
    doc.text('Subtotal', leftMargin + 155, currentY + 4.5);
    currentY += 6;
    
    herajes.forEach((item, idx) => {
      currentY = checkPageBreak(doc, currentY, 10);
      
      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(leftMargin, currentY, pageWidth - 30, 6, 'F');
      }
      
      let name = item.nombre || 'Herraje';
      if (item.codigo) name = `${name} (${item.codigo})`;
      
      doc.setTextColor(0, 0, 0);
      doc.text(name, leftMargin + 3, currentY + 4.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`x${item.cantidad || 1}`, leftMargin + 102, currentY + 4.5);
      doc.text(formatCOP(item.precio || 0), leftMargin + 118, currentY + 4.5);
      doc.setTextColor(0, 80, 100);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCOP(item.subtotal || 0), leftMargin + 152, currentY + 4.5);
      doc.setFont('helvetica', 'normal');
      
      currentY += 6;
    });
    
    doc.setFillColor(225, 240, 245);
    doc.rect(leftMargin, currentY, pageWidth - 30, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 100);
    doc.text('Subtotal Herajes:', leftMargin + 3, currentY + 5);
    doc.text(formatCOP(hardwareData.total || 0), leftMargin + 155, currentY + 5);
    currentY += 10;
  }

  // ========== TOTAL ==========
  currentY = checkPageBreak(doc, currentY, 45);
  
  const subtotalAntesIva = (serviciosData.subtotalLaminas || 0) + 
                          (serviciosData.subtotalServicios || 0) + 
                          (serviciosData.subtotalCantos || 0) + 
                          (hardwareData.total || 0);
  const iva = Math.round(subtotalAntesIva * 0.19);
  const total = subtotalAntesIva + iva;
  
  // Total box
  doc.setFillColor(235, 245, 250);
  doc.rect(leftMargin + 100, currentY, 95, 35, 'F');
  doc.setDrawColor(0, 120, 150);
  doc.setLineWidth(0.5);
  doc.rect(leftMargin + 100, currentY, 95, 35, 'S');
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal:', leftMargin + 103, currentY + 8);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCOP(subtotalAntesIva), leftMargin + 135, currentY + 8);
  
  doc.setTextColor(80, 80, 80);
  doc.text('IVA (19%):', leftMargin + 103, currentY + 16);
  doc.setTextColor(0, 0, 0);
  doc.text(formatCOP(iva), leftMargin + 135, currentY + 16);
  
  doc.setDrawColor(0, 120, 150);
  doc.setLineWidth(0.3);
  doc.line(leftMargin + 103, currentY + 21, leftMargin + 193, currentY + 21);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 100, 130);
  doc.text('TOTAL:', leftMargin + 103, currentY + 28);
  doc.text(formatCOP(total), leftMargin + 130, currentY + 28);

  currentY += 40;

  // ========== CONDICIONES ==========
  if (conditions && conditions.length > 0) {
    currentY = checkPageBreak(doc, currentY, 25);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 80, 100);
    doc.text('CONDICIONES Y NOTAS', leftMargin, currentY);
    currentY += 6;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    conditions.forEach(cond => {
      doc.text(`• ${cond}`, leftMargin + 3, currentY);
      currentY += 5;
    });
  }

  // ========== FOOTER ==========
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, leftMargin, footerY);
  doc.text('Página 1', pageWidth - 25, footerY);

  return doc;
}

export default { generateCotizacionPDF };
