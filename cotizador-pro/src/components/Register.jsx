// src/components/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import logo from '../assets/Logo.png';

export default function Register() {
  const navigate = useNavigate();
  
  // Form fields
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    celular: '',
    cedula: '',
    direccion: '',
    ocupacion: '',
    empresa: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isRegistering, setIsRegistering] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Validation functions
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    // Mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
  };

  const validateCelular = (celular) => {
    // Acepta formatos: +57300..., 57300..., 300..., con o sin espacios
    const re = /^(\+?57)?[3][0-9]{9}$/;
    const cleaned = celular.replace(/\s/g, '');
    return re.test(cleaned);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre es requerido';
    if (!formData.apellido.trim()) newErrors.apellido = 'Apellido es requerido';
    if (!formData.celular.trim()) newErrors.celular = 'Celular es requerido';
    else if (!validateCelular(formData.celular)) newErrors.celular = 'Celular inválido (formato: 3001234567)';
    if (!formData.cedula.trim()) newErrors.cedula = 'Cédula/NIT es requerido';
    if (!formData.direccion.trim()) newErrors.direccion = 'Dirección es requerida';
    if (!formData.ocupacion.trim()) newErrors.ocupacion = 'Ocupación es requerida';
    
    if (!formData.email.trim()) newErrors.email = 'Email es requerido';
    else if (!validateEmail(formData.email)) newErrors.email = 'Email inválido';
    
    if (!formData.password) newErrors.password = 'Contraseña es requerida';
    else if (!validatePassword(formData.password)) {
      newErrors.password = 'Mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Debes aceptar los términos y condiciones';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!validateForm()) return;
    
    setIsRegistering(true);
    
    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      
      const user = userCredential.user;
      const uid = user.uid;
      
      // 2. Send email verification
      await sendEmailVerification(user);
      console.log('[Register] Email de verificación enviado a:', user.email);
      
      // 3. Save additional data in Firestore
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 30);
      
      await setDoc(doc(db, 'users', uid), {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        celular: formData.celular.trim(),
        cedula: formData.cedula.trim(),
        direccion: formData.direccion.trim(),
        ocupacion: formData.ocupacion.trim(),
        empresa: formData.empresa.trim() || null,
        email: formData.email.toLowerCase().trim(),
        plan: 'trial',
        role: 'user',
        trialEnd: trialEnd,
        subscriptionEnd: null,
        status: 'pending_verification', // Requiere verificación de email
        emailVerified: false,
        createdAt: now,
        activatedAt: null,
        activatedBy: null,
        termsAcceptedAt: now,
        termsVersion: '1.0'
      });
      
      console.log('[Register] Usuario creado exitosamente:', uid);

      // 4. Pre-fill company settings from registration data
      try {
        if (window.electronAPI?.getCompanySettings && window.electronAPI?.saveCompanySettings) {
          const existing = await window.electronAPI.getCompanySettings() || {};
          await window.electronAPI.saveCompanySettings({
            ...existing,
            company_name: formData.empresa?.trim() || `${formData.nombre} ${formData.apellido}`.trim(),
            contact_phone: formData.celular?.trim() || '',
            address: formData.direccion?.trim() || '',
            nit: formData.cedula?.trim() || '',
            contact_email: formData.email?.toLowerCase().trim() || '',
            updatedAt: now.toISOString(),
          });
        }
      } catch (e) {
        console.warn('[Register] Could not save company settings:', e);
      }
      
      // 5. Sign out until verifies email
      await auth.signOut();
      
      // 6. Redirect to login with message
      navigate('/login', { state: { message: 'Registro exitoso. Se envió un email de verificación a tu correo. Por favor, verifica tu email antes de iniciar sesión.' } });
      
    } catch (error) {
      console.error('[Register] Error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        setGeneralError('El email ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        setGeneralError('Email inválido');
      } else if (error.code === 'auth/weak-password') {
        setGeneralError('La contraseña es muy débil');
      } else {
        setGeneralError('Error al registrar. Intenta de nuevo.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white px-3 sm:px-4 py-3 sm:py-4 flex flex-col justify-between">
      <div className="flex-1 flex items-center justify-center min-h-0">
      <div className="w-full max-w-5xl rounded-2xl shadow-xl bg-gray-800 border border-gray-700 overflow-hidden">
        <div className="grid lg:grid-cols-[320px_1fr]">
          <div className="bg-gradient-to-br from-cyan-900/40 to-slate-900 p-5 sm:p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-gray-700 flex flex-col justify-center">
            <div className="login-brand" style={{ textAlign: 'center' }}>
              <img 
                src={logo} 
                alt="Cotizador Pro" 
                style={{ width: '140px', height: 'auto', display: 'block', margin: '0 auto 16px' }} 
              />
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Crear Cuenta</h2>
              <p className="text-gray-300 text-sm leading-5">
                Registrate para comenzar a usar NestxCut. Completá tus datos personales, de contacto y acceso en un solo paso.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-6 lg:p-8">
        <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Datos personales</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Información básica del titular de la cuenta.</p>
            </div>

          {/* Nombre y Apellido */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                value={formData.nombre}
                onChange={handleChange}
                placeholder="Nombre"
                className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              />
              {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <input
                id="apellido"
                name="apellido"
                type="text"
                required
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Apellido"
                className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
              />
              {errors.apellido && <p className="text-red-400 text-xs mt-1">{errors.apellido}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
          {/* Celular */}
          <div>
            <input
              id="celular"
              name="celular"
              type="tel"
              required
              value={formData.celular}
              onChange={handleChange}
              placeholder="Celular (3001234567)"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.celular && <p className="text-red-400 text-xs mt-1">{errors.celular}</p>}
          </div>

          {/* Cédula/NIT */}
          <div>
            <input
              id="cedula"
              name="cedula"
              type="text"
              required
              value={formData.cedula}
              onChange={handleChange}
              placeholder="Cédula/NIT"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.cedula && <p className="text-red-400 text-xs mt-1">{errors.cedula}</p>}
          </div>
          </div>

          {/* Dirección */}
          <div>
            <input
              id="direccion"
              name="direccion"
              type="text"
              required
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Dirección"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.direccion && <p className="text-red-400 text-xs mt-1">{errors.direccion}</p>}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
          {/* Ocupación */}
          <div>
            <input
              id="ocupacion"
              name="ocupacion"
              type="text"
              required
              value={formData.ocupacion}
              onChange={handleChange}
              placeholder="Ocupación"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.ocupacion && <p className="text-red-400 text-xs mt-1">{errors.ocupacion}</p>}
          </div>

          {/* Empresa (Opcional) */}
          <div>
            <input
              id="empresa"
              name="empresa"
              type="text"
              value={formData.empresa}
              onChange={handleChange}
              placeholder="Empresa (opcional)"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
          </div>
          </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Acceso</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Datos de autenticación para ingresar a la aplicación.</p>
            </div>

          <div className="grid md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="md:col-span-2">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              autoComplete="email"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Contraseña */}
          <div>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="Contraseña"
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            <p className="text-gray-500 text-xs mt-1">Mín 8 chars, mayúscula, número y special</p>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirmar contraseña"
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-transparent border-b-2 border-gray-500 text-white focus:outline-none focus:border-cyan-400 peer"
            />
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>
          </div>
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-300">Legal</h3>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Aceptación de términos para crear la cuenta.</p>
            </div>

          {/* Términos */}
          <div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1"
              />
              <span className="text-gray-300 text-sm">
                Acepto los <Link to="/terminos" target="_blank" className="text-cyan-400 hover:underline">Términos y Condiciones</Link> y la <Link to="/privacidad" target="_blank" className="text-cyan-400 hover:underline">Política de Privacidad</Link>
              </span>
            </label>
            {errors.acceptTerms && <p className="text-red-400 text-xs mt-1">{errors.acceptTerms}</p>}
          </div>
          </section>

          {/* Error general */}
          {generalError && (
            <div className="error-message text-red-400 text-sm mb-4 text-center bg-red-900 bg-opacity-30 px-3 py-2 rounded">
              {generalError}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={isRegistering}
            className="w-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isRegistering ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        {/* Link a Login */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-cyan-400 hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
          </div>
        </div>
      </div>
      </div>

      <footer className="footer mt-3 sm:mt-4 text-center text-gray-500 text-xs sm:text-sm shrink-0">
        <p>Todos los derechos reservados &copy; {new Date().getFullYear()} | Diseñado por Cristian</p>
      </footer>
    </div>
  );
}
