import React from 'react';

export default function ManualQuotePage() {
  return (
    <div className="min-h-screen bg-[#060e20] text-[#dee5ff] p-6 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0f1930] via-[#16233f] to-[#1a233a] border border-[#40485d]/30 px-7 py-8 md:px-9 md:py-10 shadow-[0_20px_60px_rgba(3,8,20,0.35)]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00e0fe]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#99f7ff]/15 bg-[#99f7ff]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99f7ff] mb-5">
                <span className="w-2 h-2 rounded-full bg-[#00e0fe] shadow-[0_0_12px_#00e0fe]"></span>
                Módulo base
              </div>
              <h1 className="font-['Space_Grotesk'] text-[42px] leading-[0.95] sm:text-5xl md:text-6xl font-bold text-white mb-5 tracking-[-0.04em]">
                Cotización Manual
              </h1>
              <p className="text-[#a9b6d3] text-[14px] md:text-[15px] leading-7 max-w-[760px]">
                Esta pantalla será la entrada comercial sin despiece: cliente, materiales, servicios, herrajes y resumen final cargados manualmente.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-4 lg:pt-3 lg:shrink-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/15 bg-amber-400/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]"></span>
                Carcasa inicial
              </div>
              <button
                disabled
                className="bg-[#002f33] border border-[#00e0fe]/20 text-[#5bd8e6] px-6 py-3 rounded-xl font-bold flex items-center gap-2 opacity-60 cursor-not-allowed shadow-lg"
              >
                <span className="material-symbols-outlined text-[20px]">download</span>
                Exportar próximamente
              </button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#6f7a97]">Nombre del cliente</div>
                <div className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#6f7a97]">Documento / NIT</div>
                <div className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#6f7a97]">Teléfono</div>
                <div className="bg-[#060e20] border border-[#1a233a] rounded-xl px-4 py-3 text-[#6f7a97]">Correo</div>
              </div>
            </div>

            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">inventory_2</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Materiales y herrajes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#060e20] border border-dashed border-[#1a233a] rounded-xl p-5 text-[#6f7a97] min-h-[140px]">Bloque reutilizable para materiales manuales</div>
                <div className="bg-[#060e20] border border-dashed border-[#1a233a] rounded-xl p-5 text-[#6f7a97] min-h-[140px]">Bloque reutilizable para herrajes manuales</div>
              </div>
            </div>

            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">build</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Servicios manuales</h2>
              </div>
              <div className="bg-[#060e20] border border-dashed border-[#1a233a] rounded-xl p-5 text-[#6f7a97] min-h-[160px]">
                Área reservada para selector de servicios, cantidades, precios y subtotales manuales.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-[#0a1122] border border-[#1a233a] rounded-[28px] shadow-xl p-6 space-y-5 sticky top-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#99f7ff]">receipt_long</span>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">Resumen de cotización</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Materiales</span><span>$ 0</span></div>
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Servicios</span><span>$ 0</span></div>
                <div className="flex justify-between text-sm text-[#a3aac4]"><span>Herrajes</span><span>$ 0</span></div>
                <div className="border-t border-[#1a233a] pt-3 flex justify-between text-base font-bold text-white"><span>Total</span><span>$ 0</span></div>
              </div>

              <div className="space-y-3 pt-2">
                <button disabled className="w-full bg-[#002f33] border border-[#00e0fe]/20 text-[#5bd8e6] py-3 rounded-xl font-bold opacity-60 cursor-not-allowed">Guardar borrador</button>
                <button disabled className="w-full bg-[#1a233a] border border-[#40485d]/40 text-[#a3aac4] py-3 rounded-xl font-bold opacity-60 cursor-not-allowed">Emitir PDF</button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
