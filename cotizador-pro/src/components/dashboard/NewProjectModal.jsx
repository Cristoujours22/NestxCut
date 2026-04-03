import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewProjectModal({ isOpen, onClose }) {
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim()) return;
    
    // Aquí después conectaremos la lógica real de guardado
    const newProjectId = Date.now().toString(); // ID temporal
    console.log("Creando proyecto:", { id: newProjectId, projectName, clientName });
    
    onClose();
    // Navegar directamente al Project Workspace
    navigate(`/proyecto/${newProjectId}`, { state: { projectName, clientName } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden transform transition-all"
      >
        {/* Header Modal */}
        <div className="flex justify-between items-center p-6 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">Crear Nuevo Proyecto</h2>
          <button 
            onClick={onClose}
            className="text-[#a3aac4] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Nombre del Proyecto <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              required
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Cocina Integral Blanca" 
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Nombre del Cliente <span className="text-red-400">*</span></label>
            <input 
              type="text" 
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Flia. Pérez" 
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
            />
          </div>

          {/* Footer Modal */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a] transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!projectName.trim() || !clientName.trim()}
              className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(0,224,254,0.15)]"
            >
              Comenzar Cotización
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
