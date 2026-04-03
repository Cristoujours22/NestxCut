// components/licensing/LicensingPanel.jsx - Minimal subscription status
import { useState, useEffect } from 'react';
import { getLicenseStatus, isLicenseValid, getDaysRemaining } from '../../licensing/licenseManager';
import { openCheckoutFromEnv } from '../../licensing/paddleIntegration';

export default function LicensingPanel({ userId }) {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paddleLoading, setPaddleLoading] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [userId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await getLicenseStatus(userId);
      if (result.success) setLicense(result.license);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    try {
      setPaddleLoading(true);
      await openCheckoutFromEnv({}, '', userId, loadStatus);
    } catch (err) {
      setError(err.message);
    } finally {
      setPaddleLoading(false);
    }
  };

  const isValid = isLicenseValid(license);
  const days = getDaysRemaining(license);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-[#1a233a] animate-pulse">
        <div className="h-5 bg-[#1a233a] rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Título Externo para igualar al resto */}
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[#99f7ff]">workspace_premium</span>
        <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">Suscripción</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[#1a233a] to-transparent"></div>
      </div>

      <div className="glass-panel py-4 px-5 rounded-2xl border border-[#1a233a] shadow-lg relative overflow-hidden">
        {/* Fondo decorativo según estado */}
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-[0.05] -translate-y-1/2 translate-x-1/2 pointer-events-none
          ${isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>

        <div className="flex items-center justify-between gap-3 relative z-10 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isValid ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                )}
              </span>
              <span className={`font-black text-[12px] tracking-widest uppercase ${isValid ? 'text-green-400' : 'text-red-400'} truncate`}>
                {isValid ? 'ACTIVA' : 'INACTIVA'}
              </span>
            </div>
            
            {isValid && days > 0 && (
              <span className="text-[#a3aac4] text-[11px] font-medium ml-4.5 truncate">
                Quedan <strong className="text-[#dee5ff]">{days}</strong> d
              </span>
            )}
          </div>

          <div className="shrink-0 flex justify-end">
            {!isValid ? (
              <button
                onClick={handleActivate}
                disabled={paddleLoading}
                className="bg-gradient-to-r from-green-500 to-emerald-400 text-[#002f33] px-3 py-1.5 rounded-md text-[13px] font-bold flex items-center gap-1.5 shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.4)] hover:-translate-y-px transition-all active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed">
                {paddleLoading ? (
                  <span className="animate-spin material-symbols-outlined text-[16px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">credit_card</span>
                )}
                <span>Activar</span>
              </button>
            ) : (
              <button
                onClick={handleActivate}
                className="bg-[#1a233a] border border-[#40485d]/30 text-[#dee5ff] px-3 py-1.5 rounded-md text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#a3aac4]/10 hover:border-[#99f7ff]/50 hover:text-[#99f7ff] transition-all hover:-translate-y-px active:translate-y-0"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                <span>Gestionar</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}