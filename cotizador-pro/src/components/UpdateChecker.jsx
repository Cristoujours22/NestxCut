import { useState, useEffect } from 'react';
import pkg from '../../package.json' with { type: 'json' };

const localVersion = pkg.version;

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/Cristoujours22/NestxCut/releases/latest';

/** Simple semver compare: returns 1 if a > b, -1 if a < b, 0 if equal */
function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (va > vb) return 1;
    if (va < vb) return -1;
  }
  return 0;
}

/** Strip leading 'v' from tag_name (e.g. "v0.0.2" → "0.0.2") */
function cleanVersion(raw) {
  return typeof raw === 'string' ? raw.replace(/^v/i, '') : raw;
}

export default function UpdateChecker() {
  const [update, setUpdate] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(GITHUB_RELEASES_URL, {
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (cancelled) return;
        if (!res.ok) return;
        const release = await res.json();
        const latest = cleanVersion(release.tag_name);
        if (!latest) return;
        if (compareVersions(latest, localVersion) > 0) {
          const asset = Array.isArray(release.assets) ? release.assets[0] : null;
          setUpdate({
            version: latest,
            downloadUrl: asset?.browser_download_url || release.html_url || '#',
            releaseNotes: release.body || '',
          });
        }
      } catch (err) {
        console.error('[UpdateChecker] error:', err);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  const handleDownload = () => {
    if (update?.downloadUrl) {
      // Try Electron IPC first, fallback to window.open
      if (window.electronAPI?.openUrl) {
        window.electronAPI.openUrl(update.downloadUrl);
      } else {
        window.open(update.downloadUrl, '_blank');
      }
    }
  };

  if (!update || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1a233a] bg-[#0a1122] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1a233a] bg-[#060e20] flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00e0fe] text-[24px]">system_update</span>
          <div>
            <h3 className="text-[#dee5ff] font-bold font-['Space_Grotesk']">Actualización disponible</h3>
            <p className="text-[#a3aac4] text-xs mt-0.5">Versión {update.version}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {update.releaseNotes && (
            <div className="bg-[#060e20] rounded-xl border border-[#1a233a] p-4">
              <p className="text-[#a3aac4] text-xs font-bold uppercase tracking-wider mb-2">Novedades</p>
              <p className="text-[#dee5ff] text-sm whitespace-pre-wrap">{update.releaseNotes}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="px-4 py-2 rounded-lg border border-[#1a233a] bg-[#10182d] text-[#a3aac4] hover:text-white hover:bg-[#15213b] transition-colors"
            >
              Ahora no
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-[#00e0fe] text-[#002f33] font-bold hover:bg-[#99f7ff] transition-colors shadow-[0_4px_15px_rgba(0,224,254,0.2)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
