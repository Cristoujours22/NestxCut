import { useState, useEffect } from 'react';

export default function UpdateChecker() {
  const [status, setStatus] = useState(null);
  const [version, setVersion] = useState(null);
  const [percent, setPercent] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((data) => {
      setStatus(data.status);
      if (data.version) setVersion(data.version);
      if (data.percent != null) setPercent(Math.round(data.percent));
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.();
  };

  // Don't show anything if dismissed, no status, or up-to-date
  if (dismissed || !status || status === 'up-to-date' || status === 'checking' || status === 'error') return null;

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
