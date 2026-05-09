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

export const toDateOrNull = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getUserAccessState = (userData) => {
  if (!userData) {
    return {
      hasAccess: false,
      reason: 'missing-user-data',
      plan: null,
      daysRemaining: 0,
      expiresAt: null,
      isUnlimited: false,
    };
  }

  if (userData.role === 'admin') {
    return {
      hasAccess: true,
      reason: 'admin',
      plan: userData.plan || 'admin',
      daysRemaining: null,
      expiresAt: null,
      isUnlimited: true,
    };
  }

  const now = new Date();
  const subscriptionEnd = toDateOrNull(userData.subscriptionEnd);
  if (subscriptionEnd && subscriptionEnd > now) {
    return {
      hasAccess: true,
      reason: 'subscription',
      plan: userData.plan || 'subscription',
      daysRemaining: Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24)),
      expiresAt: subscriptionEnd,
      isUnlimited: false,
    };
  }

  const trialEnd = toDateOrNull(userData.trialEnd);
  if (trialEnd && trialEnd > now) {
    return {
      hasAccess: true,
      reason: 'trial',
      plan: userData.plan || 'trial',
      daysRemaining: Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)),
      expiresAt: trialEnd,
      isUnlimited: false,
    };
  }

  return {
    hasAccess: false,
    reason: 'expired',
    plan: userData.plan || null,
    daysRemaining: 0,
    expiresAt: subscriptionEnd || trialEnd || null,
    isUnlimited: false,
  };
};

export const getDeviceLicenseState = (licenseData) => {
  if (!licenseData) {
    return {
      hasDeviceAccess: false,
      status: 'missing',
      daysRemaining: 0,
      hoursRemaining: 0,
      expiresAt: null,
      plan: null,
    };
  }

   const now = new Date();
   const expiresAt = toDateOrNull(licenseData.expiresAt);
   if (expiresAt) {
     const diffMs = expiresAt.getTime() - now.getTime();
     const totalHours = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60)) : 0;
     const daysRemaining = diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
     const effectiveState = diffMs > 0 ? 'active' : 'expired';

     return {
       hasDeviceAccess: effectiveState === 'active',
       status: effectiveState,
       daysRemaining,
       hoursRemaining: totalHours,
       expiresAt,
       plan: licenseData.plan || null,
     };
   }

  const isActive = licenseData.estado === 'activo' && Number(licenseData.diasRestantes || 0) > 0;
  return {
    hasDeviceAccess: isActive,
    status: isActive ? 'active' : (licenseData.estado || 'expired'),
    daysRemaining: Number(licenseData.diasRestantes || 0),
    hoursRemaining: Number(licenseData.diasRestantes || 0) * 24,
    expiresAt: null,
    plan: licenseData.plan || null,
  };
};

export const normalizeDeviceLicense = (licenseData) => {
  if (!licenseData || typeof licenseData !== 'object') {
    return {
      isValid: false,
      reason: 'missing',
      license: null,
    };
  }

  const normalized = {
    userId: String(licenseData.userId || '').trim(),
    userEmail: String(licenseData.userEmail || '').trim().toLowerCase(),
    plan: String(licenseData.plan || '').trim(),
    diasAsignados: Number(licenseData.diasAsignados || 0),
    diasRestantes: Number(licenseData.diasRestantes || 0),
    estado: String(licenseData.estado || '').trim().toLowerCase(),
    activatedAt: licenseData.activatedAt || null,
    activatedBy: licenseData.activatedBy || null,
    expiresAt: licenseData.expiresAt || null,
    durationHoursAssigned: Number(licenseData.durationHoursAssigned || 0),
  };

  const hasMinimumShape = (
    normalized.userId &&
    normalized.userEmail &&
    normalized.plan &&
    Number.isFinite(normalized.diasAsignados) &&
    Number.isFinite(normalized.diasRestantes) &&
    normalized.estado
  );

  if (!hasMinimumShape) {
    return {
      isValid: false,
      reason: 'invalid-shape',
      license: normalized,
    };
  }

  return {
    isValid: true,
    reason: 'ok',
    license: normalized,
  };
};

export const getAccessDecision = ({ userData, licenseData }) => {
  if (!userData) {
    return {
      hasAccess: false,
      reason: 'missing-user-data',
      device: getDeviceLicenseState(null),
      user: getUserAccessState(null),
    };
  }

  const userAccess = getUserAccessState(userData);
  if (userAccess.reason === 'admin') {
    return {
      hasAccess: true,
      reason: 'admin',
      device: getDeviceLicenseState(licenseData),
      user: userAccess,
    };
  }

  const deviceAccess = getDeviceLicenseState(licenseData);
  if (deviceAccess.hasDeviceAccess) {
    return {
      hasAccess: true,
      reason: 'device-license-active',
      device: deviceAccess,
      user: userAccess,
    };
  }

  return {
    hasAccess: false,
    reason: deviceAccess.status === 'missing' ? 'device-license-missing' : 'device-license-inactive',
    device: deviceAccess,
    user: userAccess,
  };
};

export const getUserProfile = (userData) => ({
  nombre: userData?.nombre || '',
  apellido: userData?.apellido || '',
  cedula: userData?.cedula || userData?.documento || '',
  celular: userData?.celular || '',
  direccion: userData?.direccion || '',
  empresa: userData?.empresa || '',
  ocupacion: userData?.ocupacion || '',
  email: userData?.email || '',
});

export const getUserAppSettings = (userData) => ({
  company_name: userData?.company_name || userData?.empresa || userData?.nombre || '',
  logo_data: userData?.logo_data || '',
  logo_path: userData?.logo_path || '',
  currency: userData?.currency || 'USD',
  tax_rate: Number(userData?.tax_rate) || 0,
  contact_email: userData?.contact_email || userData?.email || '',
  contact_phone: userData?.contact_phone || userData?.celular || '',
  address: userData?.address || userData?.direccion || '',
  nit: userData?.nit || userData?.cedula || '',
});

/**
 * Verifica si el usuario tiene una suscripción activa
 * @param {Object} userData - Datos del usuario de Firestore
 * @returns {boolean} - true si tiene acceso, false si está bloqueado
 */
export const checkSubscription = (userData) => {
  return getUserAccessState(userData).hasAccess;
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
  const access = getUserAccessState(userData);
  return {
    hasAccess: access.hasAccess,
    status: access.reason === 'subscription' ? 'premium' : access.reason,
    daysLeft: access.daysRemaining,
    type: access.reason === 'subscription' ? 'subscription' : access.reason === 'trial' ? 'trial' : access.reason,
    endDate: access.expiresAt,
    isUnlimited: access.isUnlimited,
  };
};

/**
 * Calcula los días restantes de suscripción
 * @param {Object} userData - Datos del usuario
 * @returns {number|null} - Días restantes o null si es admin
 */
export const getDaysRemaining = (userData) => {
  return getUserAccessState(userData).daysRemaining;
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
