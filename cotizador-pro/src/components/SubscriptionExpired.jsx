// src/components/SubscriptionExpired.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSubscriptionStatus, formatDate } from '../utils/subscription';

const SubscriptionExpired = () => {
  const navigate = useNavigate();
  const { userData, logout } = useAuth();
  
  const status = getSubscriptionStatus(userData);
  
  // WhatsApp link con mensaje prellenado
  const whatsappNumber = '573000000000'; // TODO: Cambiar al número real
  const whatsappMessage = encodeURIComponent(
    `Hola, me gustaría activar mi suscripción de NestxCut. Mi email es: ${userData?.email || 'N/A'}`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
  
  // Datos de transferencia (esto debería venir de config)
  const bankInfo = {
    banco: 'Banco de Colombia',
    cuenta: 'Cuenta de Ahorros 123456789',
    titular: 'NestxCut',
    identificacion: '123.456.789-0'
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Suscripción Vencida</h1>
          <p className="text-red-100 mt-2">Tu acceso a NestxCut ha expirado</p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Estado actual */}
          {userData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Estado de tu cuenta</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan actual:</span>
                  <span className="font-medium capitalize">{userData.plan || 'N/A'}</span>
                </div>
                {userData.trialEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trial terminé:</span>
                    <span className="font-medium">{formatDate(userData.trialEnd)}</span>
                  </div>
                )}
                {userData.subscriptionEnd && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Suscripción terminée:</span>
                    <span className="font-medium">{formatDate(userData.subscriptionEnd)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Información de pago */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              ✨ Reactiva tu suscripción
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-800 text-sm font-medium mb-2">
                📅 Suscripción Mensual
              </p>
              <p className="text-2xl font-bold text-green-900">
                $49.900 COP<span className="text-sm font-normal">/mes</span>
              </p>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Elige cómo quieres pagar:
            </p>
            
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg text-center mb-3 transition-colors"
            >
              💬 Escríbenos por WhatsApp
            </a>
            
            {/* Transferencia */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">🏦 Transferencia bancaria</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Banco:</span>
                  <span className="font-medium">{bankInfo.banco}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cuenta:</span>
                  <span className="font-medium">{bankInfo.cuenta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Titular:</span>
                  <span className="font-medium">{bankInfo.titular}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID:</span>
                  <span className="font-medium">{bankInfo.identificacion}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Después de realizar la transferencia, escríbenos por WhatsApp para activar tu suscripción.
              </p>
            </div>
          </div>
          
          {/* Tiempo de activación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏱️</span>
              <div>
                <p className="font-medium text-blue-800">Tiempo de activación</p>
                <p className="text-sm text-blue-600">
                  Una vez realizado el pago, te activamos en <strong>24 horas</strong>.
                </p>
              </div>
            </div>
          </div>
          
          {/* Botón logout */}
          <button
            onClick={handleLogout}
            className="w-full text-gray-500 hover:text-gray-700 text-sm py-2"
          >
            Cerrar sesión
          </button>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            ¿Ya pagaste? Escríbenos para activar tu cuenta
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionExpired;