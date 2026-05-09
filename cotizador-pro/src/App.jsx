// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import ResendVerification from './components/ResendVerification';
import TermsConditions from './components/TermsConditions';
import PrivacyPolicy from './components/PrivacyPolicy';
import InventoryPage from './components/inventory/InventoryPage';
import Settings from './components/Settings';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import ProjectWorkspace from './components/project/ProjectWorkspace';
import SubscriptionExpired from './components/SubscriptionExpired';
import ManualQuotePage from './components/quotes/ManualQuotePage';
import ReportsPage from './components/reports/ReportsPage';
import './App.css';

// --- Protected Route Component ---
function ProtectedRoute() {
    const { isAuthenticated, isLoading, userData, hasAccess } = useAuth();
    const location = useLocation();

    useEffect(() => {
        console.log(`[ProtectedRoute] isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
        return <div>Verificando sesión...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (isAuthenticated && !userData) {
        return <div>Verificando suscripción...</div>;
    }

    // Verificar suscripción
    if (!hasAccess) {
        return <SubscriptionExpired />;
    }

    return <Outlet />;
}

// --- Public Route Component ---
function PublicRoute() {
    const { isAuthenticated, isLoading } = useAuth();

     // Log state changes
    useEffect(() => {
        console.log(`[PublicRoute] isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
    }, [isLoading, isAuthenticated]);


    if (isLoading) {
        console.log("[PublicRoute] Still loading auth state...");
        return <div>Verificando sesión...</div>;
    }

    if (isAuthenticated) {
        console.log("[PublicRoute] User is authenticated. Redirecting to /");
        // If authenticated, redirect away from public-only routes (like login)
        return <Navigate to="/" replace />;
    }

    // If not authenticated, render the nested public route (e.g., <Login />)
    console.log("[PublicRoute] User not authenticated. Rendering Outlet.");
    return <Outlet />;
}


// --- Main Application Component ---
function App() {
    const { isLoading, isAuthenticated } = useAuth(); // Access loading state

     // Log state changes
    useEffect(() => {
        console.log(`[App] isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
    }, [isLoading, isAuthenticated]);


    // Optional: Show a global loading indicator or splash screen
    // This might be redundant if Protected/Public routes handle their own loading state
    // if (isLoading) {
    //     console.log("[App] Initializing Application (isLoading)...");
    //     return <div>Inicializando Aplicación...</div>;
    // }

    console.log("[App] Rendering Routes...");
    return (
        <Routes>
{/* Public-Only Routes (e.g., Login) */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/resend-verification" element={<ResendVerification />} />
                <Route path="/terminos" element={<TermsConditions />} />
                <Route path="/privacidad" element={<PrivacyPolicy />} />
            </Route>

            {/* Protected Routes (Require Authentication) */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    {/* Main application route, redirects to Dashboard or acts as Dashboard */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/cotizacion" element={<ManualQuotePage />} />
                    <Route path="/reportes" element={<ReportsPage />} />
                    
                    {/* Project Workspace (Editor de Cotización) */}
                    <Route path="/proyecto/:id" element={<ProjectWorkspace />} />

                    <Route path="/inventario" element={<InventoryPage />} />
                    
                    <Route path="/settings" element={<Settings />} />
                </Route>
            </Route>

            {/* Fallback Route (Optional) */}
            {/* If using the above structure, this might not be strictly necessary */}
            {/* Or redirect unknown paths specifically */}
            {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
             <Route path="*" element={isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />} />


        </Routes>
    );
}

export default App;
