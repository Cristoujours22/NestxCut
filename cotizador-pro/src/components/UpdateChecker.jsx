import { useState, useEffect, useRef } from 'react';

export default function UpdateChecker() {
  const [status, setStatus] = useState(null);
  const [version, setVersion] = useState(null);
  const [percent, setPercent] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const autoDismissRef = useRef(null);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((data) => {
      setStatus(data.status);
      if (data.version) setVersion(data.version);
      if (data.percent != null) setPercent(Math.round(data.percent));
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  // Auto-dismiss "up-to-date" toast after 5 seconds
  useEffect(() => {
    if (status === 'up-to-date') {
      autoDismissRef.current = setTimeout(() => setDismissed(true), 5000);
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [status]);

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.();
  };

  // Don't show anything if dismissed or no status
  if (dismissed || !status) return null;

  // Show up-to-date message briefly then hide. Click or auto-dismiss.
  if (status === 'up-to-date') {
    return (
      <div
        onClick={() => setDismissed(true)}
        className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border border-green-800 bg-green-950 shadow-2xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-green-400 text-[20px]">check_circle</span>
          <p className="text-green-200 text-sm font-bold">Estás actualizado</p>
        </div>
      </div>
    );
  }

  // Show error with retry option
  if (status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border border-red-800 bg-red-950 shadow-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-red-400 text-[20px]">error</span>
          <p className="text-red-200 text-sm font-bold">Error de actualización</p>
        </div>
        <p className="text-red-300 text-xs mb-3">No se pudo verificar actualizaciones.</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-lg border border-red-800 text-red-400 text-xs hover:bg-red-900 transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={() => window.electronAPI?.checkForUpdates?.()}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Hide checking status
  if (status === 'checking') return null;

  // Downloading: show subtle progress bar
  if (status === 'downloading') {
    return (
      <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border border-[#1a233a] bg-[#0a1122] shadow-2xl p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="material-symbols-outlined text-[#00e0fe] text-[20px] animate-spin">downloading</span>
          <p className="text-[#dee5ff] text-sm font-bold">Descargando actualización...</p>
        </div>
        <div className="w-full bg-[#1a233a] rounded-full h-2">
          <div className="bg-[#00e0fe] h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-[#a3aac4] text-xs mt-1">{percent}%</p>
      </div>
    );
  }

  // Downloaded: show restart modal
  if (status === 'downloaded') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1a233a] bg-[#060e20] flex items-center gap-3">
            <span className="material-symbols-outlined text-green-400 text-[24px]">check_circle</span>
            <div>
              <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Actualización lista</h3>
              <p className="text-[#a3aac4] text-xs mt-0.5">Versión {version}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <p className="text-[#dee5ff] text-sm">
              La actualización se descargó correctamente. La app se reiniciará para aplicar los cambios.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="px-4 py-2 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#a3aac4] hover:text-white hover:bg-[#15213b] transition-colors"
              >
                Después
              </button>
              <button
                type="button"
                onClick={handleInstall}
                className="px-4 py-2 rounded-lg bg-green-500 text-white font-bold hover:bg-green-400 transition-colors shadow-[0_4px_15px_rgba(34,197,94,0.3)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reiniciar ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Available: show download starting message
  if (status === 'available') {
    return (
      <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-xl border border-[#1a233a] bg-[#0a1122] shadow-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00e0fe] text-[20px] animate-pulse">download</span>
          <p className="text-[#dee5ff] text-sm font-bold">Actualización encontrada, descargando...</p>
        </div>
      </div>
    );
  }

  return null;
}
