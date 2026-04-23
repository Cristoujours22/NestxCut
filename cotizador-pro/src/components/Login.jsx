// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css';
import logo from '../assets/Logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
    try { return localStorage.getItem('rememberLogin') === 'true'; } catch { return false; }
  });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const from = location.state?.from?.pathname || '/';

  // Validaciones simples
  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validatePassword = (p) => p.length >= 4;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    // Client-side validation
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      setIsLoggingIn(false);
      return;
    }
    if (!validateEmail(email)) {
      setError('Email inválido.');
      setIsLoggingIn(false);
      return;
    }
    if (!validatePassword(password)) {
      setError('Contraseña: Mínimo 4 caracteres.');
      setIsLoggingIn(false);
      return;
    }

    try {
      // Firebase Auth login
      await auth.login(email, password);
      
      // Handle 'Remember Me'
      try {
        localStorage.setItem('rememberLogin', remember.toString());
        if (remember) localStorage.setItem('savedEmail', email);
        else localStorage.removeItem('savedEmail');
      } catch (err) { console.error("Error updating localStorage:", err); }
      
      navigate(from, { replace: true });
    } catch (err) {
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
    <div className="flex min-h-screen items-center justify-center flex-col bg-gray-900 text-white">
      <div className="login-box p-8 rounded-lg shadow-xl bg-gray-800 w-full max-w-sm">
        <div className="login-brand" style={{ textAlign: 'center' }}>
          <img src={logo} alt="Cotizador Pro" style={{ width: '140px', height: 'auto', display: 'block', margin: '0 auto 16px' }} />
        </div>
        
        <form onSubmit={handleLogin} noValidate>
          {/* Email */}
          <div className="user-box relative mb-6">
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
              id="password" type="password" name="password" required
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              autoComplete="current-password"
            />
            <label htmlFor="password">
              Contraseña
            </label>
          </div>

          {/* Recordarme */}
          <div className="flex items-center mb-6">
            <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <label htmlFor="remember" className="ml-2 text-sm text-gray-300 cursor-pointer">Recordarme</label>
          </div>

          {/* Error */}
          {error && (
            <div className="error-message text-red-400 text-sm mb-4 text-center bg-red-900 bg-opacity-30 px-3 py-2 rounded">
              {error}
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

        {/* Link a Registro */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-cyan-400 hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>

      <footer className="footer mt-8 text-center text-gray-500 text-sm">
        <p>Todos los derechos reservados &copy; {new Date().getFullYear()} | Diseñado por Cristian</p>
      </footer>
    </div>
  );
}