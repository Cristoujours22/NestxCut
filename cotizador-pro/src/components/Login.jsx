// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as firebaseAuth } from '../firebase';
import { sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import '../index.css';
import logo from '../assets/Logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => {
    try { return localStorage.getItem('rememberLogin') === 'true'; } catch { return false; }
  });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = React.useCallback((type, message, duration = 4000) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), duration);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const from = location.state?.from?.pathname || '/';

  // Validaciones simples
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p) => p.length >= 4;

  // Reenviar email de verificación
  const handleResendVerification = async () => {
    if (!email || !password) {
      setError('Ingresa tu email y contraseña primero');
      return;
    }
    
    setResendingVerification(true);
    setError('');
    
    let tempUser = null;
    
    try {
      // Intentar sign in - el resultado puede tener el usuario aunque no esté verificado
      try {
        const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
        tempUser = result.user;
      } catch (loginErr) {
        console.log('[Login] Login error (esperado):', loginErr.code);
        
        // Cuando el email no está verificado, Firebase igual crea el usuario temporalmente
        tempUser = firebaseAuth.currentUser;
      }
      
      if (!tempUser) {
        throw new Error('No se pudo obtener el usuario. Intenta iniciar sesión primero.');
      }
      
      console.log('[Login] Enviando verificación a:', tempUser.email);
      await sendEmailVerification(tempUser);
      
      await auth.logout();
      
      setVerificationSent(true);
      setTimeout(() => setVerificationSent(false), 10000);
    } catch (err) {
      console.error('[Login] Error reenviando verificación:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Espera un momento e intenta de nuevo.');
      } else if (err.message.includes('No se pudo obtener')) {
        setError(err.message);
      } else {
        setError('Error al reenviar verificación: ' + err.message);
      }
    } finally {
      setResendingVerification(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !validateEmail(email)) {
      setError('Ingresá tu email primero para enviar el link de restablecimiento.');
      return;
    }

    try {
      await sendPasswordResetEmail(firebaseAuth, email);
      showToast('success', 'Link de restablecimiento enviado a ' + email);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        showToast('warning', 'Si el email existe, recibirás un link de restablecimiento.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos. Esperá un momento e intentá de nuevo.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else {
        setError('Error al enviar link: ' + err.message);
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    // Timeout de seguridad - 10 segundos max
    const timeoutId = setTimeout(() => {
      console.warn('[Login] Timeout, liberando inputs');
      setIsLoggingIn(false);
    }, 10000);

    // Client-side validation
    if (!email || !password) {
      clearTimeout(timeoutId);
      setError('Por favor, completa todos los campos.');
      setIsLoggingIn(false);
      return;
    }
    if (!validateEmail(email)) {
      clearTimeout(timeoutId);
      setError('Email inválido.');
      setIsLoggingIn(false);
      return;
    }
    if (!validatePassword(password)) {
      clearTimeout(timeoutId);
      setError('Contraseña: Mínimo 4 caracteres.');
      setIsLoggingIn(false);
      return;
    }

try {
      // Firebase Auth login
      const result = await auth.login(email, password);
      clearTimeout(timeoutId);

      // Email no verificado — mostrar opción de reenviar
      if (result?.reason === 'EMAIL_NO_VERIFICADO') {
        setError('Tu email no está verificado. Usá el botón "Reenviar verificación" de abajo.');
        setIsLoggingIn(false);
        return;
      }

      // License expired — ProtectedRoute will surface SubscriptionExpired
      if (result?.expired) {
        navigate(from, { replace: true });
        setIsLoggingIn(false);
        return;
      }
      
      // Handle 'Remember Me'
      try {
        localStorage.setItem('rememberLogin', remember.toString());
        if (remember) localStorage.setItem('savedEmail', email);
        else localStorage.removeItem('savedEmail');
      } catch (err) { console.error("Error updating localStorage:", err); }
      
      navigate(from, { replace: true });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[Login] Login failed:', err);
      
      if (err.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Contraseña incorrecta.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Usuario o contraseña incorrectos.');
      } else {
        setError(err.message || 'Error al intentar iniciar sesión.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoggingIn(false);
    }
  };

  // Cargar email guardado
  useEffect(() => {
    try {
      if (localStorage.getItem('rememberLogin') === 'true') {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) setEmail(savedEmail);
      } else {
        localStorage.removeItem('savedEmail');
      }
    } catch (err) { console.error("Error reading saved email:", err); }
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-white">
      <div className="flex-1 flex items-center justify-center">
      <div className="login-box p-5 rounded-lg shadow-xl bg-gray-800 w-full max-w-sm">
        <div className="login-brand" style={{ textAlign: 'center' }}>
          <img src={logo} alt="Cotizador Pro" style={{ width: '140px', height: 'auto', display: 'block', margin: '0 auto 16px' }} />
        </div>
        
        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div className="user-box relative mb-4">
            <input
              id="email" type="email" name="email" required
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              autoComplete="email"
            />
            <label htmlFor="email">
              Email
            </label>
          </div>

          {/* Password */}
          <div className="user-box relative mb-4">
            <input
              id="password" type={showPassword ? 'text' : 'password'} name="password" required
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              className="w-full px-3 py-2 pr-10 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              autoComplete="current-password"
            />
            <label htmlFor="password">
              Contraseña
            </label>
            <span
              role="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer select-none"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </span>
          </div>

          {/* Recordarme */}
          <div className="flex items-center mb-4">
            <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-300 cursor-pointer">Recordarme</label>
          </div>

          {/* Error */}
          {error && (
            <div className="error-message text-red-400 text-sm mb-4 text-center bg-red-900 bg-opacity-30 px-3 py-2 rounded">
              {error}
              {error.includes('no está verificado') && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => navigate('/resend-verification', { state: { email } })}
                    className="text-sm text-cyan-400 hover:text-cyan-300 underline"
                  >
                    Reenviar email de verificación
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            {isLoggingIn ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Links */}
        <div className="mt-4 text-center space-y-1">
          <p className="text-gray-400 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-cyan-400 hover:underline">
              Regístrate aquí
            </Link>
          </p>
          <p className="text-gray-400 text-sm">
            <span
              role="button"
              tabIndex={0}
              onClick={handleForgotPassword}
              onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
              className="text-cyan-400 hover:underline cursor-pointer"
            >
              ¿Olvidaste tu contraseña?
            </span>
          </p>
        </div>
      </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${
          toast.type === 'warning' ? 'bg-amber-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <span className="material-icons text-sm">{toast.type === 'success' ? 'check_circle' : toast.type === 'warning' ? 'warning' : 'error'}</span>
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <footer className="footer text-center text-gray-500 text-sm">
        <p>Todos los derechos reservados &copy; {new Date().getFullYear()} | Diseñado por Cristian</p>
      </footer>
    </div>
  );
}
