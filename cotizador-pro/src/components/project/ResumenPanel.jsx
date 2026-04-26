// src/components/project/ResumenPanel.jsx
import React, { useMemo } from 'react';
import { formatPrice as formatPriceUtil } from '../../utils/serviceCalculator';
import { calculateServicesTotal } from '../../features/project/utils/mergeProjectServices';

export default function ResumenPanel({ 
  despieceData = [], 
  despieceStats = { laminaCount: 0, piezaCount: 0 },
  hardwareData = { items: [], total: 0 },
  servicios = [],
  cantosInventory = [],
  onExportPDF
}) {
  // Filtrar items manuales que son servicios (no herajes)
  const serviciosManuales = useMemo(() => {
    return (hardwareData.items || []).filter(item => 
      item.servicio_id || item.origen === 'manual'
    );
  }, [hardwareData.items]);

  // Usar la utilidad de consolidación (incluye cantos por material)
  const consolidado = useMemo(() => {
    if (!despieceData || !servicios) return { 
      porMaterial: [], 
      servicios: [], 
      cantosPorMaterial: [],
      subtotal: 0 
    };
    return calculateServicesTotal(despieceData, servicios, serviciosManuales);
  }, [despieceData, servicios, serviciosManuales]);

  // Totales generales
  const totalServicios = consolidado.subtotalServicios || 0;
  const totalCantos = consolidado.subtotalCantos || 0;
  const totalDespiece = totalServicios + totalCantos;
  const totalHardware = hardwareData.total || 0;
  const totalGeneral = totalDespiece + totalHardware;

  const formatPrice = (price) => formatPriceUtil(price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined">receipt_long</span>
          Resumen de Cotización
        </h2>
        
        <button
          onClick={onExportPDF}
          className="text-xs bg-[#00d1ed]/20 hover:bg-[#00d1ed]/30 text-[#00d1ed] px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Exportar PDF
        </button>
      </div>

      {/* Resumen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Despiece Card */}
        <div className="glass-panel rounded-2xl border border-[#1a233a] p-5">
          <div className="flex items-center gap-2 text-[#a3aac4] text-sm mb-4">
            <span className="material-symbols-outlined text-[20px] text-[#00e0fe]">architecture</span>
            <span className="font-medium uppercase tracking-wide text-xs">Despiece</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Piezas:</span>
              <span className="text-[#dee5ff] font-semibold">{despieceStats.piezaCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Láminas:</span>
              <span className="text-[#dee5ff] font-semibold">{despieceStats.laminaCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Materiales:</span>
              <span className="text-[#dee5ff] font-semibold">{consolidado.porMaterial?.length || despieceData.length}</span>
            </div>
            
            <div className="border-t border-[#1a233a] pt-3 mt-2">
              <div className="flex justify-between">
                <span className="text-[#a3aac4] font-medium">Subtotal Despiece:</span>
                <span className="text-[#00d1ed] font-bold text-xl">{formatPrice(totalDespiece)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Herajes Card */}
        <div className="glass-panel rounded-2xl border border-[#1a233a] p-5">
          <div className="flex items-center gap-2 text-[#a3aac4] text-sm mb-4">
            <span className="material-symbols-outlined text-[20px] text-[#00e0fe]">handyman</span>
            <span className="font-medium uppercase tracking-wide text-xs">Herajes y Extras</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Herajes:</span>
              <span className="text-[#dee5ff] font-semibold">
                {(hardwareData.items || []).filter(i => i.heraje_id).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Servicios man.:</span>
              <span className="text-[#dee5ff] font-semibold">{serviciosManuales.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Items:</span>
              <span className="text-[#dee5ff] font-semibold">{(hardwareData.items || []).length}</span>
            </div>
            
            <div className="border-t border-[#1a233a] pt-3 mt-2">
              <div className="flex justify-between">
                <span className="text-[#a3aac4] font-medium">Subtotal:</span>
                <span className="text-[#00d1ed] font-bold text-xl">{formatPrice(totalHardware)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total General Card */}
        <div className="glass-panel rounded-2xl border border-[#00d1ed]/30 p-5 bg-gradient-to-br from-[#00d1ed]/5 to-transparent">
          <div className="flex items-center gap-2 text-[#00d1ed] text-sm mb-4">
            <span className="material-symbols-outlined text-[20px]">payments</span>
            <span className="font-medium uppercase tracking-wide text-xs">Total Cotización</span>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">Despiece:</span>
              <span className="text-[#dee5ff] font-semibold">{formatPrice(totalDespiece)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6f7a97] text-sm">+ Herajes:</span>
              <span className="text-[#dee5ff] font-semibold">{formatPrice(totalHardware)}</span>
            </div>
            
            <div className="border-t border-[#00d1ed]/30 pt-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-[#00d1ed] font-bold">TOTAL:</span>
                <span className="text-[#00e0fe] font-bold text-2xl">{formatPrice(totalGeneral)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Materiales (Láminas) con Servicios y Cantos */}
      {consolidado.porMaterial?.length > 0 && (
        <div className="space-y-4">
          {consolidado.porMaterial.map((material, idx) => (
            <div key={material.material_id || idx} className="glass-panel rounded-2xl border border-[#1a233a] p-5">
              {/* Header del material */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1a233a]">
                <h3 className="text-[#dee5ff] font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">layers</span>
                  {material.material_nombre}
                </h3>
                <div className="text-right">
                  <span className="text-[#6f7a97] text-sm">Piezas: </span>
                  <span className="text-[#dee5ff] font-semibold">{material.piezaCount}</span>
                </div>
              </div>
              
              {/* Servicios de este material */}
              {material.servicios.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-[#a3aac4] text-xs uppercase font-bold mb-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">build</span>
                    Servicios
                  </h4>
                  
                  <table className="w-full">
                    <thead className="border-b border-[#1a233a]">
                      <tr>
                        <th className="text-left text-[#a3aac4] text-xs uppercase font-bold py-2">Servicio</th>
                        <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Vlr Unit.</th>
                        <th className="text-center text-[#a3aac4] text-xs uppercase font-bold py-2 bg-cyan-500/10">Auto</th>
                        <th className="text-center text-[#a3aac4] text-xs uppercase font-bold py-2 bg-amber-500/10">Manual</th>
                        <th className="text-center text-[#a3aac4] text-xs uppercase font-bold py-2">Total</th>
                        <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a233a]">
                      {material.servicios.map((serv) => (
                        <tr key={serv.servicio_id}>
                          <td className="py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[#dee5ff] font-medium">{serv.nombre}</span>
                              {serv.modo_origen === 'mixto' && (
                                <span className="text-[10px] px-1 py-0.5 rounded-full bg-violet-500/15 text-violet-300">mixto</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 text-right text-[#a3aac4]">{formatPrice(serv.valorUnitario)}</td>
                          <td className="py-2 text-center bg-cyan-500/5">
                            {serv.automatico.cantidad > 0 ? (
                              <span className="text-cyan-300 font-semibold">x{serv.automatico.cantidad}</span>
                            ) : <span className="text-[#40485d]">—</span>}
                          </td>
                          <td className="py-2 text-center bg-amber-500/5">
                            {serv.manual.cantidad > 0 ? (
                              <span className="text-amber-300 font-semibold">x{serv.manual.cantidad}</span>
                            ) : <span className="text-[#40485d]">—</span>}
                          </td>
                          <td className="py-2 text-center text-[#dee5ff] font-bold">x{serv.total.cantidad}</td>
                          <td className="py-2 text-right text-[#00d1ed] font-bold">{formatPrice(serv.total.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Cantos de este material */}
              {consolidado.cantosPorMaterial?.find(c => c.material_id === material.material_id)?.cantos?.length > 0 && (() => {
                const cantosMat = consolidado.cantosPorMaterial.find(c => c.material_id === material.material_id);
                return (
                  <div>
                    <h4 className="text-[#a3aac4] text-xs uppercase font-bold mb-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">straighten</span>
                      Cantos
                    </h4>
                    
                    <table className="w-full">
                      <thead className="border-b border-[#1a233a]">
                        <tr>
                          <th className="text-left text-[#a3aac4] text-xs uppercase font-bold py-2">Ref</th>
                          <th className="text-left text-[#a3aac4] text-xs uppercase font-bold py-2">Canto</th>
                          <th className="text-left text-[#a3aac4] text-xs uppercase font-bold py-2">Tipo</th>
                          <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Metros</th>
                          <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">$/ml</th>
                          <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1a233a]">
                        {cantosMat.cantos.map((canto) => (
                          <tr key={canto.ref}>
                            <td className="py-2 text-[#99f7ff] font-bold">#{canto.ref}</td>
                            <td className="py-2 text-[#dee5ff]">{canto.nombre}</td>
                            <td className="py-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                canto.tipo === 'flexible' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                              }`}>{canto.tipo}</span>
                            </td>
                            <td className="py-2 text-right text-[#dee5ff]">{canto.metros.toFixed(2)}m</td>
                            <td className="py-2 text-right text-[#a3aac4]">{formatPrice(canto.precio)}</td>
                            <td className="py-2 text-right text-[#00d1ed] font-semibold">{formatPrice(canto.costo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              
              {/* Subtotal del material */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#1a233a]">
                <span className="text-[#a3aac4] font-bold">Subtotal {material.material_nombre}:</span>
                <span className="text-[#00d1ed] font-bold text-xl">{formatPrice(material.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Herajes Items */}
      {(hardwareData.items || []).filter(i => i.heraje_id).length > 0 && (
        <div className="glass-panel rounded-2xl border border-[#1a233a] p-5">
          <h3 className="text-[#dee5ff] font-bold mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">handyman</span>
            Herajes
          </h3>
          
          <table className="w-full">
            <thead className="border-b border-[#1a233a]">
              <tr>
                <th className="text-left text-[#a3aac4] text-xs uppercase font-bold py-2">Herraje</th>
                <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Cant.</th>
                <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Vlr Unit.</th>
                <th className="text-right text-[#a3aac4] text-xs uppercase font-bold py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a233a]">
              {(hardwareData.items || []).filter(i => i.heraje_id).map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-[#dee5ff] font-medium">
                    {item.nombre}
                    {item.codigo && <span className="text-[#a3aac4] text-xs ml-2">({item.codigo})</span>}
                  </td>
                  <td className="py-3 text-right text-[#dee5ff]">x{item.cantidad}</td>
                  <td className="py-3 text-right text-[#a3aac4]">{formatPrice(item.precio)}</td>
                  <td className="py-3 text-right text-[#00d1ed] font-semibold">{formatPrice(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Info */}
      <p className="text-xs text-[#6f7a97] text-center">
        Esta cotización es una estimación. Los precios finales pueden variar según condiciones del proyecto.
      </p>
    </div>
  );
}