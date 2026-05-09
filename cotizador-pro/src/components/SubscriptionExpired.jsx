// src/components/SubscriptionExpired.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSubscriptionStatus, formatDate } from '../utils/subscription';
import { getDeviceId } from '../utils/deviceId';

const SubscriptionExpired = () => {
  const navigate = useNavigate();
  const { userData, logout, accessDecision } = useAuth();
  const [deviceHid, setDeviceHid] = React.useState('Cargando...');
  const [nowMs, setNowMs] = React.useState(Date.now());
  
  const status = getSubscriptionStatus(userData);
  const deviceReason = accessDecision?.reason;
  const title = deviceReason === 'device-license-missing'
    ? 'Equipo sin licencia'
    : 'Suscripción Vencida';
  const subtitle = deviceReason === 'device-license-missing'
    ? 'Este equipo no tiene una licencia activa asignada'
    : 'Tu acceso a NestxCut ha expirado';
  const remainingLabel = (() => {
    if (status.isUnlimited) return 'ILIMITADO'
    if (accessDecision?.device?.expiresAt) {
      const endDate = new Date(accessDecision.device.expiresAt)
      const diffMs = endDate.getTime() - nowMs
      if (diffMs <= 0) return null

      const totalHours = Math.ceil(diffMs / (1000 * 60 * 60))
      const days = Math.floor(totalHours / 24)
      const hours = totalHours % 24

      if (days > 0) {
        return hours > 0
          ? `${days} día${days === 1 ? '' : 's'} y ${hours} hora${hours === 1 ? '' : 's'}`
          : `${days} día${days === 1 ? '' : 's'}`
      }

      return `${Math.max(hours, 1)} hora${Math.max(hours, 1) === 1 ? '' : 's'}`
    }

    const endDate = status.endDate
    if (!endDate) {
      return status.daysLeft > 0 ? `${status.daysLeft} días` : null
    }

    const diffMs = endDate.getTime() - nowMs
    if (diffMs <= 0) return null

    const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24

    if (days > 0) {
      return hours > 0
        ? `${days} día${days === 1 ? '' : 's'} y ${hours} hora${hours === 1 ? '' : 's'}`
        : `${days} día${days === 1 ? '' : 's'}`
    }

    const safeHours = Math.max(hours, 1)
    return `${safeHours} hora${safeHours === 1 ? '' : 's'}`
  })()
  
  // WhatsApp link con mensaje prellenado
  const whatsappNumber = '573027470232';
  const customerName = userData?.empresa || `${userData?.nombre || ''} ${userData?.apellido || ''}`.trim() || 'N/A';
  const customerDocument = userData?.cedula || userData?.nit || 'N/A';
  const whatsappMessage = encodeURIComponent(
    `Concepto: Mensualidad NestxCUT\nNombre cliente o empresa: ${customerName}\nCédula: ${customerDocument}`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  
  // Datos de transferencia (esto debería venir de config)
  const bankInfo = {
    banco: 'Nequi',
    cuenta: '3027470232',
    titular: 'Cristian A Pelaez',
    identificacion: '1094912367'
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  React.useEffect(() => {
    let cancelled = false;
    const loadHid = async () => {
      const hid = await getDeviceId();
      if (!cancelled) setDeviceHid(hid);
    };
    loadHid();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  const handleCopyHid = async () => {
    try {
      await navigator.clipboard.writeText(deviceHid);
    } catch (err) {
      console.error('No se pudo copiar el HID:', err);
    }
  };
  
return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header - más compacto */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
              <p className="text-red-100 text-sm">{subtitle}</p>
            </div>
          </div>
        </div>
        
        {/* Content - layout de dos columnas responsive */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Columna Izquierda: Estado de cuenta + HID */}
            <div className="space-y-4">
              {/* Estado de cuenta */}
              {userData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Estado de tu cuenta</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-900">
                    <span className="text-gray-700">Plan:</span>
                    <span className="font-medium capitalize">{accessDecision?.device?.plan || userData.plan || 'N/A'}</span>
                    {userData.trialEnd && status.isInTrial && (
                      <>
                        <span className="text-gray-700">Trial hasta:</span>
                        <span className="font-medium">{formatDate(userData.trialEnd)}</span>
                      </>
                    )}
                    {accessDecision?.device?.expiresAt && !remainingLabel && (
                      <>
                        <span className="text-gray-700">Expiró:</span>
                        <span className="font-medium">{formatDate(accessDecision.device.expiresAt)}</span>
                      </>
                    )}
                    {accessDecision?.device?.status && (
                      <>
                        <span className="text-gray-700">Estado:</span>
                        <span className="font-medium capitalize">
                          {accessDecision.device.status === 'EXPIRED' ? 'Vencida' : accessDecision.device.status}
                        </span>
                      </>
                    )}
                    {remainingLabel && (
                      <>
                        <span className="text-gray-700">Restante:</span>
                        <span className="font-medium">{remainingLabel}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* HID del equipo */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">🔑 HID del equipo</h4>
                <p className="text-xs text-yellow-700 mb-3">
                  Enviá este código al administrador para activar tu licencia.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white px-3 py-2 text-xs font-mono text-gray-800 break-all border border-yellow-200">
                    {deviceHid}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyHid}
                    className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium whitespace-nowrap"
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
            
            {/* Columna Derecha: Renovación */}
            <div className="space-y-4">
              {/* Plan y precio */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-1">📅 Suscripción Mensual</p>
                <p className="text-3xl font-bold text-green-900">
                  $49.900<span className="text-base font-normal">/mes</span>
                </p>
              </div>
              
              {/* Tiempo de activación */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⏱️</span>
                  <div>
                    <p className="font-medium text-blue-800">Activación en 24 horas</p>
                    <p className="text-sm text-blue-600">
                      Una vez realizado el pago, te activamos.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Opciones de pago */}
              <div className="space-y-3">
                <p className="text-gray-600 text-sm font-medium">Elige cómo pagar:</p>
                
                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Escríbenos por WhatsApp
                </a>
                
                {/* Transferencia */}
                <div className="bg-gray-100 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🏦 Transferencia</h4>
                  <div className="grid grid-cols-2 gap-1 text-sm text-gray-900">
                    <span className="text-gray-700">Banco:</span>
                    <span className="font-medium">{bankInfo.banco}</span>
                    <span className="text-gray-700">Cuenta:</span>
                    <span className="font-medium">{bankInfo.cuenta}</span>
                    <span className="text-gray-700">Titular:</span>
                    <span className="font-medium">{bankInfo.titular}</span>
                    <span className="text-gray-700">CC:</span>
                    <span className="font-medium">{bankInfo.identificacion}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Luego de pagar, escribinos por WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer con logout */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              ¿Ya pagaste? Escríbenos para activar tu cuenta
            </p>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700 text-sm px-4 py-2"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpired;
