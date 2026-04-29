import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Despiece from '../despiece/Despiece';
import { DespieceStatsBar } from '../despiece/DespieceSummaryPanel';
import HerajesPanel from './HerajesPanel';
import ResumenPanel from './ResumenPanel';
import { generateCotizacionPDF } from '../../features/project/utils/cotizacionPdfExport';
import { calculateServicesTotal } from '../../features/project/utils/mergeProjectServices';

function normalizeServicio(servicio) {
  let atributos = servicio?.atributos || [];
  if (typeof atributos === 'string') {
    try {
      atributos = JSON.parse(atributos);
    } catch {
      atributos = [];
    }
  }

  const attrs = Array.isArray(atributos) ? atributos : [];
  return {
    ...servicio,
    atributos: attrs,
    precio: Number(servicio?.precio || attrs?.[0]?.precio || 0)
  };
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('despiece');
  const [project, setProject] = useState(null);
  const [despieceData, setDespieceData] = useState({ items: [] });
  const [hardwareData, setHardwareData] = useState({ items: [] });
  const [servicios, setServicios] = useState([]);
  const [cantosInventory, setCantosInventory] = useState([]);
  const [materialesInventory, setMaterialesInventory] = useState([]);
  const [companySettings, setCompanySettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [despieceStats, setDespieceStats] = useState({ laminaCount: 0, piezaCount: 0 });
  const [openNestingHandler, setOpenNestingHandler] = useState(null);
  const [servicePicker, setServicePicker] = useState({ open: false, materialId: null, query: '' });

  // Cargar info del proyecto desde la base de datos
  useEffect(() => {
    const fetchProject = async () => {
      try {
        if (window.electronAPI?.getProject) {
          const data = await window.electronAPI.getProject(id);
          setProject(data);
          try {
            setDespieceData(JSON.parse(data.despiece_data || "[]"));
          } catch(e) {
            console.error("Error parsing despiece DB data", e);
          }
          try {
            const hw = JSON.parse(data.hardware_data || "{}");
            setHardwareData(hw);
          } catch(e) {
            console.error("Error parsing hardware data", e);
          }
        }
        
        // Cargar servicios para el resumen
        if (window.electronAPI?.getServicios) {
          const srv = await window.electronAPI.getServicios();
          setServicios((srv || []).map(normalizeServicio));
        }
        
        // Cargar cantos del inventario para el resumen
        if (window.electronAPI?.getInventoryItems) {
          const inv = await window.electronAPI.getInventoryItems() || [];
          setCantosInventory(inv.filter(item => item.item_type === 'canto'));
          setMaterialesInventory(inv.filter(item => item.item_type === 'tablero'));
        }

        // Cargar configuración de la empresa
        if (window.electronAPI?.getCompanySettings) {
          let settings = await window.electronAPI.getCompanySettings() || {};
          // Logo se guarda directamente como logo_data en la DB
          setCompanySettings(settings);
        }
      } catch (error) {
        console.error("Error fetching project:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const handleSave = async () => {
    if (!project || !window.electronAPI?.saveProject) return;
    setIsSaving(true);
    try {
      await window.electronAPI.saveProject({
        ...project,
        despiece_data: JSON.stringify(despieceData),
        hardware_data: JSON.stringify(hardwareData)
      });
      // Show toast
      setToast({ type: 'success', message: 'Cambios guardados correctamente' });
      setTimeout(() => setToast(null), 3000);
    } catch(err) {
      console.error("Error guardando proyecto", err);
      setToast({ type: 'error', message: 'Error al guardar' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const recalculateHardwareTotal = (items = []) => {
    return items.reduce((acc, item) => acc + Number(item.subtotal || 0), 0);
  };

  const addManualServiceToMaterial = (servicio, materialId) => {
    if (!servicio) return;

    setHardwareData((prev) => {
      const currentItems = prev?.items || [];
      const existing = currentItems.find((item) => item.origen === 'manual' && item.servicio_id === servicio.id && item.material_id === materialId);

      let nextItems;
      if (existing) {
        nextItems = currentItems.map((item) => item === existing
          ? {
              ...item,
              cantidad: Number(item.cantidad || 0) + 1,
              subtotal: (Number(item.cantidad || 0) + 1) * Number(item.precio || 0)
            }
          : item
        );
      } else {
        const precio = Number(servicio.precio || 0);
        nextItems = [
          ...currentItems,
          {
            id: `srv_${materialId}_${Date.now()}`,
            material_id: materialId,
            servicio_id: servicio.id,
            nombre: servicio.nombre,
            origen: 'manual',
            cantidad: 1,
            precio,
            subtotal: precio
          }
        ];
      }

      return { ...prev, items: nextItems, total: recalculateHardwareTotal(nextItems) };
    });

    setToast({ type: 'success', message: `${servicio.nombre} agregado` });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddService = (materialId) => {
    if (!servicios.length) {
      setToast({ type: 'error', message: 'No hay servicios configurados' });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setServicePicker({ open: true, materialId, query: '' });
  };

  const closeServicePicker = () => {
    setServicePicker({ open: false, materialId: null, query: '' });
  };

  const filteredServices = servicios.filter((s) =>
    (s.nombre || '').toLowerCase().includes((servicePicker.query || '').toLowerCase())
  );

  const handleUpdateManualQuantity = (servicioId, materialId, nuevaCantidad) => {
    setHardwareData((prev) => {
      const currentItems = prev?.items || [];
      const filteredItems = currentItems.filter(
        (item) => !(item.origen === 'manual' && item.servicio_id === servicioId && item.material_id === materialId && Number(nuevaCantidad) <= 0)
      );

      const nextItems = Number(nuevaCantidad) <= 0
        ? filteredItems
        : filteredItems.map((item) => (
            item.origen === 'manual' && item.servicio_id === servicioId && item.material_id === materialId
              ? {
                  ...item,
                  cantidad: Number(nuevaCantidad),
                  subtotal: Number(nuevaCantidad) * Number(item.precio || 0)
                }
              : item
          ));

      return { ...prev, items: nextItems, total: recalculateHardwareTotal(nextItems) };
    });
  };

  const handleExportPDF = async () => {
    try {
      // Get servicios consolidados
      const serviciosManuales = (hardwareData.items || []).filter(item => item.servicio_id || item.origen === 'manual');
      const serviciosData = calculateServicesTotal(despieceData, servicios, serviciosManuales, materialesInventory, cantosInventory);

      const validity = new Date();
      validity.setDate(validity.getDate() + 3);
      const validez = validity.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

      const doc = await generateCotizacionPDF({
        projectName: project?.title || project?.name || 'Proyecto',
        clientName: project?.client || project?.client_name || '',
        clientDoc: project?.client_doc || '',
        clientPhone: project?.client_phone || '',
        clientEmail: project?.client_email || '',
        advisorName: project?.advisor_name || '',
        advisorPhone: project?.advisor_phone || '',
        validez,
        despieceData,
        serviciosData,
        hardwareData,
        companyName: companySettings?.company_name || 'Mi Empresa',
        companyNit: companySettings?.nit || 'XXX.XXX.XXX-X',
        companyLogo: companySettings?.logo_data || '',
        companyAddress: companySettings?.address || '',
        companyEmail: companySettings?.contact_email || '',
        companyPhone: companySettings?.contact_phone || '',
        conditions: [
          'Validez de la oferta 3 días.',
          'Cotización sujeta a revisión de condiciones.',
          'Precios incluyen IVA.',
          'Antes de comprar verifique existencias.'
        ]
      });

      doc.save(`${project?.title || project?.name || 'cotizacion'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(err) {
      console.error("Error exportando PDF:", err);
      alert("Error al exportar PDF: " + err.message);
    }
  };

  const projectName = project?.title || `Proyecto #${id}`;
  const clientName = project?.client || 'Cliente No Asignado';
  const state = project?.state || 'EN PROGRESO';

  const tabs = [
    { id: 'despiece', label: 'Despiece', icon: 'architecture' },
    { id: 'herajes', label: 'Herrajes y Extras', icon: 'hardware' },
    { id: 'resumen', label: 'Cotización', icon: 'receipt_long' }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toast notification */}
      {toast && (
        <div 
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {servicePicker.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1a233a] px-5 py-4 bg-[#060e20]">
              <div>
                <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Agregar servicio a la lámina</h3>
                <p className="text-[#a3aac4] text-sm mt-1">Elegí un servicio del catálogo</p>
              </div>
              <button
                onClick={closeServicePicker}
                className="text-[#a3aac4] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-[#1a233a]">
              <input
                type="text"
                autoFocus
                value={servicePicker.query}
                onChange={(e) => setServicePicker((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="Buscar servicio..."
                className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
              />
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {filteredServices.length === 0 ? (
                <div className="text-center text-[#a3aac4] py-10">
                  <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                  <p>No hay servicios que coincidan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredServices.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => {
                        addManualServiceToMaterial(servicio, servicePicker.materialId);
                        closeServicePicker();
                      }}
                      className="w-full text-left rounded-xl border border-[#1a233a] bg-[#060e20] px-4 py-3 hover:border-[#00d1ed]/50 hover:bg-[#0f1930] transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[#dee5ff] font-medium">{servicio.nombre}</div>
                          <div className="text-[#a3aac4] text-sm">{servicio.descripcion || 'Sin descripción'}</div>
                        </div>
                        <div className="text-[#00d1ed] font-bold whitespace-nowrap">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(servicio.precio || 0))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Header Fijo del Workspace */}
      <header className="shrink-0 bg-[#060e20] border-b border-[#1a233a] sticky top-0 z-10">
        <div className="px-5 pt-4 pb-0">
          
          <div className="flex items-start justify-between mb-4 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group w-9 h-9 flex items-center justify-center rounded-full bg-[#1a233a]/50 text-[#a3aac4] hover:text-[#99f7ff] border border-[#40485d]/30 transition-all shrink-0"
                title="Volver a Proyectos"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
              </button>
              
              <div className="min-w-0">
                <h1 className="font-['Space_Grotesk'] text-[26px] font-bold text-[#dee5ff] flex items-center gap-2 min-w-0">
                  <span className="truncate">{projectName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider border align-middle ${
                    state === 'APROBADA' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                    state === 'RECHAZADA' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {state}
                  </span>
                </h1>
                <p className="text-[#a3aac4] text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                  Cliente: <strong className="text-[#dee5ff]">{clientName}</strong>
                </p>
              </div>
            </div>

             <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-[#1a233a] border border-[#40485d]/50 text-[#dee5ff] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#202b46] transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSaving ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin text-[#00e0fe]">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">save</span>
                  )}
                  {isSaving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
             
             {/* Compact Stats - Moved from Despiece body */}
             {activeTab === 'despiece' && (
                <div className="flex gap-2">
                   <DespieceStatsBar 
                     laminaCount={despieceStats.laminaCount}
                     piezaCount={despieceStats.piezaCount}
                     onOpenNesting={openNestingHandler}
                     compact={true}
                   />
                </div>
              )}
          </div>

          {/* Nav Tabs */}
          <nav className="flex gap-1 overflow-x-auto scroolbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#00e0fe] text-[#00e0fe]'
                    : 'border-transparent text-[#a3aac4] hover:text-[#dee5ff] hover:bg-[#1a233a]/20 rounded-t-lg'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'text-[#00e0fe]' : ''}`}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area para las pestañas */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0a1122]">
        {loading ? (
           <div className="flex h-full items-center justify-center text-[#00e0fe]">
             <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
             Cargando proyecto...
           </div>
        ) : (
          <>
             {activeTab === 'despiece' && (
                <Despiece 
                  initialData={despieceData} 
                  onChange={setDespieceData}
                  onStatsChange={setDespieceStats}
                  onOpenNesting={setOpenNestingHandler}
                  isNested={true} 
                  projectName={projectName}
                  clientName={clientName}
                />
             )}
            {activeTab === 'herajes' && (
              <HerajesPanel 
                initialData={hardwareData} 
                onChange={setHardwareData} 
              />
            )}
            {activeTab === 'resumen' && (
              <ResumenPanel 
                despieceData={despieceData}
                despieceStats={despieceStats}
                hardwareData={hardwareData}
                servicios={servicios}
                cantosInventory={cantosInventory}
                inventoryItems={materialesInventory}
                onExportPDF={handleExportPDF}
                onAddService={handleAddService}
                onUpdateManualQuantity={handleUpdateManualQuantity}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
