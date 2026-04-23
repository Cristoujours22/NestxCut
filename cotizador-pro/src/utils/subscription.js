// src/utils/subscription.js
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Emails que son admin (sin expiración)
const ADMIN_EMAILS = ['capaalonso@gmail.com'];

/**
 * Verifica si el usuario es admin
 * @param {Object} userData - Datos del usuario de Firestore
 * @returns {boolean} - true si es admin
 */
export const isAdmin = (userData) => {
  return userData?.role === 'admin';
};

/**
 * Verifica si el email es admin
 * @param {string} email - Email del usuario
 * @returns {boolean} - true si es admin por email
 */
export const isAdminEmail = (email) => {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
};

/**
 * Verifica si el usuario tiene una suscripción activa
 * @param {Object} userData - Datos del usuario de Firestore
 * @returns {boolean} - true si tiene acceso, false si está bloqueado
 */
export const checkSubscription = (userData) => {
  if (!userData) return false;
  
  // Los admins siempre tienen acceso
  if (userData.role === 'admin') return true;
  
  const now = new Date();
  
  // Verificar trial
  if (userData.trialEnd) {
    const trialEnd = userData.trialEnd.toDate ? userData.trialEnd.toDate() : new Date(userData.trialEnd);
    if (trialEnd > now) return true;
  }
  
  // Verificar suscripción activa
  if (userData.subscriptionEnd) {
    const subscriptionEnd = userData.subscriptionEnd.toDate ? userData.subscriptionEnd.toDate() : new Date(userData.subscriptionEnd);
    if (subscriptionEnd > now) return true;
  }
  
  // No hay acceso
  return false;
};

/**
 * Obtiene o crea el documento de usuario en Firestore
 * @param {string} uid - UID del usuario de Firebase Auth
 * @param {string} email - Email del usuario
 * @returns {Object} - Datos del usuario
 */
export const getOrCreateUser = async (uid, email) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    // Verificar si debe ser admin por email (actualizar si es necesario)
    const userData = userSnap.data();
    
    // Actualizar email si no existe
    if (!userData.email && email) {
      await updateDoc(userRef, { email: email });
      userData.email = email;
    }
    
    if (isAdminEmail(email) && userData.role !== 'admin') {
      await updateDoc(userRef, { role: 'admin', plan: 'admin', subscriptionEnd: null, trialEnd: null });
      console.log('[Subscription] Usuario actualizado a admin por email');
      return { ...userData, role: 'admin', plan: 'admin' };
    }
    return userData;
  }
  
  // Crear nuevo usuario con trial de 30 días
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);
  
  // Asignar admin si el email está en la lista
  const isAdminAccount = isAdminEmail(email);
  
  const newUser = {
    email: email, // Guardar email en el documento
    plan: isAdminAccount ? 'admin' : 'trial',
    role: isAdminAccount ? 'admin' : 'user',
    trialEnd: isAdminAccount ? null : trialEnd,
    subscriptionEnd: null,
    status: 'active',
    createdAt: now,
    activatedAt: isAdminAccount ? now : null,
    activatedBy: isAdminAccount ? 'system' : null
  };
  
  await setDoc(userRef, newUser);
  console.log('[Subscription] Nuevo usuario creado:', isAdminAccount ? 'ADMIN' : 'trial 30 días');
  
  return newUser;
};

/**
 * Actualiza el rol de un usuario a admin
 * @param {string} uid - UID del usuario
 * @returns {Promise<void>}
 */
export const makeUserAdmin = async (uid) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: 'admin',
    plan: 'admin',
    subscriptionEnd: null,
    trialEnd: null,
    activatedAt: new Date(),
    activatedBy: 'manual'
  });
  console.log('[Subscription] Usuario feito admin:', uid);
};

/**
 * Quita el rol de admin de un usuario
 * @param {string} uid - UID del usuario
 * @param {number} trialDays - Días de trial a asignar
 * @returns {Promise<void>}
 */
export const removeUserAdmin = async (uid, trialDays = 30) => {
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + trialDays);
  
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    role: 'user',
    plan: 'trial',
    trialEnd: trialEnd,
    subscriptionEnd: null,
    status: 'active'
  });
  console.log('[Subscription] Admin removido, trial asignado:', uid);
};

/**
 * Obtiene el estado de la suscripción para mostrar en UI
 * @param {Object} userData - Datos del usuario
 * @returns {Object} - Estado de suscripción
 */
export const getSubscriptionStatus = (userData) => {
  if (!userData) {
    return { hasAccess: false, status: 'unknown', daysLeft: 0 };
  }
  
  // Admin siempre tiene acceso ilimitado
  if (userData.role === 'admin') {
    return { 
      hasAccess: true, 
      status: 'admin', 
      daysLeft: null, 
      type: 'admin', 
      endDate: null,
      isUnlimited: true
    };
  }
  
  const now = new Date();
  let daysLeft = 0;
  let activeDate = null;
  
  // Ver trial primero
  if (userData.trialEnd) {
    const trialEnd = userData.trialEnd.toDate ? userData.trialEnd.toDate() : new Date(userData.trialEnd);
    if (trialEnd > now) {
      activeDate = trialEnd;
      daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      return { hasAccess: true, status: 'trial', daysLeft, type: 'trial', endDate: trialEnd, isUnlimited: false };
    }
  }
  
  // Ver suscripción premium
  if (userData.subscriptionEnd) {
    const subscriptionEnd = userData.subscriptionEnd.toDate ? userData.subscriptionEnd.toDate() : new Date(userData.subscriptionEnd);
    if (subscriptionEnd > now) {
      activeDate = subscriptionEnd;
      daysLeft = Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));
      return { hasAccess: true, status: 'premium', daysLeft, type: 'subscription', endDate: subscriptionEnd, isUnlimited: false };
    }
  }
  
  // Vencido
  return { hasAccess: false, status: 'expired', daysLeft: 0, type: null, endDate: null, isUnlimited: false };
};

/**
 * Calcula los días restantes de suscripción
 * @param {Object} userData - Datos del usuario
 * @returns {number|null} - Días restantes o null si es admin
 */
export const getDaysRemaining = (userData) => {
  if (!userData) return 0;
  
  // Admin tiene ilimitado
  if (userData.role === 'admin') return null;
  
  const now = new Date();
  
  if (userData.trialEnd) {
    const trialEnd = userData.trialEnd.toDate ? userData.trialEnd.toDate() : new Date(userData.trialEnd);
    if (trialEnd > now) {
      return Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    }
  }
  
  if (userData.subscriptionEnd) {
    const subscriptionEnd = userData.subscriptionEnd.toDate ? userData.subscriptionEnd.toDate() : new Date(userData.subscriptionEnd);
    if (subscriptionEnd > now) {
      return Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24));
    }
  }
  
  return 0;
};

/**
 * Actualiza los días restantes en Firestore
 * @param {string} uid - UID del usuario
 * @returns {Promise<void>}
 */
export const updateDaysRemaining = async (uid) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const userData = userSnap.data();
  
  // Admin no necesita actualizar
  if (userData.role === 'admin') return;
  
  const daysRemaining = getDaysRemaining(userData);
  
  await updateDoc(userRef, {
    daysRemaining: daysRemaining
  });
};

/**
 * Formatea la fecha para mostrar
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};