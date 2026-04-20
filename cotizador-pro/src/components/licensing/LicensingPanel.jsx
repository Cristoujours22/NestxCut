// components/licensing/LicensingPanel.jsx - Minimal subscription status
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSubscriptionStatus, formatDate } from '../../utils/subscription';

export default function LicensingPanel() {
  const { userData, isAdmin, hasAccess } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleActivate = () => {
    navigate('/subscription-expired');
  };

  const subscriptionStatus = getSubscriptionStatus(userData);

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
                ) : subscriptionStatus.daysLeft > 0 ? (
                  <span className="text-[#a3aac4] text-[11px] font-medium ml-4.5 truncate">
                    Quedan <strong className="text-[#dee5ff]">{subscriptionStatus.daysLeft}</strong> días
                  </span>
                ) : null
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
              <span className="text-[#a3aac4] text-[11px]">
                Plan: <strong className="text-[#dee5ff] capitalize">{userData.plan}</strong>
              </span>
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
                ) : subscriptionStatus.daysLeft > 0 ? (
                  <p className="text-gray-400 text-sm">
                    Tiempo restante: <strong className="text-white">{subscriptionStatus.daysLeft} días</strong>
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