// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    // State to hold the authenticated user object { id, username } or null
    // Initialize user to null, forcing login on start
    const [user, setUser] = useState(null);
    // State to indicate if the initial auth check is loading (now much simpler)
    const [isLoading, setIsLoading] = useState(true); // Start as true, indicating loading state

    // useEffect is no longer needed to check localStorage for isLoggedIn on startup
    // We only need localStorage for 'remember username' functionality handled in Login.jsx
    useEffect(() => {
         console.log("[AuthContext] Initializing. User forced to null on startup.");
         // Optional: You could still clear flags here for consistency,
         // although logout should handle it.
         // try {
         //     localStorage.removeItem('isLoggedIn');
         // } catch (error) {
         //     console.error("[AuthContext] Error clearing isLoggedIn on init:", error);
         // }
         // No need to set isLoading to false here as it starts false
    }, []);


    // Login function: Updates state and sets the core isLoggedIn flag
    const login = useCallback((userData) => {
        console.log("[AuthContext] Logging in user:", userData);
        setUser(userData); // Set user state
        try {
            // Set flag to indicate user is now logged in *for the current session*
            localStorage.setItem('isLoggedIn', 'true');
            console.log("[AuthContext] Set isLoggedIn=true in localStorage.");
            // Saving 'savedUsername' based on 'remember' still happens in Login.jsx
        } catch (error) {
            console.error("[AuthContext] Error saving isLoggedIn to localStorage:", error);
        }
    }, []); // useCallback to memoize the function

    // Logout function: Clears state and all related localStorage items
    const logout = useCallback(() => {
        console.log("[AuthContext] Logging out user");
        setUser(null); // Clear user state
        try {
            // Clear all auth-related flags on logout
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('savedUsername');
            localStorage.removeItem('rememberLogin');
            console.log("[AuthContext] Cleared auth flags from localStorage on logout.");
        } catch (error) {
            console.error("[AuthContext] Error clearing auth status from localStorage:", error);
        }
    }, []); // useCallback to memoize the function

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
