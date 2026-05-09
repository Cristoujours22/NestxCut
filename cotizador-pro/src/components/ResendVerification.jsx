// src/components/ResendVerification.jsx
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import logo from '../assets/Logo.png';

export default function ResendVerification() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Si viene de login, usar ese email
  const initialEmail = location.state?.email || '';
  
  const handleResend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage(null);
    
    try {
      // 1. Intentar login (fallará por email no verificado pero crea la sesión)
      let user = null;
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      } catch (loginErr) {
        console.log('[Resend] Login error esperado:', loginErr.code);
        // Intentar obtener el usuario de todas formas
        user = auth.currentUser;
      }
      
      // 2. Si tenemos usuario, reenviar
      if (user) {
        await sendEmailVerification(user);
        
        // 3. Cerrar sesión temporal
        await signOut(auth);
        
        setMessage('Email de verificación reenviado. Revisa tu bandeja de entrada.');
      } else {
        // 4. Si no tenemos usuario, el usuario debe hacer login primero
        // Y luego cerrar sesión manualmente para poder reenviar
        setError('Para reenviar verificación, primero inicia sesión con tus credenciales.');
      }
    } catch (err) {
      console.error('[Resend] Error:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera unos minutos.');
      } else {
        setError('Error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center flex-col bg-gray-900 text-white">
      <div className="login-box p-8 rounded-lg shadow-xl bg-gray-800 w-full max-w-sm">
        <div className="login-brand" style={{ textAlign: 'center' }}>
          <img src={logo} alt="Cotizador Pro" style={{ width: '140px', height: 'auto', display: 'block', margin: '0 auto 16px' }} />
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2 text-center">Reenviar verificación</h2>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Ingresa tu email y contraseña para reenviar el email de verificación
        </p>
        
        {message && (
          <div className="text-green-400 text-sm mb-4 text-center bg-green-900 bg-opacity-30 px-3 py-2 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="text-red-400 text-sm mb-4 text-center bg-red-900 bg-opacity-30 px-3 py-2 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleResend}>
          <div className="mb-4">
            <input
              type="email"
              value={email || initialEmail}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>
          
          <div className="mb-6">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Reenviar email de verificación'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link to="/login" className="text-cyan-400 hover:underline text-sm">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}