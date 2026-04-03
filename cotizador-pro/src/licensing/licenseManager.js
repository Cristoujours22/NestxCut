// licensing/licenseManager.js - License management utilities

const API = window.electronAPI;

// Get all available plans
export async function getPlans() {
    try {
        const plans = await API.getPlans();
        return { success: true, plans };
    } catch (error) {
        console.error('Error fetching plans:', error);
        return { success: false, error: error.message };
    }
}

// Get license status for current user
export async function getLicenseStatus(userId) {
    try {
        // First try the standard channel
        const license = await API.getLicenseStatus(userId);
        return { success: true, license };
    } catch (err) {
        // Fallback to new IPC contract channel
        try {
            const license = await API.invoke('licensing:getStatus', { companyId: userId });
            return { success: true, license };
        } catch (e) {
            console.error('Error fetching license via IPC fallback:', e);
            return { success: false, error: e.message };
        }
    }
}

// Activate a license with a key
export async function activateLicense(userId, licenseKey) {
    try {
        const result = await API.activateLicense(userId, licenseKey);
        return result;
    } catch (error) {
        console.error('Error activating license:', error);
        return { success: false, error: error.message };
    }
}

// Generate a new license key (for admin)
export async function generateLicenseKey() {
    try {
        const result = await API.generateLicenseKey();
        return result;
    } catch (error) {
        console.error('Error generating key:', error);
        return { success: false, error: error.message };
    }
}

// Check if license is valid
export function isLicenseValid(license) {
    if (!license || license.no_license) return false;
    
    const now = new Date();
    
    // Check if trial is active
    if (license.trial_ends_at) {
        const trialEnd = new Date(license.trial_ends_at);
        if (trialEnd > now) {
            return true;
        }
    }
    
    // Check if subscription is active
    if (license.ends_at) {
        const endDate = new Date(license.ends_at);
        if (endDate > now && license.status === 'active') {
            return true;
        }
    }
    
    return false;
}

// Get days remaining in subscription/trial
export function getDaysRemaining(license) {
    if (!license) return 0;
    
    if (license.trial_ends_at) {
        const trialEnd = new Date(license.trial_ends_at);
        const now = new Date();
        return Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
    }
    
    if (license.ends_at) {
        const endDate = new Date(license.ends_at);
        const now = new Date();
        return Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    }
    
    return 0;
}

// Get license display info
export function getLicenseDisplayInfo(license) {
    if (!license || license.no_license) {
        return {
            status: 'Sin licencia',
            plan: 'Ninguno',
            daysRemaining: 0,
            isTrial: false
        };
    }
    
    const isTrialActive = license.is_trial_active && license.days_remaining > 0;
    
    return {
        status: license.status,
        plan: license.plan_name || 'Plan Desconocido',
        price: license.price || 0,
        features: license.features ? license.features.split(',') : [],
        daysRemaining: license.days_remaining || 0,
        isTrial: isTrialActive,
        endsAt: license.ends_at,
        trialEndsAt: license.trial_ends_at
    };
}
