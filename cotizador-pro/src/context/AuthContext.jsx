// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
         const initAuth = async () => {
             console.log("[AuthContext] Initializing. Checking active session...");
             try {
                if(window.electronAPI?.getSession) {
                    const activeSession = await window.electronAPI.getSession();
                    if(activeSession) {
                        console.log("[AuthContext] Session found:", activeSession);
                        setUser(activeSession);
                    } else {
                        console.log("[AuthContext] No active session found on backend.");
                    }
                }
             } catch(err) {
                 console.error("[AuthContext] Error getting session:", err);
             } finally {
                 setIsLoading(false);
             }
         }
         initAuth();
    }, []);

    const login = useCallback((userData) => {
        console.log("[AuthContext] Logging in user:", userData);
        setUser(userData);
        try {
            localStorage.setItem('isLoggedIn', 'true');
            console.log("[AuthContext] Set isLoggedIn=true in localStorage.");
        } catch (error) {
            console.error("[AuthContext] Error saving isLoggedIn to localStorage:", error);
        }
    }, []);

    const logout = useCallback(async () => {
        console.log("[AuthContext] Logging out user");
        setUser(null);
        try {
            if(window.electronAPI?.logout) {
                await window.electronAPI.logout();
            }
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('savedUsername');
            localStorage.removeItem('rememberLogin');
            console.log("[AuthContext] Cleared auth flags and closed backend session.");
        } catch (error) {
            console.error("[AuthContext] Error on logout:", error);
        }
    }, []);

    // Value provided by the context
    const value = {
        user,
        login,
        logout,
        // isLoading is likely not needed anymore if we always start logged out
        // isLoading,
        isAuthenticated: !!user // Still useful: true only if user object is not null
    };

    // Render children directly (no loading state needed for this approach)
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
