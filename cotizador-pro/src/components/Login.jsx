// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../index.css'; // Asegúrate que aquí estén los estilos para la animación del botón
import logo from '../assets/Logo.png';

export default function Login() {
  // ... (estados: username, password, remember, error, isLoggingIn) ...
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => {
      try { return localStorage.getItem('rememberLogin') === 'true'; } catch { return false; }
  });
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ... (hooks: navigate, location, auth) ...
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const from = location.state?.from?.pathname || '/';

  // ... (validaciones: validateUsername, validatePassword) ...
  const validateUsername = (name) => /^[a-zA-Z0-9_]{3,}$/.test(name);
  const validatePassword = (pass) => pass.length >= 4;

  // ... (handleLogin: lógica async para validar, llamar IPC, manejar respuesta/error, navegar) ...
   const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);

    // Client-side validation
    if (!username || !password) {
      setError('Por favor, completa todos los campos.');
      setIsLoggingIn(false);
      return;
    }
    if (!validateUsername(username)) {
      setError('Usuario: Mínimo 3 caracteres (letras, números, _).');
      setIsLoggingIn(false);
      return;
    }
    if (!validatePassword(password)) {
      setError('Contraseña: Mínimo 4 caracteres.');
      setIsLoggingIn(false);
      return;
    }

    // Call Electron main process via IPC
    try {
      if (!window.electronAPI || typeof window.electronAPI.invoke !== 'function') {
          throw new Error('Electron API no está disponible.');
      }
      const result = await window.electronAPI.invoke('login', username, password);

      if (result && result.success) {
        auth.login({ id: result.userId, username: result.username });
        // Handle 'Remember Me'
        try {
            localStorage.setItem('rememberLogin', remember.toString());
            if (remember) localStorage.setItem('savedUsername', username);
            else localStorage.removeItem('savedUsername');
        } catch (error) { console.error("Error updating localStorage:", error); }
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error('[Login] Login failed:', err);
      setError(err.message || 'Error al intentar iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ... (useEffect para cargar username guardado) ...
  useEffect(() => {
    try {
        if (localStorage.getItem('rememberLogin') === 'true') {
            const savedUser = localStorage.getItem('savedUsername');
            if (savedUser) setUsername(savedUser);
        } else {
             localStorage.removeItem('savedUsername');
        }
    } catch (error) { console.error("Error reading saved username:", error); }
  }, []);

  // --- JSX Rendering ---
  return (
    // Contenedor principal con fondo oscuro
    <div className="flex min-h-screen items-center justify-center flex-col bg-gray-900 text-white">
      {/* Caja de login - Asegúrate que la clase 'login-box' exista para que el CSS aplique */}
      <div className="login-box p-8 rounded-lg shadow-xl bg-gray-800 w-full max-w-sm">
      <div className="login-brand" style={{ textAlign: 'center' }}>
        <img src={logo} alt="Cotizador Pro" style={{ width: '140px', height: 'auto', display: 'block', marginTop: '0', marginBottom: '16px', marginLeft: 'auto', marginRight: 'auto' }} />
      </div>
      
        {/* Formulario */}
        <form onSubmit={handleLogin} noValidate>
          {/* Input Username - Usa la clase 'user-box' si tu CSS la requiere */}
          <div className="user-box relative mb-6">
            <input
              id="username" type="text" name="username" required
              value={username}
              onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
              // Clases Tailwind para input básico + focus (pueden coexistir con CSS si no hay conflicto directo)
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              autoComplete="username"
            />
            {/* Label flotante (usa CSS o Tailwind para efecto) */}
            <label htmlFor="username" /* Clases Tailwind/CSS para label */ >
              Usuario
            </label>
          </div>

          {/* Input Password - Usa la clase 'user-box' */}
          <div className="user-box relative mb-4">
            <input
              id="password" type="password" name="password" required
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              autoComplete="current-password"
            />
            <label htmlFor="password" /* Clases Tailwind/CSS para label */ >
              Contraseña
            </label>
          </div>

          {/* Checkbox Recordarme */}
          <div className="flex items-center mb-6">
             {/* Estiliza el checkbox y label con CSS o Tailwind como prefieras */}
             <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /* Clases CSS/Tailwind */ />
             <label htmlFor="remember" className="ml-2 text-sm text-gray-300 cursor-pointer">Recordarme</label>
          </div>

          {/* Mensaje de Error */}
          {error && ( <div className="error-message text-red-400 text-sm mb-4 text-center bg-red-900 bg-opacity-30 px-3 py-2 rounded">{error}</div> )}

          {/* Botón de Submit - Quitamos clases Tailwind conflictivas */}
          <button
            type="submit"
            disabled={isLoggingIn}
            // Dejamos clases Tailwind para ancho, estado disabled y focus.
            // La apariencia principal (padding, color, background, etc.) y la animación
            // DEBEN venir ahora del archivo index.css a través del selector '.login-box form button'
            className="w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            // IMPORTANTE: Asegúrate que este botón sea seleccionado por '.login-box form button' en tu CSS
          >
            {/* Spans requeridos por la animación CSS */}
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            {/* Texto condicional */}
            {isLoggingIn ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
      {/* Footer */}
      <footer className="footer mt-8 text-center text-gray-500 text-sm">
        <p>Todos los derechos reservados &copy; {new Date().getFullYear()} | Diseñado por Cristian</p>
      </footer>
    </div>
  );
}
