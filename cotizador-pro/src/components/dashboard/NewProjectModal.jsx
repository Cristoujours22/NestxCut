import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function NewProjectModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [savingClient, setSavingClient] = useState(false);
  const [clientMessage, setClientMessage] = useState(null);
  const [clientSaved, setClientSaved] = useState(false);
  const [loadedClient, setLoadedClient] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setProjectName('');
      setClientDoc('');
      setClientName('');
      setClientPhone('');
      setClientMessage(null);
      setSavingClient(false);
      setClientSaved(false);
      setLoadedClient(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const loadClientByDocument = async () => {
    const documento = clientDoc.trim();
    if (!documento || !window.electronAPI?.getClientByDocument) return;

    try {
      const client = await window.electronAPI.getClientByDocument(documento);
      if (client) {
        setClientName(client.nombre || '');
        setClientPhone(client.celular || '');
        setClientMessage({ ok: true, text: 'Cliente encontrado y cargado automáticamente.' });
        setClientSaved(true);
        setLoadedClient({
          documento: client.documento || documento,
          nombre: client.nombre || '',
          celular: client.celular || ''
        });
      } else {
        setClientMessage({ ok: false, text: 'Cliente no encontrado. Podés cargarlo y guardarlo.' });
        setClientSaved(false);
        setLoadedClient(null);
      }
    } catch (error) {
      setClientMessage({ ok: false, text: 'Error al buscar cliente.' });
      setClientSaved(false);
      setLoadedClient(null);
    }
  };

  const clientChanged = !loadedClient ||
    String(loadedClient.documento || '').trim() !== String(clientDoc || '').trim() ||
    String(loadedClient.nombre || '').trim() !== String(clientName || '').trim() ||
    String(loadedClient.celular || '').trim() !== String(clientPhone || '').trim();

  const handleSaveClient = async () => {
    if (!clientDoc.trim() || !clientName.trim()) return null;
    setSavingClient(true);
    setClientMessage(null);

    try {
      const result = await window.electronAPI?.saveClient({
        documento: clientDoc.trim(),
        nombre: clientName.trim(),
        celular: clientPhone.trim()
      });

      if (result?.success) {
        setClientMessage({ ok: true, text: 'Cliente guardado correctamente.' });
        setClientSaved(true);
        setLoadedClient({
          documento: String(clientDoc || '').trim(),
          nombre: String(clientName || '').trim(),
          celular: String(clientPhone || '').trim()
        });
        return result.client;
      }

      setClientMessage({ ok: false, text: 'No se pudo guardar el cliente.' });
      return null;
    } catch (error) {
      setClientMessage({ ok: false, text: error.message || 'Error al guardar cliente.' });
      return null;
    } finally {
      setSavingClient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !clientDoc.trim() || !clientName.trim() || !clientPhone.trim()) return;

    const newProjectId = Date.now().toString();
    if (!clientSaved) return;

    const savedClient = await window.electronAPI?.getClientByDocument?.(clientDoc.trim());
    if (!savedClient) {
      setClientMessage({ ok: false, text: 'Primero debés guardar el cliente.' });
      return;
    }

    if (window.electronAPI?.saveProject) {
      await window.electronAPI.saveProject({
        id: newProjectId,
        owner_uid: user?.uid || '',
        title: projectName,
        client: clientName,
        client_doc: clientDoc,
        client_phone: clientPhone,
        client_id: savedClient?.id || null,
        state: 'EDICION',
        total: 0,
        despiece_data: '[]',
        hardware_data: '{}',
        summary_data: '{}'
      });
    } else {
      console.warn('Electron API not available, running in browser mode');
    }

    onClose();
    navigate(`/proyecto/${newProjectId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0a1122] border border-[#1a233a] rounded-2xl shadow-2xl overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-[#1a233a] bg-[#060e20]">
          <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">Crear Nuevo Proyecto</h2>
          <button
            onClick={onClose}
            className="text-[#a3aac4] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {clientMessage && (
            <div className={`text-sm px-3 py-2 rounded-lg ${clientMessage.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'}`}>
              {clientMessage.text}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Nombre del Proyecto <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Cocina Integral Blanca"
              disabled={!clientSaved}
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d] disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Cédula / NIT <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={clientDoc}
              onChange={(e) => { setClientDoc(e.target.value); setClientSaved(false); }}
              onBlur={loadClientByDocument}
              placeholder="Ej: 123456789 o 900123456"
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Nombre del Cliente <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setClientSaved(false); }}
              placeholder="Ej: Flia. Pérez"
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#a3aac4]">Celular <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={clientPhone}
              onChange={(e) => { setClientPhone(e.target.value); setClientSaved(false); }}
              placeholder="Ej: 3001234567"
              className="w-full bg-[#060e20] border border-[#1a233a] text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00e0fe]/50 focus:ring-1 focus:ring-[#00e0fe]/50 transition-all placeholder:text-[#40485d]"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleSaveClient}
                disabled={savingClient || !clientDoc.trim() || !clientName.trim() || !clientChanged}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1a233a] text-[#99f7ff] hover:bg-[#202b46] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingClient ? 'Guardando cliente...' : clientSaved ? 'Cliente guardado' : 'Guardar cliente'}
              </button>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#a3aac4] hover:text-white hover:bg-[#1a233a] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingClient || !clientSaved || !projectName.trim()}
                className="bg-[#00e0fe] text-[#002f33] px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#99f7ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(0,224,254,0.15)]"
              >
                Comenzar Cotización
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
