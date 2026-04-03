// licensing/promoCodes.js - Promo code management utilities

const API = window.electronAPI;

// Apply a promo code to get discount info
export async function applyPromoCode(code, planId) {
    try {
        const result = await API.applyPromoCode(code, planId);
        return result;
    } catch (error) {
        console.error('Error applying promo code:', error);
        return { valid: false, error: error.message };
    }
}

// Calculate price with discount
export function calculateDiscountedPrice(price, promo) {
    if (!promo) return price;
    
    if (promo.type === 'percent') {
        return price - (price * (promo.value / 100));
    } else if (promo.type === 'fixed') {
        return Math.max(0, price - promo.value);
    }
    
    return price;
}

// Get discount display text
export function getDiscountDisplay(promo) {
    if (!promo) return null;
    
    if (promo.type === 'percent') {
        return `${promo.value}% de descuento`;
    } else if (promo.type === 'fixed') {
        return `$${promo.value} de descuento`;
    }
    
    return null;
}

// Validate promo code format (basic)
export function validatePromoCodeFormat(code) {
    if (!code || typeof code !== 'string') return false;
    
    // Allow alphanumeric, uppercase, hyphens
    const validPattern = /^[A-Z0-9\-]{3,20}$/i;
    return validPattern.test(code);
}