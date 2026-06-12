// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { getAccessDecision, getOrCreateUser, getUserAccessState, normalizeDeviceLicense } from '../utils/subscription';
import { getDeviceIds } from '../utils/deviceId';

const DEV = import.meta.env.DEV;
const log = (...args) => DEV && console.log(...args);

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [licenseData, setLicenseData] = useState(null);
    const [resolvedStableHid, setResolvedStableHid] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [, setAccessHeartbeat] = useState(Date.now());

    const loadDeviceLicense = useCallback(async () => {
        const { stableHid, legacyHid } = await getDeviceIds();
        setResolvedStableHid(stableHid);
        log('[AuthContext] Stable HID:', stableHid, 'Legacy HID:', legacyHid);

        const stableRef = doc(db, 'licenses', stableHid);
        const stableSnap = await getDoc(stableRef);
        if (stableSnap.exists()) {
            const rawLicense = stableSnap.data();
            const normalized = normalizeDeviceLicense(rawLicense);
            log('[AuthContext] Stable license found:', rawLicense);
            if (!normalized.isValid) {
                console.warn('[AuthContext] Invalid stable device license shape:', normalized.reason, rawLicense);
                return { ...rawLicense, estado: 'bloqueado', diasRestantes: 0, invalidReason: normalized.reason };
            }
            return normalized.license;
        }

        if (legacyHid && legacyHid !== stableHid) {
            const legacyRef = doc(db, 'licenses', legacyHid);
            const legacySnap = await getDoc(legacyRef);
            if (legacySnap.exists()) {
                const legacyData = legacySnap.data();
                const normalizedLegacy = normalizeDeviceLicense(legacyData);
                log('[AuthContext] Legacy license found, migrating to stable HID:', legacyHid, '->', stableHid);
                await setDoc(stableRef, {
                    ...legacyData,
                    hid: stableHid,
                    legacyHid,
                    migratedFrom: legacyHid,
                    updatedAt: new Date(),
                }, { merge: true });
                if (normalizedLegacy.isValid) {
                    return { ...normalizedLegacy.license, hid: stableHid, legacyHid };
                }
                return { ...legacyData, hid: stableHid, legacyHid, estado: 'bloqueado', diasRestantes: 0, invalidReason: normalizedLegacy.reason };
            }
        }

        return null;
    }, []);

    useEffect(() => {
        if (!user?.uid || !resolvedStableHid) return undefined;

        const licenseRef = doc(db, 'licenses', resolvedStableHid);
        const unsubscribe = onSnapshot(licenseRef, (snap) => {
            if (!snap.exists()) {
                setLicenseData(null);
                return;
            }

            const rawLicense = snap.data();
            const normalized = normalizeDeviceLicense(rawLicense);
            if (!normalized.isValid) {
                setLicenseData({
                    ...rawLicense,
                    estado: 'bloqueado',
                    diasRestantes: 0,
                    invalidReason: normalized.reason,
                });
                return;
            }

            setLicenseData(normalized.license);
        }, (err) => {
            console.error('[AuthContext] Error listening device license:', err);
        });

        return () => unsubscribe();
    }, [user?.uid, resolvedStableHid]);

    useEffect(() => {
        if (!user?.uid) return undefined;

        const intervalId = window.setInterval(() => {
            setAccessHeartbeat(Date.now());
        }, 30000);

        return () => window.clearInterval(intervalId);
    }, [user?.uid]);

    const syncDevicePresence = useCallback(async (firebaseUser) => {
        if (!firebaseUser?.uid) return;
        try {
            const { stableHid, legacyHid } = await getDeviceIds();
            const deviceRef = doc(db, 'devices', stableHid);

            await setDoc(deviceRef, {
                hid: stableHid,
                legacyHid: legacyHid !== stableHid ? legacyHid : null,
                currentUserUid: firebaseUser.uid,
                currentUserEmail: firebaseUser.email || '',
                lastUserUid: firebaseUser.uid,
                lastUserEmail: firebaseUser.email || '',
                emailVerified: firebaseUser.emailVerified === true,
                platform: typeof navigator !== 'undefined' ? (navigator.platform || 'unknown') : 'unknown',
                userAgent: typeof navigator !== 'undefined' ? (navigator.userAgent || 'unknown') : 'unknown',
                screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
                timezoneOffset: new Date().getTimezoneOffset(),
                lastSeenAt: new Date(),
                updatedAt: new Date(),
            }, { merge: true });
        } catch (err) {
            console.error('[AuthContext] Error syncing device presence:', err);
        }
    }, []);

    const ensureTrialDeviceLicense = useCallback(async (firebaseUser, userData, existingLicense) => {
        if (!firebaseUser?.uid || existingLicense) return existingLicense;

        const userAccess = getUserAccessState(userData)
        if (!userAccess.hasAccess || userAccess.reason !== 'trial') {
            return existingLicense
        }

        try {
            const { stableHid, legacyHid } = await getDeviceIds()
            const licenseRef = doc(db, 'licenses', stableHid)
            const currentLicenseSnap = await getDoc(licenseRef)
            if (currentLicenseSnap.exists()) {
                const normalizedExisting = normalizeDeviceLicense(currentLicenseSnap.data())
                if (normalizedExisting.isValid) {
                    return normalizedExisting.license
                }
            }
            const now = new Date()
            const dias = Number(userAccess.daysRemaining || 0)
            if (dias <= 0) return existingLicense
            const expiresAt = new Date(now)
            expiresAt.setDate(expiresAt.getDate() + dias)

            const trialLicense = {
                hid: stableHid,
                legacyHid: legacyHid !== stableHid ? legacyHid : null,
                userId: firebaseUser.uid,
                userEmail: firebaseUser.email || '',
                plan: 'trial',
                expiresAt,
                durationHoursAssigned: dias * 24,
                diasAsignados: dias,
                diasRestantes: dias,
                estado: 'activo',
                trialUsed: true,
                currentOwnerUid: firebaseUser.uid,
                lastUserUid: firebaseUser.uid,
                activatedAt: now,
                activatedBy: 'system-trial',
                createdAt: now,
                updatedAt: now,
            }

            await setDoc(licenseRef, trialLicense)
            log('[AuthContext] Trial device license created automatically:', stableHid)
            return trialLicense
        } catch (err) {
            try {
                const { stableHid } = await getDeviceIds()
                const licenseRef = doc(db, 'licenses', stableHid)
                const racedLicenseSnap = await getDoc(licenseRef)
                if (racedLicenseSnap.exists()) {
                    const normalizedRace = normalizeDeviceLicense(racedLicenseSnap.data())
                    if (normalizedRace.isValid) {
                        console.warn('[AuthContext] Trial device license already created by concurrent flow:', stableHid)
                        return normalizedRace.license
                    }
                }
            } catch (readErr) {
                console.error('[AuthContext] Error re-reading automatic trial device license:', readErr)
            }
            console.error('[AuthContext] Error creating automatic trial device license:', err)
            throw err
        }
    }, []);

    const loadUserDocument = useCallback(async (firebaseUser) => {
        const data = await getOrCreateUser(firebaseUser.uid, firebaseUser.email);
        log('[AuthContext] User data from Firestore:', data);
        return data;
    }, []);

    const syncVerifiedEmailStatus = useCallback(async (firebaseUser) => {
        if (!firebaseUser?.uid || !firebaseUser.emailVerified) return;
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return;

            const currentData = userSnap.data();
            const patch = {};

            if (currentData.emailVerified !== true) {
                patch.emailVerified = true;
            }

            if (currentData.status === 'pending_verification') {
                patch.status = 'active';
            }

            if (!currentData.verifiedAt) {
                patch.verifiedAt = new Date();
            }

            if (Object.keys(patch).length > 0) {
                await updateDoc(userRef, patch);
                log('[AuthContext] Firestore sync after email verification:', patch);
            }
        } catch (err) {
            console.error('[AuthContext] Error syncing verified email status:', err);
        }
    }, []);

    const resolveAccessForUser = useCallback(async (firebaseUser) => {
        await syncVerifiedEmailStatus(firebaseUser);
        await syncDevicePresence(firebaseUser);
        const data = await loadUserDocument(firebaseUser);
        const loadedLicense = await loadDeviceLicense();
        const license = await ensureTrialDeviceLicense(firebaseUser, data, loadedLicense);
        const accessDecision = getAccessDecision({ userData: data, licenseData: license });
        return { data, license, accessDecision };
    }, [ensureTrialDeviceLicense, loadDeviceLicense, loadUserDocument, syncDevicePresence, syncVerifiedEmailStatus]);

    useEffect(() => {
        log("[AuthContext] Setting up Firebase auth listener...");
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    await firebaseUser.reload()
                    const freshUser = auth.currentUser || firebaseUser

                    if (!freshUser.emailVerified) {
                        log('[AuthContext] Usuario autenticado pero sin email verificado. Se omite validación HID por ahora.');
                        setUser(freshUser)
                        setUserData({ email: freshUser.email, status: 'pending_verification' })
                        setLicenseData(null)
                        setIsLoading(false)
                        return
                    }

                    try {
                        const { data, license, accessDecision } = await resolveAccessForUser(freshUser);
                        setUserData(data);
                        setLicenseData(license);

                        if (accessDecision.hasAccess) {
                            log('[AuthContext] Acceso permitido:', accessDecision.reason);
                            setUser(freshUser);
                        } else {
                            log('[AuthContext] Acceso denegado en auth listener:', accessDecision.reason);
                            // Mantener sesión para que ProtectedRoute muestre SubscriptionExpired
                            setUser(freshUser);
                            setUserData(data);
                            setLicenseData(license);
                        }
                    } catch (err) {
                        console.error('[AuthContext] Error resolving access:', err);
                        setUserData({ email: freshUser.email });
                        setUser(freshUser);
                    }
                } else {
                    log("[AuthContext] User not authenticated");
                    setUser(null);
                    setUserData(null);
                    setLicenseData(null);
                    setResolvedStableHid(null);
                }
            } catch (err) {
                console.error("[AuthContext] Error en verificación:", err);
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email, password) => {
        log("[AuthContext] Logging in with Firebase...");
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await result.user.reload()
            const freshUser = auth.currentUser || result.user
            log("[AuthContext] Login successful:", freshUser.email);
            
            if (!freshUser.emailVerified) {
                log('[AuthContext] Email no verificado en login');
                await signOut(auth)
                throw new Error('EMAIL_NO_VERIFICADO')
            }

            const { data, license, accessDecision } = await resolveAccessForUser(freshUser);
            setUserData(data);
            setLicenseData(license);
            setUser(freshUser);

            if (!accessDecision.hasAccess) {
                log('[AuthContext] Acceso denegado en login:', accessDecision.reason);
                // Keep user authenticated — ProtectedRoute will show SubscriptionExpired
                setUser(freshUser);
                setUserData(data);
                setLicenseData(license);
                // Return expired signal instead of signing out
                return { success: true, expired: true, reason: accessDecision.reason };
            }
            
            log("[AuthContext] Email verificado y licencia válida, acceso concedido");
            return { success: true, user: freshUser };
        } catch (error) {
            console.error("[AuthContext] Login error:", error);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        log("[AuthContext] Logging out...");
        try {
          await signOut(auth);
        } catch (error) {
          console.error("[AuthContext] Logout error:", error);
        } finally {
          setUser(null);
          setUserData(null);
          setLicenseData(null);
          // Recargar página para evitar estados pegados
          window.location.reload();
        }
      }, []);

    const accessDecision = getAccessDecision({ userData, licenseData });

    // Value provided by the context
    const value = {
        user,
        userData,
        licenseData,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        hasAccess: accessDecision.hasAccess,
        accessDecision,
        isAdmin: userData?.role === 'admin'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to easily consume the context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
