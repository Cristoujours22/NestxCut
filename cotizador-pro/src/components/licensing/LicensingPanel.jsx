// components/licensing/LicensingPanel.jsx - Minimal subscription status
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSubscriptionStatus, formatDate } from '../../utils/subscription';
import { getDeviceId } from '../../utils/deviceId';

export default function LicensingPanel() {
  const { userData, isAdmin, hasAccess, accessDecision } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deviceHid, setDeviceHid] = useState('Cargando...');
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadHid = async () => {
      const hid = await getDeviceId();
      if (!cancelled) setDeviceHid(hid);
    };
    loadHid();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleActivate = () => {
    navigate('/subscription-expired');
  };

  const handleCopyHid = async () => {
    try {
      await navigator.clipboard.writeText(deviceHid);
    } catch (err) {
      console.error('No se pudo copiar el HID:', err);
    }
  };

  const subscriptionStatus = getSubscriptionStatus(userData);
  const deviceAccess = accessDecision?.device;
  const effectiveDaysRemaining = !subscriptionStatus.isUnlimited
    ? Number.isFinite(Number(userData?.daysRemaining))
      ? Number(userData?.daysRemaining)
      : subscriptionStatus.daysLeft
    : null;
  const remainingLabel = (() => {
    if (subscriptionStatus.isUnlimited) return 'ILIMITADO';

    if (deviceAccess?.expiresAt && deviceAccess?.hasDeviceAccess) {
      const endDate = new Date(deviceAccess.expiresAt);
      const diffMs = endDate.getTime() - nowMs;
      if (diffMs <= 0) return null;

      const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;

      if (days > 0) {
        return hours > 0
          ? `${days} día${days === 1 ? '' : 's'} y ${hours} hora${hours === 1 ? '' : 's'}`
          : `${days} día${days === 1 ? '' : 's'}`;
      }

      return `${Math.max(hours, 1)} hora${Math.max(hours, 1) === 1 ? '' : 's'}`;
    }

    const endDate = subscriptionStatus.endDate;
    if (!endDate) {
      return effectiveDaysRemaining > 0 ? `${effectiveDaysRemaining} días` : null;
    }

    const diffMs = endDate.getTime() - nowMs;
    if (diffMs <= 0) return null;

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) {
      return hours > 0
        ? `${days} día${days === 1 ? '' : 's'} y ${hours} hora${hours === 1 ? '' : 's'}`
        : `${days} día${days === 1 ? '' : 's'}`;
    }

    const safeHours = Math.max(hours, 1);
    return `${safeHours} hora${safeHours === 1 ? '' : 's'}`;
  })();

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-[#1a233a] animate-pulse">
        <div className="h-5 bg-[#1a233a] rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 w-full">
        {/* Título */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#99f7ff]">workspace_premium</span>
          <h2 className="font-['Space_Grotesk'] text-[15px] font-bold text-[#99f7ff] uppercase tracking-wider">Suscripción</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-[#1a233a] to-transparent"></div>
        </div>

        <div className="glass-panel py-4 px-5 rounded-2xl border border-[#1a233a] shadow-lg relative overflow-hidden">
          {/* Fondo decorativo */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-[0.05] -translate-y-1/2 translate-x-1/2 pointer-events-none
            ${hasAccess ? 'bg-green-500' : 'bg-red-500'}`}></div>

          <div className="flex items-center justify-between gap-3 relative z-10 w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {hasAccess ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  )}
                </span>
                <span className={`font-black text-[12px] tracking-widest uppercase ${hasAccess ? 'text-green-400' : 'text-red-400'} truncate`}>
                  {hasAccess ? 'ACTIVA' : 'INACTIVA'}
                </span>
              </div>
              
              {hasAccess && (
                subscriptionStatus.isUnlimited ? (
                  <span className="text-cyan-400 text-[11px] font-medium ml-4.5 truncate">
                    ILIMITADO
                  </span>
                  ) : remainingLabel ? (
                    <span className="text-[#a3aac4] text-[11px] font-medium ml-4.5 truncate">
                      Quedan <strong className="text-[#dee5ff]">{remainingLabel}</strong>
                    </span>
                  ) : null
                )}
                {!isAdmin && accessDecision?.device?.status && (
                  <span className="text-[#6f7a97] text-[10px] font-medium ml-4.5 truncate uppercase tracking-wider">
                    Licencia equipo: {accessDecision.device.status}
                  </span>
                )}
              </div>

            <div className="shrink-0 flex justify-end">
              {!hasAccess ? (
                <button
                  onClick={handleActivate}
                  className="bg-gradient-to-r from-green-500 to-emerald-400 text-[#002f33] px-3 py-1.5 rounded-md text-[13px] font-bold flex items-center gap-1.5 shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.4)] hover:-translate-y-px transition-all active:translate-y-0">
                  <span className="material-symbols-outlined text-[16px]">credit_card</span>
                  <span>Activar</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#1a233a] border border-[#40485d]/30 text-[#dee5ff] px-3 py-1.5 rounded-md text-[13px] font-bold flex items-center gap-1.5 hover:bg-[#a3aac4]/10 hover:border-[#99f7ff]/50 hover:text-[#99f7ff] transition-all hover:-translate-y-px active:translate-y-0"
                >
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Detalles</span>
                </button>
              )}
            </div>
          </div>

          {userData?.plan && (
            <div className="mt-3 pt-3 border-t border-[#1a233a]/50">
              <div className="flex flex-col gap-2">
                <span className="text-[#a3aac4] text-[11px]">
                  Plan: <strong className="text-[#dee5ff] capitalize">{userData.plan}</strong>
                </span>
                {!isAdmin && (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#6f7a97] text-[10px] font-medium uppercase tracking-wider shrink-0">HID</span>
                    <code className="flex-1 rounded bg-[#060e20] px-2 py-1 text-[10px] text-[#dee5ff] font-mono truncate">
                      {deviceHid}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyHid}
                      className="text-[10px] px-2 py-1 rounded bg-[#1a233a] text-[#99f7ff] hover:bg-[#24304f] shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalles */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#99f7ff]">person</span>
                Mi Suscripción
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Estado */}
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-3 w-3 rounded-full ${hasAccess ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`font-bold ${hasAccess ? 'text-green-400' : 'text-red-400'}`}>
                    {hasAccess ? 'SUSCRIPCIÓN ACTIVA' : 'SUSCRIPCIÓN VENCIDA'}
                  </span>
                </div>
                {subscriptionStatus.isUnlimited ? (
                  <p className="text-cyan-400 text-sm">
                    Acceso ILIMITADO (Admin)
                  </p>
                ) : remainingLabel ? (
                  <p className="text-gray-400 text-sm">
                    Tiempo restante: <strong className="text-white">{remainingLabel}</strong>
                  </p>
                ) : null}
              </div>

              {/* Fechas */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-400 uppercase">Fechas</h4>
                <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                  {subscriptionStatus.type === 'trial' && userData?.trialEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Trial vence:</span>
                      <span className="text-white">{formatDate(userData.trialEnd)}</span>
                    </div>
                  )}
                  {subscriptionStatus.type === 'subscription' && userData?.subscriptionEnd && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Suscripción vence:</span>
                      <span className="text-white">{formatDate(userData.subscriptionEnd)}</span>
                    </div>
                  )}
                  {userData?.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Creado:</span>
                      <span className="text-white">{formatDate(userData.createdAt)}</span>
                    </div>
                  )}
                  {userData?.activatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Activado:</span>
                      <span className="text-white">{formatDate(userData.activatedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {!isAdmin && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase">Equipo</h4>
                  <div className="bg-gray-900 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-400">HID actual:</span>
                      <code className="text-white text-right font-mono text-xs break-all">{deviceHid}</code>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHid}
                      className="w-full bg-[#1a233a] border border-[#40485d]/30 text-[#dee5ff] px-3 py-2 rounded-md text-sm font-bold hover:bg-[#a3aac4]/10 hover:border-[#99f7ff]/50 hover:text-[#99f7ff] transition-all"
                    >
                      Copiar HID
                    </button>
                  </div>
                </div>
              )}

              {/* Datos del usuario */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-400 uppercase">Datos</h4>
                <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                  {userData?.nombre && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Nombre:</span>
                      <span className="text-white">{userData.nombre} {userData.apellido}</span>
                    </div>
                  )}
                  {userData?.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white text-right">{userData.email}</span>
                    </div>
                  )}
                  {userData?.celular && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Celular:</span>
                      <span className="text-white">{userData.celular}</span>
                    </div>
                  )}
                  {userData?.direccion && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dirección:</span>
                      <span className="text-white text-right">{userData.direccion}</span>
                    </div>
                  )}
                  {userData?.ocupacion && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ocupación:</span>
                      <span className="text-white">{userData.ocupacion}</span>
                    </div>
                  )}
                  {userData?.empresa && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Empresa:</span>
                      <span className="text-white">{userData.empresa}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-400 uppercase">Plan</h4>
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tipo:</span>
                    <span className="text-white capitalize">{userData?.plan || 'Trial'}</span>
                  </div>
                  {userData?.role && (
                    <div className="flex justify-between mt-2">
                      <span className="text-gray-400">Rol:</span>
                      <span className={`${userData.role === 'admin' ? 'text-cyan-400' : 'text-white'}`}>
                        {userData.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botón para renovar */}
              {!hasAccess && (
                <button
                  onClick={() => {
                    setShowModal(false);
                    handleActivate();
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  Renovar Suscripción
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
