// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { getOrCreateUser, checkSubscription, updateDaysRemaining } from '../utils/subscription';

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log("[AuthContext] Setting up Firebase auth listener...");
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log("[AuthContext] User authenticated:", firebaseUser.email);
                setUser(firebaseUser);
                
                // Get or create user data from Firestore
                try {
                    const data = await getOrCreateUser(firebaseUser.uid, firebaseUser.email);
                    console.log("[AuthContext] User data from Firestore:", data);
                    setUserData(data);
                    
                    // Actualizar días restantes en Firestore
                    await updateDaysRemaining(firebaseUser.uid);
                } catch (err) {
                    console.error("[AuthContext] Error getting user data:", err);
                }
            } else {
                console.log("[AuthContext] User not authenticated");
                setUser(null);
                setUserData(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = useCallback(async (email, password) => {
        console.log("[AuthContext] Logging in with Firebase...");
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            console.log("[AuthContext] Login successful:", result.user.email);
            return { success: true, user: result.user };
        } catch (error) {
            console.error("[AuthContext] Login error:", error);
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        console.log("[AuthContext] Logging out...");
        try {
            await signOut(auth);
            setUser(null);
            setUserData(null);
        } catch (error) {
            console.error("[AuthContext] Logout error:", error);
        }
    }, []);

    // Check if user has access based on subscription
    const hasAccess = userData ? checkSubscription(userData) : false;

    // Value provided by the context
    const value = {
        user,
        userData,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        hasAccess,
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
