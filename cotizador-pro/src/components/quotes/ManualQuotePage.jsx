import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ManualQuotePage() {
  const [doorFabrications, setDoorFabrications] = useState([]);
  const [selectedDoors, setSelectedDoors] = useState([]);
  const [searchDoor, setSearchDoor] = useState('');
  const [activeQuoteId, setActiveQuoteId] = useState('');
  const [client, setClient] = useState({
    nombre: '',
    documento: '',
    telefono: '',
    correo: '',
  });
  const [quotes, setQuotes] = useState([]);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const API = window.electronAPI;
        const [doors, drafts] = await Promise.all([
          API?.getDoorFabrications ? API.getDoorFabrications() : Promise.resolve([]),
          API?.getManualQuotes ? API.getManualQuotes() : Promise.resolve([]),
        ]);
        setDoorFabrications(Array.isArray(doors) ? doors : []);
        setQuotes(Array.isArray(drafts) ? drafts : []);
      } catch (error) {
        console.error('Error loading fabricated doors for manual quote:', error);
      }
    };

    loadData();
  }, []);

  const filteredDoors = useMemo(() => {
    if (!searchDoor) return doorFabrications;
    const q = searchDoor.toLowerCase();
    return doorFabrications.filter((door) =>
      (door.nombre || '').toLowerCase().includes(q) ||
      (door.selectedMaterial?.nombre || '').toLowerCase().includes(q)
    );
  }, [doorFabrications, searchDoor]);

  const addDoor = (door) => {
    setSelectedDoors((current) => {
      const existing = current.find((item) => item.id === door.id);
      if (existing) {
        return current.map((item) => (
          item.id === door.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.unitPrice }
            : item
        ));
      }

      const unitPrice = Number(door.totals?.unitDoorCost || 0);
      return [
        ...current,
        {
          id: door.id,
          nombre: door.nombre || 'Puerta fabricada',
          material: door.selectedMaterial?.nombre || '',
          hoja: door.calculationSnapshot?.hoja || null,
          unitPrice,
          cantidad: 1,
          subtotal: unitPrice,
          totals: door.totals || null,
        },
      ];
    });
  };

  const updateDoorQuantity = (doorId, nextQuantity) => {
    const qty = Math.max(1, Number(nextQuantity || 1));
    setSelectedDoors((current) => current.map((item) => (
      item.id === doorId
        ? { ...item, cantidad: qty, subtotal: qty * item.unitPrice }
        : item
    )));
  };

  const removeDoor = (doorId) => {
    setSelectedDoors((current) => current.filter((item) => item.id !== doorId));
  };

  const totals = useMemo(() => {
    const puertas = selectedDoors.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
    return {
      materiales: puertas,
      servicios: 0,
      herrajes: 0,
      total: puertas,
    };
  }, [selectedDoors]);

  const exportPdf = () => {
    if (!selectedDoors.length) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = 18;

    const line = (label, value = '') => {
      doc.setFont('helvetica', 'bold');
      doc.text(String(label), 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), 60, y);
      y += 7;
    };

    const ensureSpace = (extra = 10) => {
      if (y + extra > 280) {
        doc.addPage();
        y = 18;
      }
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Cotización Manual', 14, y);
    y += 10;

    doc.setFontSize(10);
    line('Fecha', new Date().toLocaleString('es-CO'));
    line('Cliente', client.nombre || '-');
    line('Documento / NIT', client.documento || '-');
    line('Teléfono', client.telefono || '-');
    line('Correo', client.correo || '-');

    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Puertas cotizadas', 14, y);
    y += 8;

    selectedDoors.forEach((door, index) => {
      ensureSpace(32);
      doc.setDrawColor(220, 225, 235);
      doc.roundedRect(14, y - 4, 182, 26, 2, 2);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${door.nombre}`, 18, y + 2);
      doc.setFont('helvetica', 'normal');
      doc.text(`Material: ${door.material || '-'}`, 18, y + 8);
      doc.text(`Medida: ${door.hoja?.altoMm || '-'} x ${door.hoja?.anchoMm || '-'} mm`, 18, y + 14);
      doc.text(`Cantidad: ${door.cantidad}`, 120, y + 8);
      doc.text(`Unitario: ${formatCurrency(door.unitPrice)}`, 120, y + 14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Subtotal: ${formatCurrency(door.subtotal)}`, 120, y + 20);
      y += 32;
    });

    ensureSpace(36);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen', 14, y);
    y += 8;
    line('Puertas fabricadas', formatCurrency(totals.materiales));
    line('Servicios', formatCurrency(totals.servicios));
    line('Herrajes', formatCurrency(totals.herrajes));
    doc.setFont('helvetica', 'bold');
    doc.text('Total', 14, y);
    doc.text(formatCurrency(totals.total), 60, y);

    const safeClient = (client.nombre || 'sin-cliente').replace(/[^a-z0-9-_]/gi, '_');
    doc.save(`cotizacion_manual_${safeClient}.pdf`);
  };

  const updateClient = (field, value) => {
    setClient((current) => ({ ...current, [field]: value }));
  };

  const saveDraft = async () => {
    const API = window.electronAPI;
    if (!API?.saveManualQuote) {
      setSaveStatus({ type: 'error', message: 'No existe el método para guardar cotización manual.' });
      return;
    }

    setIsSaving(true);
    setSaveStatus({ type: '', message: '' });
    try {
      const result = await API.saveManualQuote({
        id: activeQuoteId || undefined,
        client,
        doors: selectedDoors,
        totals,
        status: 'draft',
      });

      const drafts = API?.getManualQuotes ? await API.getManualQuotes() : [];
      setQuotes(Array.isArray(drafts) ? drafts : []);
      if (result?.id) setActiveQuoteId(result.id);
      setSaveStatus({ type: 'success', message: `Borrador guardado${result?.id ? ` (${result.id})` : ''}.` });
    } catch (error) {
      console.error('Error saving manual quote:', error);
      setSaveStatus({ type: 'error', message: error?.message || 'No se pudo guardar el borrador.' });
    } finally {
      setIsSaving(false);
    }
  };

  const openDraft = (quote) => {
    setActiveQuoteId(quote.id || '');
    setClient({
      nombre: quote.client?.nombre || '',
      documento: quote.client?.documento || '',
      telefono: quote.client?.telefono || '',
      correo: quote.client?.correo || '',
    });
    setSelectedDoors(Array.isArray(quote.doors) ? quote.doors : []);
    setSaveStatus({ type: 'success', message: `Borrador ${quote.id || ''} cargado.` });
  };

  const newQuote = () => {
    setActiveQuoteId('');
    setClient({ nombre: '', documento: '', telefono: '', correo: '' });
    setSelectedDoors([]);
    setSaveStatus({ type: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f1930] via-[#16233f] to-[#1a233a] border border-[#40485d]/30 px-7 py-8 md:px-9 md:py-10 shadow-[0_20px_60px_rgba(3,8,20,0.35)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-5">
                <span className="w-2 h-2 rounded-full bg-[#00e0fe] shadow-[0_0_12px_#00e0fe]"></span>
                Flujo comercial manual
              </div>
              <h1 className="font-['Space_Grotesk'] text-[42px] leading-[0.95] sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-[-0.04em]">
                Cotización Manual
              </h1>
              <p className="text-[#a9b6d3] text-[14px] md:text-[15px] leading-7 max-w-[760px]">
                Esta vista ya puede tomar puertas fabricadas como productos cotizables manuales. Más adelante se le pueden sumar materiales, servicios y herrajes manuales completos.
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">person</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Datos del cliente</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={newQuote}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#40485d]/30 bg-[#10182d] px-4 py-2 text-sm font-semibold text-[#dee5ff] hover:bg-[#15213b] transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">note_add</span>
                  Nueva cotización
                </button>
                {activeQuoteId ? (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300">
                    <span className="material-symbols-outlined text-[18px]">draft</span>
                    Editando borrador {activeQuoteId}
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input value={client.nombre} onChange={(e) => updateClient('nombre', e.target.value)} placeholder="Nombre del cliente" className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]" />
                <input value={client.documento} onChange={(e) => updateClient('documento', e.target.value)} placeholder="Documento / NIT" className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]" />
                <input value={client.telefono} onChange={(e) => updateClient('telefono', e.target.value)} placeholder="Teléfono" className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]" />
                <input value={client.correo} onChange={(e) => updateClient('correo', e.target.value)} placeholder="Correo" className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]" />
              </div>
            </div>

            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">door_front</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Puertas fabricadas</h2>
              </div>

              <input
                type="text"
                placeholder="Buscar puerta fabricada..."
                value={searchDoor}
                onChange={(event) => setSearchDoor(event.target.value)}
                className="w-full bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#dee5ff] focus:outline-none focus:border-[#99f7ff]"
              />

              {filteredDoors.length === 0 ? (
                <div className="bg-[#060e20] border border-dashed border-[#1a233a] rounded-xl p-5 text-[#6f7a97] min-h-[140px] flex items-center justify-center text-center">
                  No hay puertas fabricadas disponibles. Confirmá una fabricación en el módulo Puertas para usarla acá.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDoors.map((door) => (
                    <button
                      key={door.id}
                      type="button"
                      onClick={() => addDoor(door)}
                      className="w-full text-left rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-4 hover:border-[#99f7ff]/30 hover:bg-[#0a1122] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-white font-semibold">{door.nombre || 'Puerta fabricada'}</div>
                          <div className="text-[#6f7a97] text-sm mt-1">
                            {door.calculationSnapshot?.hoja?.altoMm || '-'} × {door.calculationSnapshot?.hoja?.anchoMm || '-'} mm
                            {door.selectedMaterial?.nombre ? ` · ${door.selectedMaterial.nombre}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#00d1ed] font-bold">{formatCurrency(door.totals?.unitDoorCost || 0)}</div>
                          <div className="text-[#6f7a97] text-xs">unitario</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">playlist_add_check</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Ítems seleccionados</h2>
              </div>

              {selectedDoors.length === 0 ? (
                <div className="bg-[#060e20] border border-dashed border-[#1a233a] rounded-xl p-5 text-[#6f7a97] min-h-[140px] flex items-center justify-center text-center">
                  Todavía no agregaste puertas a la cotización manual.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDoors.map((door) => (
                    <div key={door.id} className="rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-white font-semibold">{door.nombre}</div>
                        <div className="text-[#6f7a97] text-sm mt-1">
                          {door.hoja?.altoMm || '-'} × {door.hoja?.anchoMm || '-'} mm
                          {door.material ? ` · ${door.material}` : ''}
                        </div>
                        {door.totals ? (
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-[#a3aac4]">
                            <span>Material: {formatCurrency(door.totals.materialCost || 0)}</span>
                            <span>Herrajes: {formatCurrency(door.totals.hardwareCost || 0)}</span>
                            <span>Servicios: {formatCurrency(door.totals.servicesCost || 0)}</span>
                            <span className="text-cyan-300">Unit: {formatCurrency(door.totals.unitDoorCost || 0)}</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={door.cantidad}
                          onChange={(event) => updateDoorQuantity(door.id, event.target.value)}
                          className="w-20 bg-[#0a1122] border border-[#1a233a] rounded px-2 py-2 text-[#dee5ff] text-center focus:outline-none focus:border-[#99f7ff]"
                        />
                        <div className="text-right min-w-[120px]">
                          <div className="text-[#a3aac4] text-xs">Subtotal</div>
                          <div className="text-emerald-300 font-bold">{formatCurrency(door.subtotal)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDoor(door.id)}
                          className="text-[#a3aac4] hover:text-red-400 p-1"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5 sticky top-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">receipt_long</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Resumen de cotización</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Puertas fabricadas</span><span>{formatCurrency(totals.materiales)}</span></div>
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Servicios</span><span>{formatCurrency(totals.servicios)}</span></div>
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Herrajes</span><span>{formatCurrency(totals.herrajes)}</span></div>
                <div className="border-t border-[#1a233a] pt-3 flex justify-between text-base font-bold text-white"><span>Total</span><span>{formatCurrency(totals.total)}</span></div>
              </div>

              <div className="space-y-3 pt-2">
                {saveStatus.message ? (
                  <div className={`rounded-2xl border px-4 py-3 text-sm ${saveStatus.type === 'success'
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                    {saveStatus.message}
                  </div>
                ) : null}
                <button onClick={saveDraft} disabled={isSaving} className="w-full bg-[#002f33] border border-[#00e0fe]/20 text-[#5bd8e6] py-3 rounded-xl font-bold disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSaving ? 'Guardando...' : 'Guardar borrador'}
                </button>
                <button onClick={exportPdf} disabled={!selectedDoors.length} className="w-full bg-[#1a233a] border border-[#40485d]/40 text-[#a3aac4] py-3 rounded-xl font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:border-[#99f7ff]/30 hover:text-white transition-colors">
                  Emitir PDF
                </button>
              </div>
            </div>

            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">history</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Borradores recientes</h2>
              </div>

              {quotes.length === 0 ? (
                <div className="text-[#6f7a97] text-sm">Todavía no hay borradores guardados.</div>
              ) : (
                <div className="space-y-3">
                  {quotes.slice(0, 5).map((quote) => (
                    <button key={quote.id} type="button" onClick={() => openDraft(quote)} className="w-full text-left rounded-2xl border border-[#1a233a] bg-[#060e20] px-4 py-3 hover:border-[#99f7ff]/30 hover:bg-[#0a1122] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-white font-semibold">{quote.client?.nombre || 'Cliente sin nombre'}</div>
                          <div className="text-[#6f7a97] text-sm mt-1">{quote.doors?.length || 0} puerta(s) · {formatCurrency(quote.totals?.total || 0)}</div>
                          <div className="text-[#6f7a97] text-xs mt-1">{new Date(quote.updated_at || quote.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <span className="material-symbols-outlined text-[#99f7ff] text-[18px]">open_in_new</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
